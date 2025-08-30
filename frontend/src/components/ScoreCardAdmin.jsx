import React, { useState, useEffect } from 'react';
import QuestionManager from './QuestionManager';
import ImportExportManager from './ImportExportManager';
import StatisticsView from './StatisticsView';
import API from '../Api';
import './ScoreCardAdmin.css';

const ScoreCardAdmin = () => {
  const [activeTab, setActiveTab] = useState('templates');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch templates on component mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await API.get('/api/scorecard/templates');
      setTemplates(response.data);
    } catch (err) {
      setError('Error fetching templates: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async (templateId) => {
    try {
      setLoading(true);
      const response = await API.get(`/api/scorecard/templates/${templateId}/questions`);
      setQuestions(response.data);
    } catch (err) {
      setError('Error fetching questions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setActiveTab('questions');
    fetchQuestions(template.id);
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const showError = (message) => {
    setError(message);
    setTimeout(() => setError(''), 5000);
  };

  return (
    <div className="scorecard-admin">
      <div className="admin-header">
        <h1>📊 Department Score Card Administration</h1>
        <p>Manage templates and questions for department performance evaluation</p>
      </div>

      {/* Navigation Tabs */}
      <div className="admin-tabs">
        <button 
          className={`tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          📋 Templates
        </button>
        <button 
          className={`tab-btn ${activeTab === 'questions' ? 'active' : ''}`}
          onClick={() => setActiveTab('questions')}
          disabled={!selectedTemplate}
        >
          📝 Questions {selectedTemplate && `(${selectedTemplate.name})`}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          📥 Import/Export
        </button>
        <button 
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
          disabled={!selectedTemplate}
        >
          📈 Statistics
        </button>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="alert alert-success">
          ✅ {successMessage}
        </div>
      )}
      
      {error && (
        <div className="alert alert-error">
          ❌ {error}
        </div>
      )}

      {loading && (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      )}

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'templates' && (
          <TemplateManager 
            templates={templates}
            onTemplateSelect={handleTemplateSelect}
            onTemplateUpdate={fetchTemplates}
            showSuccess={showSuccess}
            showError={showError}
          />
        )}

        {activeTab === 'questions' && selectedTemplate && (
          <QuestionManager 
            template={selectedTemplate}
            questions={questions}
            onQuestionUpdate={() => fetchQuestions(selectedTemplate.id)}
            showSuccess={showSuccess}
            showError={showError}
          />
        )}

        {activeTab === 'import' && (
          <ImportExportManager 
            templates={templates}
            selectedTemplate={selectedTemplate}
            onDataImport={fetchTemplates}
            showSuccess={showSuccess}
            showError={showError}
          />
        )}

        {activeTab === 'stats' && selectedTemplate && (
          <StatisticsView 
            template={selectedTemplate}
            questions={questions}
          />
        )}
      </div>
    </div>
  );
};

// Template Management Component
const TemplateManager = ({ templates, onTemplateSelect, onTemplateUpdate, showSuccess, showError }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  const fetchAcademicYears = async () => {
    try {
      const response = await API.get('/api/academic-years');
      setAcademicYears(response.data);
    } catch (err) {
      console.error('Failed to fetch academic years:', err);
    }
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setShowForm(true);
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  return (
    <div className="template-manager">
      <div className="manager-header">
        <h2>📋 Score Card Templates</h2>
        <button className="btn btn-primary" onClick={handleCreateTemplate}>
          ➕ Create New Template
        </button>
      </div>

      {showForm && (
        <TemplateForm 
          template={editingTemplate}
          academicYears={academicYears}
          onClose={() => setShowForm(false)}
          onSave={() => {
            setShowForm(false);
            onTemplateUpdate();
            showSuccess('Template saved successfully!');
          }}
          showError={showError}
        />
      )}

      <div className="templates-grid">
        {templates.length === 0 ? (
          <div className="empty-state">
            <p>📝 No templates found. Create your first score card template!</p>
          </div>
        ) : (
          templates.map(template => (
            <div key={template.id} className="template-card">
              <div className="template-header">
                <h3>{template.name}</h3>
                <div className="template-actions">
                  <button 
                    className="btn btn-sm btn-outline"
                    onClick={() => handleEditTemplate(template)}
                  >
                    ✏️ Edit
                  </button>
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => onTemplateSelect(template)}
                  >
                    📝 Manage Questions
                  </button>
                </div>
              </div>
              
              <div className="template-details">
                <p className="description">{template.description}</p>
                <div className="template-meta">
                  <span className="meta-item">
                    📅 Academic Year: {template.academic_year?.year || 'N/A'}
                  </span>
                  <span className="meta-item">
                    {template.is_active ? '🟢 Active' : '🔴 Inactive'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Template Form Component
const TemplateForm = ({ template, academicYears, onClose, onSave, showError }) => {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    description: template?.description || '',
    academic_year_id: template?.academic_year_id || '',
    is_active: template?.is_active !== false
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (template) {
        // Update existing template
        await API.put(`/api/scorecard/templates/${template.id}`, formData);
      } else {
        // Create new template - send as FormData since backend expects Form parameters
        const form = new FormData();
        form.append('name', formData.name);
        form.append('description', formData.description || '');
        form.append('academic_year_id', formData.academic_year_id);
        
        await API.post('/api/scorecard/templates', form);
      }

      onSave();
    } catch (err) {
      showError('Error saving template: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : 
              name === 'academic_year_id' ? parseInt(value) || '' :
              value
    }));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content template-form">
        <div className="modal-header">
          <h3>{template ? 'Edit Template' : 'Create New Template'}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Template Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g., Department Performance Score Card 2024-25"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              placeholder="Brief description of this score card template..."
            />
          </div>

          <div className="form-group">
            <label>Academic Year *</label>
            <select
              name="academic_year_id"
              value={formData.academic_year_id}
              onChange={handleChange}
              required
            >
              <option value="">Select Academic Year</option>
              {academicYears.map(year => (
                <option key={year.id} value={year.id}>
                  {year.year}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
              />
              Active Template
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : (template ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScoreCardAdmin;
