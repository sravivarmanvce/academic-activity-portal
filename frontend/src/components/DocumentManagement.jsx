// src/components/DocumentManagement.jsx
import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Download, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Plus,
  Folder,
  Search,
  Tag,
  Calendar
} from 'lucide-react';
import Api from '../Api';
import './DocumentManagement.css';

const DocumentManagement = () => {
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [events, setEvents] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [filters, setFilters] = useState({
    document_type: '',
    status: '',
    event_id: '',
    my_documents: false,
    search: ''
  });

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    title: '',
    document_type: 'other',
    description: '',
    tags: '',
    event_id: '',
    is_public: false,
    file: null
  });

  // Folder form state
  const [folderForm, setFolderForm] = useState({
    name: '',
    description: ''
  });

  const userRole = localStorage.getItem('userRole');
  const canApprove = userRole === 'principal' || userRole === 'admin';

  useEffect(() => {
    loadDocuments();
    loadFolders();
    loadDocumentTypes();
    loadEvents();
  }, [filters]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.document_type) params.append('document_type', filters.document_type);
      if (filters.status) params.append('status', filters.status);
      if (filters.event_id) params.append('event_id', filters.event_id);
      if (filters.my_documents) params.append('my_documents', 'true');

      const response = await Api.get(`/api/documents?${params.toString()}`);
      let docs = response.data;

      // Client-side search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        docs = docs.filter(doc => 
          doc.title.toLowerCase().includes(searchLower) ||
          doc.description?.toLowerCase().includes(searchLower) ||
          doc.original_filename.toLowerCase().includes(searchLower)
        );
      }

      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const loadFolders = async () => {
    try {
      const response = await Api.get('/api/documents/folders');
      setFolders(response.data);
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  };

  const loadEvents = async () => {
    try {
      const response = await Api.get('/api/documents/events');
      setEvents(response.data);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const loadDocumentTypes = async () => {
    try {
      const response = await Api.get('/api/documents/types');
      setDocumentTypes(response.data);
    } catch (error) {
      console.error('Error loading document types:', error);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.file) {
      setError('Please select a file to upload');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('title', uploadForm.title);
      formData.append('document_type', uploadForm.document_type);
      formData.append('description', uploadForm.description);
      formData.append('is_public', uploadForm.is_public);
      
      if (uploadForm.event_id) {
        formData.append('event_id', uploadForm.event_id);
      }
      
      if (uploadForm.tags) {
        const tagsArray = uploadForm.tags.split(',').map(tag => tag.trim());
        formData.append('tags', JSON.stringify(tagsArray));
      }

      await Api.post('/api/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setShowUploadModal(false);
      setUploadForm({
        title: '',
        document_type: 'other',
        description: '',
        tags: '',
        event_id: '',
        is_public: false,
        file: null
      });
      loadDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      setError('Failed to upload document');
    }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('name', folderForm.name);
      formData.append('description', folderForm.description);

      await Api.post('/api/documents/folders', formData);
      
      setShowFolderModal(false);
      setFolderForm({ name: '', description: '' });
      loadFolders();
    } catch (error) {
      console.error('Error creating folder:', error);
      setError('Failed to create folder');
    }
  };

  const handleDownload = async (documentId, filename) => {
    try {
      const response = await Api.get(`/api/documents/${documentId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
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
      await Api.patch(`/api/documents/${documentId}/approve`);
      loadDocuments();
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
      
      await Api.patch(`/api/documents/${documentId}/reject`, formData);
      loadDocuments();
    } catch (error) {
      console.error('Error rejecting document:', error);
      setError('Failed to reject document');
    }
  };

  const handleDelete = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      await Api.delete(`/api/documents/${documentId}`);
      loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      setError('Failed to delete document');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { class: 'status-pending', icon: '⏳', text: 'Pending' },
      approved: { class: 'status-approved', icon: '✅', text: 'Approved' },
      rejected: { class: 'status-rejected', icon: '❌', text: 'Rejected' }
    };
    
    const badge = badges[status] || badges.pending;
    return (
      <span className={`status-badge ${badge.class}`}>
        {badge.icon} {badge.text}
      </span>
    );
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getEventTitle = (eventId) => {
    const event = events.find(e => e.id === eventId);
    return event ? `${event.title} (${new Date(event.event_date).toLocaleDateString()})` : 'Not linked';
  };

  if (loading) return <div className="loading">Loading documents...</div>;

  return (
    <div className="document-management">
      <div className="document-header">
        <h2>📄 Document Management</h2>
        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => setShowFolderModal(true)}
          >
            <Plus size={16} /> Create Folder
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => setShowUploadModal(true)}
          >
            <Upload size={16} /> Upload Document
          </button>
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
        💡 <strong>Tip:</strong> Link documents to specific events from your Event Planning to keep everything organized. 
        Upload receipts, proposals, reports, and certificates for easy approval and tracking.
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
          <div className="filter-group">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search documents..."
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
            />
          </div>
          
          <select
            value={filters.document_type}
            onChange={(e) => setFilters({...filters, document_type: e.target.value})}
          >
            <option value="">All Types</option>
            {documentTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

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

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={filters.my_documents}
              onChange={(e) => setFilters({...filters, my_documents: e.target.checked})}
            />
            My Documents Only
          </label>
        </div>
      </div>

      {/* Documents Section */}
      <div className="documents-section">
        <h3>Documents ({documents.length})</h3>
        
        {documents.length === 0 ? (
          <div className="no-documents">
            <FileText size={48} />
            <h4>No documents found</h4>
            <p>Upload your first document to get started.</p>
          </div>
        ) : (
          <div className="documents-table">
            <table>
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Type</th>
                  <th>Linked Event</th>
                  <th>Size</th>
                  <th>Status</th>
                  <th>Uploaded</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map(doc => (
                  <tr key={doc.id}>
                    <td>
                      <div className="document-info">
                        <FileText size={20} />
                        <div>
                          <div className="doc-title">{doc.title}</div>
                          <div className="doc-filename">{doc.original_filename}</div>
                          {doc.tags && doc.tags.length > 0 && (
                            <div className="doc-tags">
                              {doc.tags.map(tag => (
                                <span key={tag} className="tag">
                                  <Tag size={12} /> {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="document-type">
                        {documentTypes.find(t => t.value === doc.document_type)?.label || doc.document_type}
                      </span>
                    </td>
                    <td>
                      <div className="event-link">
                        {doc.event_id ? (
                          <span className="linked-event">
                            📅 {getEventTitle(doc.event_id)}
                          </span>
                        ) : (
                          <span className="no-event">-</span>
                        )}
                      </div>
                    </td>
                    <td>{formatFileSize(doc.file_size)}</td>
                    <td>{getStatusBadge(doc.status)}</td>
                    <td>
                      <div className="upload-info">
                        <div>{doc.uploader_name}</div>
                        <div className="upload-date">
                          <Calendar size={12} /> {new Date(doc.uploaded_at).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="document-actions">
                        <button
                          className="action-btn view"
                          onClick={() => setSelectedDocument(doc)}
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="action-btn download"
                          onClick={() => handleDownload(doc.id, doc.original_filename)}
                          title="Download"
                        >
                          <Download size={16} />
                        </button>
                        {canApprove && doc.status === 'pending' && (
                          <>
                            <button
                              className="action-btn approve"
                              onClick={() => handleApprove(doc.id)}
                              title="Approve"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button
                              className="action-btn reject"
                              onClick={() => handleReject(doc.id)}
                              title="Reject"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Upload Document</h3>
              <button onClick={() => setShowUploadModal(false)}>×</button>
            </div>
            <form onSubmit={handleUpload} className="modal-body">
              <div className="form-group">
                <label>File *</label>
                <input
                  type="file"
                  required
                  onChange={(e) => setUploadForm({...uploadForm, file: e.target.files[0]})}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.rtf"
                />
              </div>
              
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  required
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({...uploadForm, title: e.target.value})}
                  placeholder="Enter document title"
                />
              </div>

              <div className="form-group">
                <label>Document Type *</label>
                <select
                  required
                  value={uploadForm.document_type}
                  onChange={(e) => setUploadForm({...uploadForm, document_type: e.target.value})}
                >
                  {documentTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>🔗 Link to Event (Recommended)</label>
                <select
                  value={uploadForm.event_id}
                  onChange={(e) => setUploadForm({...uploadForm, event_id: e.target.value})}
                >
                  <option value="">-- Select Event (Optional) --</option>
                  {events.map(event => (
                    <option key={event.id} value={event.id}>
                      {event.title} - {new Date(event.event_date).toLocaleDateString()} 
                      (₹{event.budget_amount.toLocaleString()})
                    </option>
                  ))}
                </select>
                <small style={{color: '#666', fontSize: '12px', marginTop: '5px', display: 'block'}}>
                  💡 Link this document to a specific event from your Event Planning for better organization
                </small>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                  placeholder="Enter document description"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Tags</label>
                <input
                  type="text"
                  value={uploadForm.tags}
                  onChange={(e) => setUploadForm({...uploadForm, tags: e.target.value})}
                  placeholder="Enter tags separated by commas (e.g., receipt, conference, approved)"
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={uploadForm.is_public}
                    onChange={(e) => setUploadForm({...uploadForm, is_public: e.target.checked})}
                  />
                  Make this document public (visible to all departments)
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowUploadModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Upload Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Details Modal */}
      {selectedDocument && (
        <div className="modal-overlay">
          <div className="modal large">
            <div className="modal-header">
              <h3>Document Details</h3>
              <button onClick={() => setSelectedDocument(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="document-details">
                <div className="detail-row">
                  <strong>Title:</strong> {selectedDocument.title}
                </div>
                <div className="detail-row">
                  <strong>Filename:</strong> {selectedDocument.original_filename}
                </div>
                <div className="detail-row">
                  <strong>Type:</strong> {documentTypes.find(t => t.value === selectedDocument.document_type)?.label || selectedDocument.document_type}
                </div>
                <div className="detail-row">
                  <strong>Status:</strong> {getStatusBadge(selectedDocument.status)}
                </div>
                <div className="detail-row">
                  <strong>Size:</strong> {formatFileSize(selectedDocument.file_size)}
                </div>
                <div className="detail-row">
                  <strong>Uploaded by:</strong> {selectedDocument.uploader_name}
                </div>
                <div className="detail-row">
                  <strong>Department:</strong> {selectedDocument.department_name}
                </div>
                <div className="detail-row">
                  <strong>Upload Date:</strong> {new Date(selectedDocument.uploaded_at).toLocaleDateString()}
                </div>
                {selectedDocument.event_id && (
                  <div className="detail-row">
                    <strong>Linked Event:</strong> 📅 {getEventTitle(selectedDocument.event_id)}
                  </div>
                )}
                {selectedDocument.description && (
                  <div className="detail-row">
                    <strong>Description:</strong> {selectedDocument.description}
                  </div>
                )}
                {selectedDocument.tags && selectedDocument.tags.length > 0 && (
                  <div className="detail-row">
                    <strong>Tags:</strong>
                    <div className="tags-container">
                      {selectedDocument.tags.map(tag => (
                        <span key={tag} className="tag">
                          <Tag size={12} /> {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="modal-actions">
                <button onClick={() => setSelectedDocument(null)}>
                  Close
                </button>
                <button 
                  className="btn-primary"
                  onClick={() => handleDownload(selectedDocument.id, selectedDocument.original_filename)}
                >
                  <Download size={16} /> Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentManagement;