import React, { useState } from 'react';
import API from '../Api';

// Question Management Component
const QuestionManager = ({ template, questions, onQuestionUpdate, showSuccess, showError }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [draggedQuestion, setDraggedQuestion] = useState(null);

  const formatQuestionNumber = (questionNumber) => {
    // Simply return the stored question number (e.g., "1.1", "1.2", "2.1")
    return questionNumber;
  };

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

  const handleCreateQuestion = () => {
    setEditingQuestion(null);
    setShowForm(true);
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setShowForm(true);
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Are you sure you want to delete this question?')) {
      return;
    }

    try {
      await API.delete(`/api/scorecard/questions/${questionId}`);
      onQuestionUpdate();
      showSuccess('Question deleted successfully!');
    } catch (err) {
      showError('Error deleting question: ' + err.message);
    }
  };

  const handleDragStart = (e, question) => {
    setDraggedQuestion(question);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetQuestion) => {
    e.preventDefault();
    
    if (!draggedQuestion || draggedQuestion.id === targetQuestion.id) {
      return;
    }

    // Create new order array
    const reorderedQuestions = [...questions];
    const draggedIndex = reorderedQuestions.findIndex(q => q.id === draggedQuestion.id);
    const targetIndex = reorderedQuestions.findIndex(q => q.id === targetQuestion.id);

    // Remove dragged item and insert at new position
    const [removed] = reorderedQuestions.splice(draggedIndex, 1);
    reorderedQuestions.splice(targetIndex, 0, removed);

    // Update question numbers
    const questionOrder = reorderedQuestions.map((q, index) => ({
      id: q.id,
      question_number: index + 1
    }));

    try {
      await API.put(`/api/scorecard/templates/${template.id}/questions/reorder`, questionOrder);
      onQuestionUpdate();
      showSuccess('Questions reordered successfully!');
    } catch (err) {
      showError('Error reordering questions: ' + err.message);
    }

    setDraggedQuestion(null);
  };

  const calculateTotalScore = () => {
    return questions.reduce((total, question) => total + (question.max_score || 0), 0);
  };

  return (
    <div className="question-manager">
      <div className="manager-header">
        <div>
          <h2>📝 Questions for: {template.name}</h2>
          <p className="template-info">
            📊 Total Questions: {questions.length} | 🎯 Total Score: {calculateTotalScore()} points
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleCreateQuestion}>
          ➕ Add Question
        </button>
      </div>

      {showForm && (
        <QuestionForm 
          question={editingQuestion}
          templateId={template.id}
          existingQuestions={questions}
          onClose={() => setShowForm(false)}
          onSave={() => {
            setShowForm(false);
            onQuestionUpdate();
            showSuccess('Question saved successfully!');
          }}
          showError={showError}
        />
      )}

      <div className="questions-inline-list">
        {questions.length === 0 ? (
          <div className="empty-state">
            <p>📝 No questions added yet. Create your first question!</p>
          </div>
        ) : (
          questions
            .sort(sortQuestionNumbers)
            .map(question => (
              <div 
                key={question.id}
                className="question-inline-row"
                draggable
                onDragStart={(e) => handleDragStart(e, question)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, question)}
              >
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
                  <div className="marks-display">
                    {question.max_score} pts
                  </div>
                  <div className="question-actions-inline">
                    <button 
                      className="btn btn-sm btn-outline"
                      onClick={() => handleEditQuestion(question)}
                      title="Edit Question"
                    >
                      ✏️
                    </button>
                    <button 
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteQuestion(question.id)}
                      title="Delete Question"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
};

// Question Form Component
const QuestionForm = ({ question, templateId, existingQuestions, onClose, onSave, showError }) => {
  const [formData, setFormData] = useState({
    question_text: question?.question_text || '',
    question_type: question?.question_type || 'objective',
    max_score: question?.max_score || 0,
    question_number: question?.question_number || (existingQuestions.length + 1),
    requires_document: question?.requires_document || false,
    is_mandatory: true, // Always mandatory
    document_description: question?.document_description || '',
    document_formats: question?.document_formats ? JSON.parse(question.document_formats) : ['pdf']
  });
  const [saving, setSaving] = useState(false);

  const questionTypes = [
    { value: 'objective', label: 'Objective (Number/Count)' },
    { value: 'text', label: 'Text Response' },
    { value: 'upload', label: 'Document Upload' }
  ];

  const documentFormats = [
    { value: 'pdf', label: 'PDF' },
    { value: 'doc', label: 'Word Document' },
    { value: 'docx', label: 'Word Document (DOCX)' },
    { value: 'xls', label: 'Excel' },
    { value: 'xlsx', label: 'Excel (XLSX)' },
    { value: 'jpg', label: 'JPEG Image' },
    { value: 'jpeg', label: 'JPEG Image' },
    { value: 'png', label: 'PNG Image' },
    { value: 'zip', label: 'ZIP Archive' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const submitData = {
        ...formData,
        document_formats: JSON.stringify(formData.document_formats)
      };

      if (question) {
        // Update existing question
        await API.put(`/api/scorecard/questions/${question.id}`, submitData);
      } else {
        // Create new question
        await API.post(`/api/scorecard/templates/${templateId}/questions`, submitData);
      }

      onSave();
    } catch (err) {
      showError('Error saving question: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let processedValue = value;
    
    // Convert numeric fields to numbers (but keep question_number as string)
    if (name === 'max_score') {
      processedValue = value === '' ? 0 : parseInt(value, 10);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : processedValue
    }));
  };

  const handleFormatChange = (format) => {
    setFormData(prev => ({
      ...prev,
      document_formats: prev.document_formats.includes(format)
        ? prev.document_formats.filter(f => f !== format)
        : [...prev.document_formats, format]
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content question-form">
        <div className="modal-header">
          <h3>{question ? 'Edit Question' : 'Create New Question'}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Question Number *</label>
              <input
                type="text"
                name="question_number"
                value={formData.question_number}
                onChange={handleChange}
                required
                placeholder="e.g., 1.1, 1.2, 2.1"
              />
            </div>

            <div className="form-group">
              <label>Maximum Score *</label>
              <input
                type="number"
                name="max_score"
                value={formData.max_score}
                onChange={handleChange}
                required
                min="0"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Question Text *</label>
            <textarea
              name="question_text"
              value={formData.question_text}
              onChange={handleChange}
              required
              rows="3"
              placeholder="Enter the question text..."
            />
          </div>

          <div className="form-group">
            <label>Question Type *</label>
            <select
              name="question_type"
              value={formData.question_type}
              onChange={handleChange}
              required
            >
              {questionTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="requires_document"
                  checked={formData.requires_document}
                  onChange={handleChange}
                />
                Requires Document Upload
              </label>
            </div>
            <div className="form-group">
              <span className="mandatory-notice">
                ⭐ All questions are mandatory by default
              </span>
            </div>
          </div>

          {formData.requires_document && (
            <>
              <div className="form-group">
                <label>Document Description</label>
                <textarea
                  name="document_description"
                  value={formData.document_description}
                  onChange={handleChange}
                  rows="2"
                  placeholder="Describe what documents are required..."
                />
              </div>

              <div className="form-group">
                <label>Allowed Document Formats</label>
                <div className="checkbox-grid">
                  {documentFormats.map(format => (
                    <label key={format.value} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.document_formats.includes(format.value)}
                        onChange={() => handleFormatChange(format.value)}
                      />
                      {format.label}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : (question ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuestionManager;
