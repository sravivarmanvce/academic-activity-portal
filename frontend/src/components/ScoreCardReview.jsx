import React, { useState, useEffect } from 'react';
import API from '../Api';
import './ScoreCardReview.css';

const ScoreCardReview = () => {
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewComments, setReviewComments] = useState('');
  const [reviewAction, setReviewAction] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState('submitted');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadSubmissions();
  }, [filterStatus]);

  useEffect(() => {
    if (selectedSubmission) {
      loadSubmissionDetails(selectedSubmission.id);
    }
  }, [selectedSubmission]);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const response = await API.get('/api/scorecard/admin/submissions');

      const data = response.data;
      
      // Filter submissions based on status
      const filteredSubmissions = data.filter(sub => {
        if (filterStatus === 'all') return true;
        return sub.submission_status === filterStatus;
      });

      setSubmissions(filteredSubmissions);
    } catch (error) {
      console.error('Error loading submissions:', error);
      setError('Failed to load submissions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissionDetails = async (submissionId) => {
    try {
      // Load questions
      const questionsResponse = await API.get('/api/scorecard/admin/questions');

      const questionsData = questionsResponse.data;
      setQuestions(questionsData.sort((a, b) => a.question_number - b.question_number));

      // Load responses
      const responsesResponse = await API.get(`/api/scorecard/responses/${submissionId}`);

      const responsesData = responsesResponse.data;
      const responsesMap = {};
      responsesData.forEach(response => {
        responsesMap[response.question_id] = response;
      });
      setResponses(responsesMap);

    } catch (error) {
      console.error('Error loading submission details:', error);
      setError('Failed to load submission details. Please try again.');
    }
  };

  const handleReviewSubmit = async () => {
    if (!reviewAction || !selectedSubmission) return;

    try {
      setSubmitting(true);
      const response = await API.post(`/api/scorecard/admin/submissions/${selectedSubmission.id}/review`, {
        action: reviewAction,
        comments: reviewComments
      });

      // Reload submissions
      await loadSubmissions();
      
      // Clear selected submission
      setSelectedSubmission(null);
      setReviewComments('');
      setReviewAction('');

      alert(`Submission ${reviewAction} successfully!`);

    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateSubmissionScore = () => {
    if (!questions.length || !Object.keys(responses).length) return { total: 0, achieved: 0 };
    
    const totalScore = questions.reduce((sum, q) => sum + q.max_score, 0);
    const achievedScore = Object.values(responses).reduce((sum, r) => sum + (r.calculated_score || 0), 0);
    
    return { total: totalScore, achieved: achievedScore };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return '#f39c12';
      case 'submitted': return '#3498db';
      case 'approved': return '#27ae60';
      case 'rejected': return '#e74c3c';
      default: return '#7f8c8d';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredSubmissions = submissions.filter(sub =>
    sub.department_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.academic_year?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && !selectedSubmission) {
    return (
      <div className="scorecard-review">
        <div className="loading">
          <div className="spinner"></div>
          Loading submissions...
        </div>
      </div>
    );
  }

  return (
    <div className="scorecard-review">
      <div className="review-header">
        <h1>📋 Department Score Card Review</h1>
        <p>Review and approve/reject department scorecard submissions</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="review-layout">
        {/* Submissions List */}
        <div className="submissions-panel">
          <div className="panel-header">
            <h2>📂 Submissions</h2>
            
            {/* Filters */}
            <div className="filters">
              <div className="filter-group">
                <label>Status:</label>
                <select 
                  value={filterStatus} 
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="filter-select"
                >
                  <option value="submitted">Pending Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="all">All</option>
                </select>
              </div>

              <div className="filter-group">
                <input
                  type="text"
                  placeholder="Search department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>
          </div>

          <div className="submissions-list">
            {filteredSubmissions.length === 0 ? (
              <div className="no-submissions">
                <p>📭 No submissions found for the selected criteria.</p>
              </div>
            ) : (
              filteredSubmissions.map(submission => (
                <div
                  key={submission.id}
                  className={`submission-item ${selectedSubmission?.id === submission.id ? 'active' : ''}`}
                  onClick={() => setSelectedSubmission(submission)}
                >
                  <div className="submission-header">
                    <div className="submission-dept">{submission.department_name}</div>
                    <div 
                      className="submission-status"
                      style={{ background: getStatusColor(submission.submission_status) }}
                    >
                      {submission.submission_status}
                    </div>
                  </div>
                  
                  <div className="submission-meta">
                    <div className="meta-row">
                      <span className="meta-label">Academic Year:</span>
                      <span className="meta-value">{submission.academic_year}</span>
                    </div>
                    <div className="meta-row">
                      <span className="meta-label">Submitted:</span>
                      <span className="meta-value">
                        {submission.submitted_at ? new Date(submission.submitted_at).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    {submission.total_score > 0 && (
                      <div className="meta-row">
                        <span className="meta-label">Score:</span>
                        <span className="meta-value">
                          {submission.achieved_score || 0}/{submission.total_score}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Review Panel */}
        <div className="review-panel">
          {selectedSubmission ? (
            <>
              <div className="review-content">
                {/* Submission Overview */}
                <div className="submission-overview">
                  <h2>📊 {selectedSubmission.department_name} - Score Card Review</h2>
                  
                  <div className="overview-stats">
                    <div className="stat-card">
                      <div className="stat-icon">🎯</div>
                      <div className="stat-info">
                        <div className="stat-label">Total Score</div>
                        <div className="stat-value">
                          {calculateSubmissionScore().achieved}/{calculateSubmissionScore().total}
                        </div>
                        <div className="stat-percentage">
                          {calculateSubmissionScore().total > 0 
                            ? `${((calculateSubmissionScore().achieved / calculateSubmissionScore().total) * 100).toFixed(1)}%`
                            : '0%'
                          }
                        </div>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon">📝</div>
                      <div className="stat-info">
                        <div className="stat-label">Questions Answered</div>
                        <div className="stat-value">
                          {Object.keys(responses).length}/{questions.length}
                        </div>
                        <div className="stat-percentage">
                          {questions.length > 0 
                            ? `${((Object.keys(responses).length / questions.length) * 100).toFixed(1)}%`
                            : '0%'
                          }
                        </div>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon">📅</div>
                      <div className="stat-info">
                        <div className="stat-label">Academic Year</div>
                        <div className="stat-value">{selectedSubmission.academic_year}</div>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon">⏰</div>
                      <div className="stat-info">
                        <div className="stat-label">Submitted On</div>
                        <div className="stat-value">
                          {selectedSubmission.submitted_at 
                            ? new Date(selectedSubmission.submitted_at).toLocaleDateString()
                            : 'Not submitted'
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Responses Review */}
                <div className="responses-review">
                  <h3>📋 Response Details</h3>
                  
                  {questions.map(question => {
                    const response = responses[question.id];
                    return (
                      <div key={question.id} className="review-question">
                        <div className="question-header">
                          <div className="question-number">Q{question.question_number}</div>
                          <div className="question-text">{question.question_text}</div>
                          <div className="question-score">
                            {response?.calculated_score || 0}/{question.max_score} pts
                          </div>
                        </div>

                        {response ? (
                          <div className="response-content">
                            {/* Numeric Response */}
                            {question.question_type === 'numeric' && response.numeric_response !== null && (
                              <div className="response-item">
                                <span className="response-label">Numeric Value:</span>
                                <span className="response-value">{response.numeric_response}</span>
                              </div>
                            )}

                            {/* Text Response */}
                            {response.text_response && (
                              <div className="response-item">
                                <span className="response-label">Description:</span>
                                <div className="response-text">{response.text_response}</div>
                              </div>
                            )}

                            {/* OneDrive Links */}
                            {(response.onedrive_link_1 || response.onedrive_link_2 || response.onedrive_link_3) && (
                              <div className="response-item">
                                <span className="response-label">OneDrive Links:</span>
                                <div className="onedrive-links">
                                  {response.onedrive_link_1 && (
                                    <a href={response.onedrive_link_1} target="_blank" rel="noopener noreferrer" className="onedrive-link">
                                      🔗 Link 1
                                    </a>
                                  )}
                                  {response.onedrive_link_2 && (
                                    <a href={response.onedrive_link_2} target="_blank" rel="noopener noreferrer" className="onedrive-link">
                                      🔗 Link 2
                                    </a>
                                  )}
                                  {response.onedrive_link_3 && (
                                    <a href={response.onedrive_link_3} target="_blank" rel="noopener noreferrer" className="onedrive-link">
                                      🔗 Link 3
                                    </a>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Physical Documents */}
                            {response.has_physical_documents && (
                              <div className="response-item">
                                <span className="response-label">Physical Documents:</span>
                                <div className="physical-docs-info">
                                  <span className="docs-indicator">📁 Available</span>
                                  {response.physical_document_description && (
                                    <div className="docs-description">{response.physical_document_description}</div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Uploaded Files */}
                            {response.uploaded_files && response.uploaded_files.length > 0 && (
                              <div className="response-item">
                                <span className="response-label">Uploaded Files:</span>
                                <div className="uploaded-files">
                                  {response.uploaded_files.map((file, index) => (
                                    <div key={index} className="file-item">
                                      <span className="file-icon">📎</span>
                                      <span className="file-name">{file.original_filename}</span>
                                      <span className="file-size">{formatFileSize(file.file_size)}</span>
                                      <a 
                                        href={`/api/files/download/${file.stored_filename}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="file-download"
                                      >
                                        📥 Download
                                      </a>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="no-response">
                            ❌ No response provided
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Review Actions */}
                {selectedSubmission.submission_status === 'submitted' && (
                  <div className="review-actions">
                    <h3>🔍 Review Decision</h3>
                    
                    <div className="action-selection">
                      <label className="action-option">
                        <input
                          type="radio"
                          name="reviewAction"
                          value="approved"
                          checked={reviewAction === 'approved'}
                          onChange={(e) => setReviewAction(e.target.value)}
                        />
                        <span className="action-label approve">✅ Approve Submission</span>
                      </label>

                      <label className="action-option">
                        <input
                          type="radio"
                          name="reviewAction"
                          value="rejected"
                          checked={reviewAction === 'rejected'}
                          onChange={(e) => setReviewAction(e.target.value)}
                        />
                        <span className="action-label reject">❌ Reject Submission</span>
                      </label>
                    </div>

                    <div className="comments-section">
                      <label className="form-label">Review Comments:</label>
                      <textarea
                        className="review-textarea"
                        value={reviewComments}
                        onChange={(e) => setReviewComments(e.target.value)}
                        placeholder="Provide detailed feedback about the submission..."
                        rows={4}
                      />
                    </div>

                    <div className="action-buttons">
                      <button
                        className="btn btn-success"
                        onClick={handleReviewSubmit}
                        disabled={!reviewAction || submitting}
                      >
                        {submitting ? (
                          <>
                            <div className="spinner-small"></div>
                            Processing...
                          </>
                        ) : (
                          <>📤 Submit Review</>
                        )}
                      </button>

                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setReviewAction('');
                          setReviewComments('');
                        }}
                      >
                        🔄 Reset
                      </button>
                    </div>
                  </div>
                )}

                {/* Previously Reviewed */}
                {selectedSubmission.submission_status !== 'submitted' && (
                  <div className="review-history">
                    <h3>📝 Review History</h3>
                    <div className="review-info">
                      <div className="review-status">
                        <span className="status-label">Status:</span>
                        <span 
                          className="status-badge"
                          style={{ background: getStatusColor(selectedSubmission.submission_status) }}
                        >
                          {selectedSubmission.submission_status.toUpperCase()}
                        </span>
                      </div>
                      
                      {selectedSubmission.reviewed_date && (
                        <div className="review-date">
                          <span className="date-label">Reviewed On:</span>
                          <span className="date-value">
                            {new Date(selectedSubmission.reviewed_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      
                      {selectedSubmission.dean_comments && (
                        <div className="review-comments">
                          <span className="comments-label">Review Comments:</span>
                          <div className="comments-text">{selectedSubmission.dean_comments}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="no-selection">
              <div className="no-selection-content">
                <div className="no-selection-icon">📋</div>
                <h3>Select a Submission to Review</h3>
                <p>Choose a submission from the list on the left to view details and provide review feedback.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScoreCardReview;
