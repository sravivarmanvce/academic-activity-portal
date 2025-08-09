// src/components/DocumentManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Upload, 
  FileText, 
  Download, 
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import Api from '../Api';
import './DocumentManagement.css';

const DocumentManagement = () => {
  const [documents, setDocuments] = useState([]);
  const [events, setEvents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [filters, setFilters] = useState({
    academic_year_id: '',
    department_id: '',
    event_id: ''
  });

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    event_id: '',
    reportFile: null,
    zipFile: null
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = user?.role;
  const userDepartmentId = user?.department_id; // Assuming HoD has department_id in user data

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await Api.get('/documents/list');
      let docs = response.data;

      // Filter documents based on loaded events (this ensures academic year consistency)
      if (events.length > 0) {
        const eventIds = events.map(event => event.id);
        docs = docs.filter(doc => eventIds.includes(doc.event_id));
      }

      // Additional filtering for HoDs (their department only)
      if (userRole === 'hod' && userDepartmentId && events.length > 0) {
        const departmentEventIds = events
          .filter(event => event.department_id == userDepartmentId)
          .map(event => event.id);
        docs = docs.filter(doc => departmentEventIds.includes(doc.event_id));
      }
      // Additional filtering for Principal by selected department
      else if (filters.department_id && events.length > 0) {
        const departmentEventIds = events
          .filter(event => event.department_id == filters.department_id)
          .map(event => event.id);
        docs = docs.filter(doc => departmentEventIds.includes(doc.event_id));
      }

      // Filter by specific event if selected
      if (filters.event_id) {
        docs = docs.filter(doc => doc.event_id === filters.event_id);
      }

      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [filters.event_id, filters.department_id, events, userRole, userDepartmentId]);

  const loadEvents = useCallback(async () => {
    try {
      let url = '/events';
      const params = new URLSearchParams();
      
      if (filters.academic_year_id) {
        params.append('academic_year_id', filters.academic_year_id);
      }
      
      // For HoDs: automatically filter by their department
      if (userRole === 'hod' && userDepartmentId) {
        params.append('department_id', userDepartmentId);
      }
      // For Principal: filter by selected department if any
      else if (filters.department_id) {
        params.append('department_id', filters.department_id);
      }
      
      if (params.toString()) {
        url += '?' + params.toString();
      }
      
      const response = await Api.get(url);
      setEvents(response.data);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  }, [filters.academic_year_id, filters.department_id, userRole, userDepartmentId]);

  useEffect(() => {
    loadDepartments();
    loadAcademicYears();
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    // Load documents whenever events change or filters change
    if (events.length > 0 || (!filters.department_id && !filters.event_id && !filters.academic_year_id)) {
      loadDocuments();
    }
  }, [loadDocuments, events, filters.academic_year_id]);

  const loadDepartments = async () => {
    try {
      const response = await Api.get('/departments');
      setDepartments(response.data);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const loadAcademicYears = async () => {
    try {
      const response = await Api.get('/academic-years');
      setAcademicYears(response.data);
    } catch (error) {
      console.error('Error loading academic years:', error);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.reportFile || !uploadForm.zipFile) {
      setError('Please select both event report and ZIP file');
      return;
    }

    if (!uploadForm.event_id) {
      setError('Please select an event');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('report', uploadForm.reportFile);
      formData.append('zipfile', uploadForm.zipFile);

      await Api.post(`/documents/upload/${uploadForm.event_id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setShowUploadModal(false);
      setUploadForm({
        event_id: '',
        reportFile: null,
        zipFile: null
      });
      loadDocuments();
    } catch (error) {
      console.error('Error uploading documents:', error);
      setError('Failed to upload documents');
    }
  };

  const handleDownload = async (documentId, filename, eventId, docType) => {
    try {
      const response = await Api.get(`/documents/download/${documentId}`, {
        responseType: 'blob'
      });
      
      // Get event info for filename
      const event = events.find(e => e.id === eventId);
      let newFilename = filename;
      
      if (event) {
        // Try to get department from localStorage, or use a default
        let userDept = localStorage.getItem('userDepartment') || localStorage.getItem('department') || 'DEPT';
        
        // Clean event title for filename (remove special characters)
        const eventTitle = event.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
        const docTypeLabel = docType === 'report' ? 'Report' : 'Annexures';
        
        // Create new filename: DEPT_EventTitle_Type_OriginalName
        newFilename = `${userDept}_${eventTitle}_${docTypeLabel}_${filename}`;
      }
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', newFilename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      setError('Failed to download document');
    }
  };

  const handleApprove = async (documentId) => {
    try {
      await Api.post(`/documents/approve/${documentId}`);
      loadDocuments();
      setError('');
    } catch (error) {
      console.error('Error approving document:', error);
      setError('Failed to approve document');
    }
  };

  const handleReject = async (documentId) => {
    const reason = prompt('Please enter rejection reason:');
    if (!reason) return;

    try {
      const formData = new FormData();
      formData.append('reason', reason);
      
      await Api.post(`/documents/reject/${documentId}`, formData);
      loadDocuments();
      setError('');
    } catch (error) {
      console.error('Error rejecting document:', error);
      setError('Failed to reject document');
    }
  };

  const handleDelete = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      await Api.delete(`/documents/delete/${documentId}`);
      loadDocuments();
      setError('');
    } catch (error) {
      console.error('Error deleting document:', error);
      setError('Failed to delete document');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { class: 'status-pending', icon: <AlertCircle size={16} />, text: 'Pending Review' },
      approved: { class: 'status-approved', icon: <CheckCircle size={16} />, text: 'Approved' },
      rejected: { class: 'status-rejected', icon: <XCircle size={16} />, text: 'Rejected' },
      deleted: { class: 'status-deleted', icon: <XCircle size={16} />, text: 'Deleted by HoD' }
    };
    
    const badge = badges[status] || badges.pending;
    return (
      <span className={`status-badge ${badge.class}`}>
        {badge.icon} {badge.text}
      </span>
    );
  };

  const getEventTitle = (eventId) => {
    const event = events.find(e => e.id === eventId);
    return event ? event : null;
  };

  const getDepartmentName = (departmentId) => {
    const department = departments.find(d => d.id === departmentId);
    return department ? department.name : `Department ${departmentId}`;
  };

  const getAcademicYearName = (academicYearId) => {
    const academicYear = academicYears.find(y => y.id === academicYearId);
    return academicYear ? academicYear.year : 'Unknown Year';
  };

  if (loading) return <div className="loading">Loading documents...</div>;

  return (
    <div className="document-management">
      <div className="document-header">
        <h2>📄 Event Document Management</h2>
        <div className="header-actions">
          {/* Only show upload button for HoDs */}
          {userRole === 'hod' && (
            <button 
              className="btn btn-primary"
              onClick={() => setShowUploadModal(true)}
            >
              <Upload size={16} /> Upload Event Documents
            </button>
          )}
        </div>
      </div>

      {/* Info Banner */}
      <div style={{
        background: '#e3f2fd',
        border: '1px solid #2196f3',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '20px',
        fontSize: '14px',
        color: '#1565c0'
      }}>
        💡 <strong>HoD:</strong> Upload one event report (PDF/DOC/DOCX) and one ZIP file for each completed event. 
        <br />
        📋 <strong>Principal:</strong> Review and approve/reject uploaded documents. Rejected documents must be re-uploaded.
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-row">
          <select
            value={filters.academic_year_id}
            onChange={(e) => setFilters({...filters, academic_year_id: e.target.value, event_id: ''})}
          >
            <option value="">All Academic Years</option>
            {academicYears.map(year => (
              <option key={year.id} value={year.id}>
                {year.year}
              </option>
            ))}
          </select>
          
          {/* Only show department dropdown for Principal */}
          {userRole === 'principal' && (
            <select
              value={filters.department_id}
              onChange={(e) => setFilters({...filters, department_id: e.target.value, event_id: ''})}
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          )}
          
          <select
            value={filters.event_id}
            onChange={(e) => setFilters({...filters, event_id: e.target.value})}
          >
            <option value="">All Events</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>
                {event.title} ({new Date(event.event_date).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Documents Section */}
      <div className="documents-section">
        <h3>📋 Event Documents ({documents.length})</h3>
        
        {documents.length === 0 ? (
          <div className="no-documents">
            <FileText size={48} />
            <h4>No documents found</h4>
            <p>Upload event documents to get started.</p>
          </div>
        ) : (
          <div className="enhanced-documents-table">
            <table>
              <thead>
                <tr>
                  <th>Department & Event</th>
                  <th>Academic Year</th>
                  <th>Document</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map(doc => {
                  const event = getEventTitle(doc.event_id);
                  const departmentName = event ? getDepartmentName(event.department_id) : 'Unknown';
                  
                  return (
                    <tr key={doc.id} className={`document-row status-${doc.status}`}>
                      <td className="department-event-cell">
                        <div className="department-event-name">🏢 {departmentName} - {event ? event.title : 'Unknown Event'}</div>
                        <div className="event-date-small">📅 {event ? new Date(event.event_date).toLocaleDateString() : 'No Date'}</div>
                      </td>
                      
                      <td className="academic-year-cell">
                        <div className="academic-year-name">
                          🎓 {event ? getAcademicYearName(event.academic_year_id) : 'Unknown Year'}
                        </div>
                      </td>
                      
                      <td className="document-cell">
                        <div className="document-header-compact">
                          <span className="doc-icon">
                            {doc.doc_type === 'report' ? '📄' : '📦'}
                          </span>
                          <div className="doc-info-compact">
                            <div className="doc-filename">{doc.filename}</div>
                            <div className="doc-type-label">
                              {doc.doc_type === 'report' ? 'Event Report' : 'ZIP Files'}
                            </div>
                          </div>
                        </div>
                        
                        {/* Show rejection reason or deletion notice */}
                        {doc.status === 'rejected' && doc.rejection_reason && (
                          <div className="inline-rejection-reason">
                            ❌ Rejected: {doc.rejection_reason}
                          </div>
                        )}
                        {doc.status === 'deleted' && (
                          <div className="inline-deletion-notice">
                            🗑️ Deleted by HoD
                          </div>
                        )}
                      </td>
                      
                      <td className="status-cell">
                        {getStatusBadge(doc.status)}
                      </td>
                      
                      <td className="date-cell">
                        <div className="upload-date-compact">
                          <Calendar size={14} />
                          {new Date(doc.uploaded_at).toLocaleDateString()}
                        </div>
                      </td>
                      
                      <td className="actions-cell">
                        <div className="action-buttons-compact">
                          {/* Download button - available for all roles if not deleted */}
                          {doc.status !== 'deleted' && (
                            <button
                              className="action-btn-compact download"
                              onClick={() => handleDownload(doc.id, doc.filename, doc.event_id, doc.doc_type)}
                              title="Download Document"
                            >
                              <Download size={16} />
                            </button>
                          )}
                          
                          {/* Principal Actions - Approve/Reject for pending documents */}
                          {userRole === 'principal' && doc.status === 'pending' && (
                            <>
                              <button
                                className="action-btn-compact approve"
                                onClick={() => handleApprove(doc.id)}
                                title="Approve Document"
                              >
                                <CheckCircle size={16} />
                              </button>
                              <button
                                className="action-btn-compact reject"
                                onClick={() => handleReject(doc.id)}
                                title="Reject Document"
                              >
                                <XCircle size={16} />
                              </button>
                            </>
                          )}
                          
                          {/* HoD Actions - Delete/Re-upload */}
                          {userRole === 'hod' && (
                            <>
                              {/* Delete option for pending documents */}
                              {doc.status === 'pending' && (
                                <button
                                  className="action-btn-compact delete"
                                  onClick={() => handleDelete(doc.id)}
                                  title="Delete Document"
                                >
                                  🗑️
                                </button>
                              )}
                              
                              {/* Re-upload for rejected documents */}
                              {doc.status === 'rejected' && (
                                <button
                                  className="action-btn-compact reupload"
                                  onClick={() => {
                                    setUploadForm({...uploadForm, event_id: doc.event_id});
                                    setShowUploadModal(true);
                                  }}
                                  title="Re-upload Document"
                                >
                                  <Upload size={16} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowUploadModal(false);
          }}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 20px 10px 20px',
              borderBottom: '1px solid #eee'
            }}>
              <h3 style={{margin: 0, color: '#333'}}>Upload Event Documents</h3>
              <button 
                onClick={() => setShowUploadModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#999',
                  padding: '0',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >×</button>
            </div>
            
            <form onSubmit={handleUpload} style={{padding: '20px'}}>
              <div style={{marginBottom: '20px'}}>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333'}}>
                  Select Event *
                </label>
                <select
                  required
                  value={uploadForm.event_id}
                  onChange={(e) => setUploadForm({...uploadForm, event_id: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">-- Select Event --</option>
                  {events.map(event => (
                    <option key={event.id} value={event.id}>
                      {event.title} - {new Date(event.event_date).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
              
              <div style={{marginBottom: '20px'}}>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333'}}>
                  Event Report *
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setUploadForm({...uploadForm, reportFile: e.target.files[0]})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
                <small style={{color: '#666', fontSize: '12px', marginTop: '5px', display: 'block'}}>
                  Upload the event report (PDF, DOC, or DOCX format)
                </small>
              </div>

              <div style={{marginBottom: '20px'}}>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333'}}>
                  ZIP File *
                </label>
                <input
                  type="file"
                  required
                  accept=".zip"
                  onChange={(e) => setUploadForm({...uploadForm, zipFile: e.target.files[0]})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
                <small style={{color: '#666', fontSize: '12px', marginTop: '5px', display: 'block'}}>
                  Upload supporting documents as a ZIP file
                </small>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                paddingTop: '20px',
                borderTop: '1px solid #eee'
              }}>
                <button 
                  type="button" 
                  onClick={() => setShowUploadModal(false)}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: 'white',
                    color: '#333',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '4px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Upload Documents
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManagement;
