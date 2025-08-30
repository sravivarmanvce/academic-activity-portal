import React, { useState, useEffect } from 'react';
import API from '../Api';
import './ScoreCardForm.css';

const ScoreCardForm = ({ user }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [submission, setSubmission] = useState(null);
  const [responses, setResponses] = useState({});
  const [physicalDocSubmission, setPhysicalDocSubmission] = useState({
    location: '',
    receivedDate: '',
    receivedBy: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const sortQuestionNumbers = (a, b) => {
    // Extract section and question numbers from strings like "1.1", "2.3"
    const parseQuestionNumber = (qNum) => {
      const parts = String(qNum).split('.');
      return {
        section: parseInt(parts[0]) || 0,
        question: parseInt(parts[1]) || 0
      };
    };
    
    const aNum = parseQuestionNumber(a.question_number);
    const bNum = parseQuestionNumber(b.question_number);
    
    if (aNum.section !== bNum.section) {
      return aNum.section - bNum.section;
    }
    return aNum.question - bNum.question;
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await API.get('/api/scorecard/templates');
      setTemplates(response.data.filter(t => t.is_active));
    } catch (err) {
      setError('Error fetching templates: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplateDetails = async (templateId) => {
    try {
      setLoading(true);
      const response = await API.get(`/api/scorecard/templates/${templateId}`);
      setSelectedTemplate(response.data.template);
      setQuestions(response.data.questions.sort(sortQuestionNumbers));
      
      // Check if submission already exists
      await checkExistingSubmission(templateId);
    } catch (err) {
      setError('Error fetching template details: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkExistingSubmission = async (templateId) => {
    try {
      const response = await API.get(`/api/scorecard/submissions?template_id=${templateId}`);
      const existingSubmission = response.data.find(s => s.submission.template_id === templateId);
      
      if (existingSubmission) {
        setSubmission(existingSubmission.submission);
        await fetchSubmissionDetails(existingSubmission.submission.id);
      }
    } catch (err) {
      console.error('Error checking existing submission:', err);
    }
  };

  const fetchSubmissionDetails = async (submissionId) => {
    try {
      const response = await API.get(`/api/scorecard/submissions/${submissionId}`);
      
      // Convert responses array to object for easier access
      const responseMap = {};
      response.data.responses.forEach(resp => {
        responseMap[resp.response.question_id] = {
          ...resp.response,
          documents: resp.documents || []
        };
      });
      setResponses(responseMap);
    } catch (err) {
      console.error('Error fetching submission details:', err);
    }
  };

  const createSubmission = async (templateId) => {
    try {
      const formData = new FormData();
      formData.append('template_id', templateId);
      formData.append('hod_comments', '');

      const response = await API.post('/api/scorecard/submissions', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const newSubmission = response.data;
      setSubmission(newSubmission);
      
      if (newSubmission.id) {
        await fetchSubmissionDetails(newSubmission.id);
      }
      
      return newSubmission;
    } catch (err) {
      console.error('Error creating submission:', err);
      setError('Error creating submission: ' + (err.response?.data?.detail || err.message));
      return null;
    }
  };

  const handleTemplateSelect = async (template) => {
    await fetchTemplateDetails(template.id);
  };

  const saveResponse = async (questionId, responseData) => {
    if (!submission) {
      const newSubmission = await createSubmission(selectedTemplate.id);
      if (!newSubmission) return;
    }

    try {
      const formData = new FormData();
      formData.append('submission_id', submission.id);
      formData.append('question_id', questionId);
      formData.append('count_response', responseData.count_response || 0);
      
      // Handle single OneDrive link
      if (responseData.onedrive_link && responseData.onedrive_link.trim()) {
        formData.append('onedrive_links', JSON.stringify([responseData.onedrive_link.trim()]));
      }
      
      // Handle physical documents
      formData.append('has_physical_documents', responseData.has_physical_documents || false);

      const saveResponse = await API.post('/api/scorecard/responses', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const savedData = saveResponse.data;
      setResponses(prev => ({
        ...prev,
        [questionId]: {
          ...savedData.response,
          documents: savedData.documents || []
        }
      }));
      
      setSuccessMessage('Response saved successfully');
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (err) {
      console.error('Error saving response:', err);
      setError('Error saving response: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleFileUpload = async (questionId, file) => {
    const response = responses[questionId];
    if (!response || !response.id) {
      setError('Please save the response first before uploading files');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('submission_id', submission.id);
      formData.append('question_id', questionId);
      formData.append('response_id', response.id);
      formData.append('file', file);

      const uploadResponse = await API.post('/api/scorecard/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Refresh submission details to get updated documents
      await fetchSubmissionDetails(submission.id);
      
      setSuccessMessage('File uploaded successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Error uploading file: ' + err.message);
    }
  };

  const handleFileDelete = async (documentId) => {
    const confirmed = window.confirm('Are you sure you want to delete this file?');
    if (!confirmed) return;

    try {
      await API.delete(`/api/scorecard/documents/${documentId}`);
      
      // Refresh submission details to get updated documents
      await fetchSubmissionDetails(submission.id);
      
      setSuccessMessage('File deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Error deleting file: ' + err.message);
    }
  };

  const handleSubmitScorecard = async () => {
    if (!submission) {
      setError('No submission found');
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to submit this scorecard for review? You won\'t be able to edit it after submission.'
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      const response = await API.put(`/api/scorecard/submissions/${submission.id}/submit`);

      setSuccessMessage('Scorecard submitted successfully for review!');
      await fetchSubmissionDetails(submission.id); // Refresh data
    } catch (err) {
      setError('Error submitting scorecard: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = () => {
    if (!questions.length) return 0;
    const answeredQuestions = questions.filter(q => 
      responses[q.id] && responses[q.id].response_text && parseInt(responses[q.id].response_text) > 0
    );
    return (answeredQuestions.length / questions.length) * 100;
  };

  const calculateTotalScore = () => {
    return Object.values(responses).reduce((total, response) => {
      return total + (response.score || 0);
    }, 0);
  };

  const formatQuestionNumber = (questionNumber) => {
    // Simply return the stored question number (e.g., "1.1", "1.2", "2.1")
    return questionNumber;
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="scorecard-container">
      {error && (
        <div className="error-message">
          <span>❌</span>
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      {successMessage && (
        <div className="success-message">
          <span>✅</span>
          {successMessage}
        </div>
      )}

      {!selectedTemplate ? (
        // Template Selection
        <div className="template-selection">
          <h2>📊 Department Score Card</h2>
          <p>Select a scorecard template to begin assessment:</p>
          
          <div className="templates-grid">
            {templates.map(template => (
              <div 
                key={template.id} 
                className="template-card"
                onClick={() => handleTemplateSelect(template)}
              >
                <h3>{template.name}</h3>
                <p>{template.description}</p>
                <div className="template-meta">
                  <span>📅 Academic Year: {template.academic_year?.year}</span>
                </div>
                <button className="btn btn-primary">
                  Select Template →
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Scorecard Form
        <div className="scorecard-form">
          {/* Progress Header */}
          <div className="progress-header">
            <div className="template-info">
              <h2>{selectedTemplate.name}</h2>
              <p>{selectedTemplate.description}</p>
              <button 
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setSelectedTemplate(null);
                  setQuestions([]);
                  setSubmission(null);
                  setResponses({});
                }}
              >
                ← Change Template
              </button>
            </div>

            <div className="header-bottom">
              <div className="progress-stats">
                <div className="progress-circle">
                  <div className="circle">
                    <div className="progress-text">
                      <span className="percentage">{Math.round(calculateProgress())}%</span>
                      <span className="label">Complete</span>
                    </div>
                  </div>
                </div>
                
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-number">{Object.keys(responses).length}</span>
                    <span className="stat-label">Answered</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{questions.length}</span>
                    <span className="stat-label">Total</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{calculateTotalScore().toFixed(1)}</span>
                    <span className="stat-label">Score</span>
                  </div>
                </div>
              </div>

              {submission && (
                <div className="submission-status">
                  <div className={`status-badge status-${submission.submission_status}`}>
                    {submission.submission_status === 'draft' && '📝 Draft'}
                    {submission.submission_status === 'submitted' && '⏳ Submitted'}
                    {submission.submission_status === 'approved' && '✅ Approved'}
                    {submission.submission_status === 'rejected' && '❌ Rejected'}
                  </div>
                  
                  {submission.submission_status === 'draft' && (
                    <button 
                      className="btn btn-success"
                      onClick={handleSubmitScorecard}
                      disabled={Object.keys(responses).length === 0}
                    >
                      📤 Submit for Review
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Questions List */}
          <div className="questions-container">
            {questions.map(question => (
              <QuestionCard
                key={question.id}
                question={question}
                response={responses[question.id] || { documents: [] }}
                onSave={(responseData) => saveResponse(question.id, responseData)}
                onFileUpload={(file) => handleFileUpload(question.id, file)}
                onFileDelete={handleFileDelete}
                readOnly={submission && submission.submission_status !== 'draft'}
              />
            ))}
          </div>

          {/* Physical Document Summary Section */}
          {questions.some(q => responses[q.id]?.has_physical_documents) && (
            <div className="physical-doc-summary">
              <h3>📄 Physical Document Submission Summary</h3>
              <div className="physical-summary-content">
                <div className="questions-with-physical">
                  <h4>Questions with Physical Documents:</h4>
                  <ul>
                    {questions
                      .filter(q => responses[q.id]?.has_physical_documents)
                      .map(q => (
                        <li key={q.id}>
                          Question {formatQuestionNumber(q.question_number)}: {q.question_text}
                        </li>
                      ))}
                  </ul>
                </div>
                
                <div className="physical-submission-details">
                  <div className="form-row">
                    <div className="input-group">
                      <label>Submission Location:</label>
                      <input
                        type="text"
                        value={physicalDocSubmission.location}
                        onChange={(e) => setPhysicalDocSubmission(prev => ({
                          ...prev,
                          location: e.target.value
                        }))}
                        placeholder="e.g., Principal Office, IQAC Office"
                        disabled={submission && submission.submission_status !== 'draft'}
                      />
                    </div>
                    <div className="input-group">
                      <label>Submission Date:</label>
                      <input
                        type="date"
                        value={physicalDocSubmission.receivedDate}
                        onChange={(e) => setPhysicalDocSubmission(prev => ({
                          ...prev,
                          receivedDate: e.target.value
                        }))}
                        disabled={submission && submission.submission_status !== 'draft'}
                      />
                    </div>
                  </div>
                  
                  <div className="input-group">
                    <label>Received By:</label>
                    <input
                      type="text"
                      value={physicalDocSubmission.receivedBy}
                      onChange={(e) => setPhysicalDocSubmission(prev => ({
                        ...prev,
                        receivedBy: e.target.value
                      }))}
                      placeholder="Name of person receiving the documents"
                      disabled={submission && submission.submission_status !== 'draft'}
                    />
                  </div>
                  
                  <div className="input-group">
                    <label>Overall Description:</label>
                    <textarea
                      rows="3"
                      value={physicalDocSubmission.description}
                      onChange={(e) => setPhysicalDocSubmission(prev => ({
                        ...prev,
                        description: e.target.value
                      }))}
                      placeholder="Brief description of all physical documents being submitted..."
                      disabled={submission && submission.submission_status !== 'draft'}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Individual Question Card Component
const QuestionCard = ({ question, response, onSave, onFileUpload, onFileDelete, readOnly }) => {
  // Helper function for formatting question numbers
  const formatQuestionNumber = (questionNumber) => {
    // Simply return the stored question number (e.g., "1.1", "1.2", "2.1")
    return questionNumber;
  };

  // Get existing OneDrive link (only one per question)
  const existingOneDriveLink = response.documents?.find(d => d.document_type === 'onedrive')?.onedrive_link || '';
  
  const [localResponse, setLocalResponse] = useState({
    count_response: parseInt(response.response_text) || 0,
    onedrive_link: existingOneDriveLink,
    has_physical_documents: response.documents?.some(d => d.document_type === 'physical') || false
  });

  const [fileUploading, setFileUploading] = useState(false);

  const handleInputChange = (field, value) => {
    setLocalResponse(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-save after 1 second of no typing
    clearTimeout(handleInputChange.timeout);
    handleInputChange.timeout = setTimeout(() => {
      onSave({
        ...localResponse,
        [field]: value
      });
    }, 1000);
  };

  const handleOneDriveLinkChange = (value) => {
    // Only save if it's empty or a valid URL
    if (value === '' || isValidURL(value)) {
      handleInputChange('onedrive_link', value);
    } else {
      // Just update local state without auto-saving invalid URLs
      setLocalResponse(prev => ({
        ...prev,
        onedrive_link: value
      }));
    }
  };

  const isValidURL = (string) => {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  };

  const calculateCurrentScore = () => {
    if (!localResponse.count_response) return 0;
    // Simple calculation: count * (max_score / 100) capped at max_score
    const score = Math.min(localResponse.count_response * (question.max_score / 100), question.max_score);
    return score; // Return raw number, format in display
  };

  const formatScore = (score) => {
    // If it's a whole number, show without decimals
    if (score % 1 === 0) {
      return score.toString();
    }
    // Otherwise, show with 2 decimal places
    return score.toFixed(2);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileUploading(true);
      try {
        await onFileUpload(file);
      } finally {
        setFileUploading(false);
      }
    }
  };

  const handleFileDownload = async (fileDoc) => {
    try {
      const response = await API.get(`/api/scorecard/documents/${fileDoc.id}/download`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = fileDoc.file_name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading file:', err);
      alert('Error downloading file: ' + err.message);
    }
  };

  const getQuestionTypeIcon = (type) => {
    switch (type) {
      case 'objective': return '🎯';
      case 'subjective': return '📝';
      default: return '❓';
    }
  };

  const uploadedFiles = response.documents?.filter(d => d.document_type === 'upload') || [];
  const oneDriveLinks = response.documents?.filter(d => d.document_type === 'onedrive') || [];

  return (
    <div className="question-card">
      {/* Inline Question Layout: Question No + Question + Count + Score + Actions */}
      <div className="question-inline-content">
        <div className="question-number-badge">{formatQuestionNumber(question.question_number)}</div>
        
        <div className="question-text-main">
          {question.question_text}
          <span className="mandatory-indicator">*</span>
          {question.requires_document && (
            <div className="document-info-inline">
              📎 {question.document_description}
              {question.document_formats && (
                <span className="formats-inline">
                  ({JSON.parse(question.document_formats || '[]').join(', ')})
                </span>
              )}
            </div>
          )}
        </div>
        
        <div className="count-input-inline">
          <input
            type="number"
            min="0"
            value={localResponse.count_response || ''}
            onChange={(e) => handleInputChange('count_response', parseInt(e.target.value) || 0)}
            placeholder="Count"
            disabled={readOnly}
          />
        </div>
        
        <div className="score-display">
          {formatScore(calculateCurrentScore())}/{question.max_score} pts
        </div>
      </div>

      {/* Second Row: OneDrive Link */}
      <div className="onedrive-inline-row">
        <label className="onedrive-label">OneDrive Link:</label>
        <div className="onedrive-input-wrapper">
          <input
            type="url"
            value={localResponse.onedrive_link}
            onChange={(e) => handleOneDriveLinkChange(e.target.value)}
            placeholder="https://... (Optional)"
            disabled={readOnly}
            className={`onedrive-input ${
              localResponse.onedrive_link && !isValidURL(localResponse.onedrive_link) ? 'invalid-url' : ''
            }`}
          />
          {localResponse.onedrive_link && !isValidURL(localResponse.onedrive_link) && (
            <span className="url-validation-error">⚠️ Please enter a valid URL starting with http:// or https://</span>
          )}
        </div>
        {oneDriveLinks.length > 0 && (
          <div className="existing-links-inline">
            {oneDriveLinks.map((doc, index) => (
              <a key={index} href={doc.onedrive_link} target="_blank" rel="noopener noreferrer" className="saved-link-inline">
                🔗 Link
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Third Row: File Upload */}
      <div className="file-upload-inline-row">
        <label className="file-label">File Upload:</label>
        {!readOnly && (
          <div className="file-input-wrapper-inline">
            <input
              type="file"
              id={`file-${question.id}`}
              onChange={handleFileChange}
              accept={question.document_formats ? JSON.parse(question.document_formats).map(f => `.${f}`).join(',') : ''}
              disabled={fileUploading}
              style={{ display: 'none' }}
            />
            <label htmlFor={`file-${question.id}`} className="file-input-label-inline">
              {fileUploading ? '📤 Uploading...' : '📎 Choose File'}
            </label>
          </div>
        )}
        {uploadedFiles.length > 0 && (
          <div className="uploaded-files-inline">
            <button 
              className="uploaded-file-tag" 
              onClick={() => handleFileDownload(uploadedFiles[uploadedFiles.length - 1])}
              title="Click to download"
            >
              📎 {uploadedFiles[uploadedFiles.length - 1].file_name}
            </button>
            {!readOnly && (
              <button
                className="delete-btn-inline"
                onClick={() => onFileDelete(uploadedFiles[uploadedFiles.length - 1].id)}
                title="Delete file"
              >
                🗑️
              </button>
            )}
          </div>
        )}
      </div>

      {/* Fourth Row: Physical Documents + Save Button */}
      <div className="bottom-row-inline">
        <div className="physical-checkbox-inline">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={localResponse.has_physical_documents}
              onChange={(e) => handleInputChange('has_physical_documents', e.target.checked)}
              disabled={readOnly}
            />
            📄 Physical documents submitted
          </label>
        </div>

        {!readOnly && (
          <button onClick={() => onSave(localResponse)} className="save-btn-inline">
            💾 Save
          </button>
        )}
      </div>
    </div>
  );
};

export default ScoreCardForm;
