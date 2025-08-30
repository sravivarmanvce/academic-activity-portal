import React, { useState } from 'react';
import API from '../Api';

// Import/Export Management Component
const ImportExportManager = ({ templates, selectedTemplate, onDataImport, showSuccess, showError }) => {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [importPreview, setImportPreview] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/json') {
        showError('Please select a JSON file');
        return;
      }
      setImportFile(file);
      
      // Read file for preview
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          setImportPreview(data);
        } catch (err) {
          showError('Invalid JSON file format');
          setImportFile(null);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleImport = async () => {
    if (!importFile || !selectedTemplate) {
      showError('Please select a template and import file');
      return;
    }

    setImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const importData = JSON.parse(e.target.result);
          
          const response = await API.post(`/api/scorecard/templates/${selectedTemplate.id}/import`, {
            ...importData,
            replace_existing: replaceExisting
          });

          showSuccess(`Successfully imported ${response.data.message}`);
          onDataImport();
          setImportFile(null);
          setImportPreview(null);
        } catch (err) {
          showError('Error processing import: ' + err.message);
        } finally {
          setImporting(false);
        }
      };
      reader.readAsText(importFile);
    } catch (err) {
      showError('Error importing data: ' + err.message);
      setImporting(false);
    }
  };

  const handleExport = async (templateId) => {
    setExporting(true);
    try {
      const response = await API.get(`/api/scorecard/templates/${templateId}/export`);
      const data = response.data;
      
      // Create and download file
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scorecard-template-${templateId}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showSuccess('Template exported successfully!');
    } catch (err) {
      showError('Error exporting data: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleQuickImportKPI = async () => {
    if (!selectedTemplate) {
      showError('Please select a template first');
      return;
    }

    const confirmed = window.confirm(
      'This will import all 61 KPI questions from the complete set. Continue?'
    );
    
    if (!confirmed) return;

    setImporting(true);
    try {
      // Use the complete_61_kpi_questions.json data
      const response = await fetch('/complete_61_kpi_questions.json');
      const kpiData = await response.json();

      const importResponse = await API.post(`/api/scorecard/templates/${selectedTemplate.id}/import`, {
        questions: kpiData.questions,
        replace_existing: replaceExisting
      });

      showSuccess(`Successfully imported ${importResponse.data.message}`);
      onDataImport();
    } catch (err) {
      showError('Error importing KPI questions: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="import-export-manager">
      <div className="manager-header">
        <h2>📥 Import & Export Questions</h2>
        <p>Manage bulk question operations and template data exchange</p>
      </div>

      <div className="import-export-grid">
        {/* Export Section */}
        <div className="section-card">
          <h3>📤 Export Templates</h3>
          <p>Export template questions as JSON files for backup or sharing</p>
          
          <div className="templates-export-list">
            {templates.length === 0 ? (
              <p>No templates available for export</p>
            ) : (
              templates.map(template => (
                <div key={template.id} className="export-item">
                  <div className="template-info">
                    <strong>{template.name}</strong>
                    <span className="template-year">
                      {template.academic_year?.year || 'N/A'}
                    </span>
                  </div>
                  <button
                    className="btn btn-outline"
                    onClick={() => handleExport(template.id)}
                    disabled={exporting}
                  >
                    {exporting ? '⏳ Exporting...' : '📤 Export'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Import Section */}
        <div className="section-card">
          <h3>📥 Import Questions</h3>
          <p>Import questions from JSON files into selected template</p>

          {!selectedTemplate && (
            <div className="alert alert-warning">
              ⚠️ Please select a template from the Templates tab first
            </div>
          )}

          {selectedTemplate && (
            <>
              <div className="import-target">
                <strong>Importing to:</strong> {selectedTemplate.name}
              </div>

              <div className="import-options">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={replaceExisting}
                    onChange={(e) => setReplaceExisting(e.target.checked)}
                  />
                  Replace existing questions (⚠️ This will delete current questions)
                </label>
              </div>

              <div className="file-import">
                <h4>📁 Import from File</h4>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="file-input"
                />
                
                {importFile && (
                  <div className="file-selected">
                    ✅ Selected: {importFile.name}
                  </div>
                )}

                <button
                  className="btn btn-primary"
                  onClick={handleImport}
                  disabled={!importFile || importing}
                >
                  {importing ? '⏳ Importing...' : '📥 Import Questions'}
                </button>
              </div>

              <div className="quick-import">
                <h4>⚡ Quick Import</h4>
                <p>Import the complete set of 61 KPI questions</p>
                <button
                  className="btn btn-success"
                  onClick={handleQuickImportKPI}
                  disabled={importing}
                >
                  {importing ? '⏳ Importing...' : '⚡ Import 61 KPI Questions'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Import Preview */}
      {importPreview && (
        <div className="import-preview">
          <h3>📋 Import Preview</h3>
          <div className="preview-stats">
            <div className="stat-item">
              <strong>Questions to import:</strong> {importPreview.questions?.length || 0}
            </div>
            {importPreview.template_info && (
              <div className="stat-item">
                <strong>Total Score:</strong> {importPreview.template_info.total_score || 'N/A'} points
              </div>
            )}
          </div>

          {importPreview.questions && importPreview.questions.length > 0 && (
            <div className="preview-questions">
              <h4>Sample Questions:</h4>
              <div className="questions-preview-list">
                {importPreview.questions.slice(0, 3).map((q, index) => (
                  <div key={index} className="preview-question">
                    <strong>Q{q.question_number}:</strong> {q.question_text}
                    <span className="score">({q.max_score} pts)</span>
                  </div>
                ))}
                {importPreview.questions.length > 3 && (
                  <div className="more-questions">
                    ... and {importPreview.questions.length - 3} more questions
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="import-help">
        <h3>💡 Import Help</h3>
        <div className="help-content">
          <h4>JSON File Format:</h4>
          <pre className="json-example">
{`{
  "questions": [
    {
      "question_number": 1,
      "question_text": "Your question text here",
      "question_type": "objective",
      "max_score": 10,
      "requires_document": true,
      "document_description": "Required documents",
      "document_formats": "[\\"pdf\\", \\"xlsx\\"]"
    }
  ]
}`}
          </pre>
          
          <div className="help-tips">
            <h4>Tips:</h4>
            <ul>
              <li>Export an existing template to see the exact format</li>
              <li>Use "Replace existing" to completely rebuild a template</li>
              <li>Without "Replace existing", new questions will be added</li>
              <li>Question numbers will be automatically adjusted if needed</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportExportManager;
