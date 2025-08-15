// src/components/DocumentManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Upload, 
  FileText, 
  Download, 
  CheckCircle,
  XCircle,
  AlertCircle,
  Search
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
  const [filters, setFilters] = useState({
    academic_year_id: '',
    department_id: '',
    event_id: ''
  });

  // New state for table filtering and sorting
  const [tableFilters, setTableFilters] = useState({
    searchQuery: '',
    statusFilter: '',
    documentTypeFilter: '',
    sortBy: 'event_date',
    sortOrder: 'desc'
  });

  // Upload form state
  const [reportUploadForm, setReportUploadForm] = useState({
    event_id: '',
    reportFile: null
  });
  const [zipUploadForm, setZipUploadForm] = useState({
    event_id: '',
    zipFile: null
  });

  // Separate upload modal states
  const [showReportUploadModal, setShowReportUploadModal] = useState(false);
  const [showZipUploadModal, setShowZipUploadModal] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = user?.role;
  const userDepartmentId = user?.department_id; // Assuming HoD has department_id in user data

  // Common button style for uniform width
  const uniformButtonStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: '3px 3px',
    border: 'none',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    width: '80px', // Fixed width instead of minWidth for true uniformity
    textAlign: 'center'
  };

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await Api.get('/documents/list');
      let docs = response.data;

      // For HoDs: filter by their department only
      if (userRole === 'hod' && userDepartmentId) {
        // Get department events from all events (not just filtered ones)
        const allEventsResponse = await Api.get('/events');
        const departmentEvents = allEventsResponse.data.filter(event => 
          event.department_id === userDepartmentId
        );
        const departmentEventIds = departmentEvents.map(event => event.id);
        docs = docs.filter(doc => departmentEventIds.includes(doc.event_id));
      }
      // For Principal: keep all documents, filtering will be done in the render logic

      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [userRole, userDepartmentId]);

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
    // Load documents once when component mounts
    loadDocuments();
  }, [loadDocuments]);

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
      const response = await Api.get('/api/academic-years');
      setAcademicYears(response.data);
    } catch (error) {
      console.error('Error loading academic years:', error);
    }
  };

  const handleReportUpload = async (e) => {
    e.preventDefault();
    if (!reportUploadForm.reportFile) {
      setError('Please select a report file');
      return;
    }

    if (!reportUploadForm.event_id) {
      setError('Event ID is required');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('report', reportUploadForm.reportFile);
      
      // Check if ZIP file already exists for this event
      const eventDocs = documents.filter(doc => doc.event_id === reportUploadForm.event_id);
      const existingZipDoc = eventDocs.find(doc => doc.doc_type === 'zipfile' && doc.status !== 'deleted');
      
      if (existingZipDoc) {
        // Use existing ZIP file - create a reference/dummy that won't be processed
        const dummyZip = new File(['existing'], 'existing.zip', { type: 'application/zip' });
        formData.append('zipfile', dummyZip);
        formData.append('preserve_existing_zip', 'true'); // Signal to backend
      } else {
        // Add a minimal dummy ZIP file with clear name
        const dummyZip = new File(['placeholder'], 'no-zip-uploaded.zip', { type: 'application/zip' });
        formData.append('zipfile', dummyZip);
      }

      await Api.post(`/documents/upload/${reportUploadForm.event_id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setShowReportUploadModal(false);
      setReportUploadForm({
        event_id: '',
        reportFile: null
      });
      loadDocuments();
      setError('');
    } catch (error) {
      console.error('Error uploading report:', error);
      setError('Failed to upload report');
    }
  };

  const handleZipUpload = async (e) => {
    e.preventDefault();
    if (!zipUploadForm.zipFile) {
      setError('Please select a ZIP file');
      return;
    }

    if (!zipUploadForm.event_id) {
      setError('Event ID is required');
      return;
    }

    try {
      const formData = new FormData();
      
      // Check if Report file already exists for this event
      const eventDocs = documents.filter(doc => doc.event_id === zipUploadForm.event_id);
      const existingReportDoc = eventDocs.find(doc => doc.doc_type === 'report' && doc.status !== 'deleted');
      
      if (existingReportDoc) {
        // Use existing Report file - create a reference/dummy that won't be processed
        const dummyReport = new File(['existing'], 'existing.pdf', { type: 'application/pdf' });
        formData.append('report', dummyReport);
        formData.append('preserve_existing_report', 'true'); // Signal to backend
      } else {
        // Add a minimal dummy report file with clear name
        const dummyReport = new File(['placeholder'], 'no-report-uploaded.pdf', { type: 'application/pdf' });
        formData.append('report', dummyReport);
      }
      
      formData.append('zipfile', zipUploadForm.zipFile);

      await Api.post(`/documents/upload/${zipUploadForm.event_id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setShowZipUploadModal(false);
      setZipUploadForm({
        event_id: '',
        zipFile: null
      });
      loadDocuments();
      setError('');
    } catch (error) {
      console.error('Error uploading ZIP:', error);
      setError('Failed to upload ZIP file');
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

  const getDepartmentName = (departmentId) => {
    const department = departments.find(d => d.id === departmentId);
    return department ? department.name : `Department ${departmentId}`;
  };

  const getAcademicYearName = (academicYearId) => {
    const academicYear = academicYears.find(y => y.id === academicYearId);
    return academicYear ? academicYear.year : 'Unknown Year';
  };

  // Filter and sort events based on table filters
  const getFilteredAndSortedEvents = () => {
    let filteredEvents = [...events];

    // Apply search filter
    if (tableFilters.searchQuery) {
      const query = tableFilters.searchQuery.toLowerCase();
      filteredEvents = filteredEvents.filter(event => 
        event.title.toLowerCase().includes(query) ||
        getDepartmentName(event.department_id).toLowerCase().includes(query) ||
        event.id.toString().includes(query)
      );
    }

    // Apply status filter
    if (tableFilters.statusFilter) {
      filteredEvents = filteredEvents.filter(event => {
        const eventDocuments = documents.filter(doc => doc.event_id === event.id);
        const reportDoc = eventDocuments.find(doc => doc.doc_type === 'report');
        const zipDoc = eventDocuments.find(doc => doc.doc_type === 'zipfile');

        if (tableFilters.statusFilter === 'no_documents') {
          return !reportDoc && !zipDoc;
        } else if (tableFilters.statusFilter === 'complete') {
          return reportDoc && zipDoc && 
                 reportDoc.status === 'approved' && 
                 zipDoc.status === 'approved';
        } else if (tableFilters.statusFilter === 'pending') {
          return (reportDoc && reportDoc.status === 'pending') || 
                 (zipDoc && zipDoc.status === 'pending');
        } else if (tableFilters.statusFilter === 'rejected') {
          return (reportDoc && reportDoc.status === 'rejected') || 
                 (zipDoc && zipDoc.status === 'rejected');
        }
        return true;
      });
    }

    // Apply document type filter
    if (tableFilters.documentTypeFilter) {
      filteredEvents = filteredEvents.filter(event => {
        const eventDocuments = documents.filter(doc => doc.event_id === event.id);
        if (tableFilters.documentTypeFilter === 'report_only') {
          return eventDocuments.some(doc => doc.doc_type === 'report');
        } else if (tableFilters.documentTypeFilter === 'zip_only') {
          return eventDocuments.some(doc => doc.doc_type === 'zipfile');
        }
        return true;
      });
    }

    // Apply sorting
    filteredEvents.sort((a, b) => {
      let aValue, bValue;

      switch (tableFilters.sortBy) {
        case 'event_id':
          aValue = a.id;
          bValue = b.id;
          break;
        case 'event_title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'department':
          aValue = getDepartmentName(a.department_id).toLowerCase();
          bValue = getDepartmentName(b.department_id).toLowerCase();
          break;
        case 'event_date':
          aValue = new Date(a.event_date);
          bValue = new Date(b.event_date);
          break;
        case 'budget':
          aValue = a.budget_amount || 0;
          bValue = b.budget_amount || 0;
          break;
        case 'academic_year':
          aValue = getAcademicYearName(a.academic_year_id);
          bValue = getAcademicYearName(b.academic_year_id);
          break;
        default:
          aValue = a.id;
          bValue = b.id;
      }

      if (aValue < bValue) return tableFilters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return tableFilters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filteredEvents;
  };

  const handleSort = (sortBy) => {
    setTableFilters(prev => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }));
  };

  const resetTableFilters = () => {
    setTableFilters({
      searchQuery: '',
      statusFilter: '',
      documentTypeFilter: '',
      sortBy: 'event_date',
      sortOrder: 'desc'
    });
  };

  if (loading) return <div className="loading">Loading documents...</div>;

  return (
    <div className="document-management">
      <div className="document-header">
        <h2>📄 Event Document Management</h2>
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
        💡 <strong>HoD:</strong> Upload one event report (PDF/DOC/DOCX) and one ZIP file for each completed event using the upload button in the Actions column.
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

      {/* Events Section */}
      <div className="documents-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3>📋 Events & Documents ({getFilteredAndSortedEvents().length} of {events.length} events)</h3>
          
          {/* Table Controls */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search 
                size={16} 
                style={{ 
                  position: 'absolute', 
                  left: '8px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: '#666',
                  pointerEvents: 'none'
                }} 
              />
              <input
                type="text"
                placeholder="Search events, departments, or IDs..."
                value={tableFilters.searchQuery}
                onChange={(e) => setTableFilters({...tableFilters, searchQuery: e.target.value})}
                style={{
                  padding: '6px 12px 6px 32px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  minWidth: '240px'
                }}
              />
            </div>
            
            <select
              value={tableFilters.statusFilter}
              onChange={(e) => setTableFilters({...tableFilters, statusFilter: e.target.value})}
              style={{
                padding: '6px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="">All Status</option>
              <option value="no_documents">No Documents</option>
              <option value="complete">Complete (Both Approved)</option>
              <option value="pending">Has Pending</option>
              <option value="rejected">Has Rejected</option>
            </select>
            
            <select
              value={tableFilters.documentTypeFilter}
              onChange={(e) => setTableFilters({...tableFilters, documentTypeFilter: e.target.value})}
              style={{
                padding: '6px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="">All Documents</option>
              <option value="report_only">Has Report</option>
              <option value="zip_only">Has ZIP</option>
            </select>
            
            <button
              onClick={resetTableFilters}
              style={{
                padding: '6px 12px',
                border: '1px solid #dc3545',
                borderRadius: '4px',
                backgroundColor: '#dc3545',
                color: 'white',
                fontSize: '14px',
                cursor: 'pointer'
              }}
              title="Reset all filters and sorting"
            >
              🔄 Reset
            </button>
          </div>
        </div>

        {/* Filter Summary */}
        {(tableFilters.searchQuery || tableFilters.statusFilter || tableFilters.documentTypeFilter) && (
          <div style={{
            background: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: '4px',
            padding: '12px',
            marginBottom: '16px',
            fontSize: '14px',
            color: '#495057'
          }}>
            <strong>Active Filters:</strong>{' '}
            {tableFilters.searchQuery && (
              <span style={{ background: '#e7f3ff', padding: '2px 8px', borderRadius: '3px', marginRight: '8px' }}>
                Search: "{tableFilters.searchQuery}"
              </span>
            )}
            {tableFilters.statusFilter && (
              <span style={{ background: '#fff3cd', padding: '2px 8px', borderRadius: '3px', marginRight: '8px' }}>
                Status: {tableFilters.statusFilter.replace('_', ' ')}
              </span>
            )}
            {tableFilters.documentTypeFilter && (
              <span style={{ background: '#d1ecf1', padding: '2px 8px', borderRadius: '3px', marginRight: '8px' }}>
                Type: {tableFilters.documentTypeFilter.replace('_', ' ')}
              </span>
            )}
            <button
              onClick={resetTableFilters}
              style={{
                background: 'none',
                border: 'none',
                color: '#dc3545',
                cursor: 'pointer',
                fontSize: '13px',
                marginLeft: '8px'
              }}
            >
              ✕ Clear all
            </button>
          </div>
        )}
        
        {getFilteredAndSortedEvents().length === 0 ? (
          <div className="no-documents">
            <FileText size={48} />
            <h4>No events found</h4>
            <p>{events.length === 0 ? 'No events available for the selected criteria.' : 'No events match the current filters.'}</p>
          </div>
        ) : (
          <div className="enhanced-documents-table">
            <style jsx>{`
              .sortable {
                cursor: pointer;
                user-select: none;
                position: relative;
                transition: background-color 0.2s ease;
                padding: 12px 8px !important;
                vertical-align: top;
                min-height: 60px;
              }
              .sortable:hover {
                background-color: #f8f9fa;
              }
              .sortable:active {
                background-color: #e9ecef;
              }
              .table-header-content {
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                line-height: 1.3;
              }
              .header-title {
                font-weight: bold;
                margin-bottom: 4px;
              }
              .header-subtitle {
                font-size: 11px;
                color: #666;
                font-weight: normal;
                opacity: 0.8;
              }
            `}</style>
            <table>
              <thead>
                <tr>
                  <th 
                    className="text-center sortable" 
                    onClick={() => handleSort('event_id')}
                    style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}
                    title="Click to sort by Event ID"
                  >
                    <div className="table-header-content" style={{ alignItems: 'center' }}>
                      <span className="header-title">
                        Event ID {tableFilters.sortBy === 'event_id' && (tableFilters.sortOrder === 'asc' ? '↑' : '↓')}
                      </span>
                    </div>
                  </th>
                  <th 
                    className="sortable" 
                    onClick={() => handleSort('event_title')}
                    style={{ cursor: 'pointer', userSelect: 'none', minWidth: '200px' }}
                    title="Click to sort by Event Title"
                  >
                    <div className="table-header-content">
                      <span className="header-title">
                        Event Details {tableFilters.sortBy === 'event_title' && (tableFilters.sortOrder === 'asc' ? '↑' : '↓')}
                      </span>
                    </div>
                  </th>
                  <th 
                    className="text-center sortable" 
                    onClick={() => handleSort('academic_year')}
                    style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}
                    title="Click to sort by Academic Year"
                  >
                    <div className="table-header-content" style={{ alignItems: 'center' }}>
                      <span className="header-title">
                        Academic Year {tableFilters.sortBy === 'academic_year' && (tableFilters.sortOrder === 'asc' ? '↑' : '↓')}
                      </span>
                    </div>
                  </th>
                  <th style={{ padding: '12px 8px', verticalAlign: 'top' }}>
                    <div className="table-header-content">
                      <span className="header-title">Documents & Actions</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {getFilteredAndSortedEvents().map(event => {
                  const departmentName = getDepartmentName(event.department_id);
                  const eventDocuments = documents.filter(doc => doc.event_id === event.id);
                  const reportDoc = eventDocuments.find(doc => doc.doc_type === 'report');
                  const zipDoc = eventDocuments.find(doc => doc.doc_type === 'zipfile');
                  
                  return (
                    <tr key={event.id} className="event-row">
                      <td className="event-id-cell">
                        <div className="event-id" style={{ textAlign: 'center' }}>
                          {event.id}
                        </div>
                      </td>
                      
                      <td className="event-details-cell">
                        <div className="event-name">📝 {event.title}</div>
                        <div className="event-meta">
                          <div>🏢 {departmentName}</div>
                          <div>📅 {new Date(event.event_date).toLocaleDateString()}</div>
                          <div>💰 ₹{event.budget_amount?.toLocaleString()}</div>
                        </div>
                      </td>
                      
                      <td className="academic-year-cell">
                        <div className="academic-year-name">
                          🎓 {getAcademicYearName(event.academic_year_id)}
                        </div>
                      </td>
                      
                      <td className="documents-actions-cell">
                        {/* Report Document */}
                        <div className="doc-action-row">
                          <div className="doc-status-inline">
                            <span className="doc-icon">📄</span>
                            <span className="doc-label">Report:</span>
                            {reportDoc ? (
                              <span className={`status-badge status-${reportDoc.status}`}>
                                {reportDoc.status === 'pending' && <AlertCircle size={12} />}
                                {reportDoc.status === 'approved' && <CheckCircle size={12} />}
                                {reportDoc.status === 'rejected' && <XCircle size={12} />}
                                {reportDoc.status === 'deleted' && <XCircle size={12} />}
                                {reportDoc.status === 'deleted' ? 'Deleted by HoD' : reportDoc.status.charAt(0).toUpperCase() + reportDoc.status.slice(1)}
                              </span>
                            ) : (
                              <span className="status-badge status-not-uploaded">Not uploaded</span>
                            )}
                            {reportDoc && reportDoc.status === 'rejected' && reportDoc.rejection_reason && (
                              <div className="rejection-reason-inline">❌ {reportDoc.rejection_reason}</div>
                            )}
                          </div>
                          
                          {/* Report Actions */}
                          <div className="doc-actions-inline">
                            {/* HoD Upload Report button */}
                            {userRole === 'hod' && (!reportDoc || reportDoc.status === 'rejected' || reportDoc.status === 'deleted') && (
                              <button
                                className="action-btn-compact upload"
                                onClick={() => {
                                  setReportUploadForm({...reportUploadForm, event_id: event.id});
                                  setShowReportUploadModal(true);
                                }}
                                title="Upload Report"
                                style={{
                                  ...uniformButtonStyle,
                                  backgroundColor: '#28a745',
                                  color: 'white'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
                              >
                                <Upload size={12} />
                                <span>Upload</span>
                              </button>
                            )}
                            
                            {/* HoD Delete button for pending reports */}
                            {userRole === 'hod' && reportDoc && reportDoc.status === 'pending' && (
                              <button
                                className="action-btn-compact delete"
                                onClick={() => handleDelete(reportDoc.id)}
                                title="Delete Report"
                                style={{
                                  ...uniformButtonStyle,
                                  backgroundColor: '#dc3545',
                                  color: 'white'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#c82333'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#dc3545'}
                              >
                                🗑️
                                <span>Delete</span>
                              </button>
                            )}
                            
                            {/* Download button for all roles */}
                            {reportDoc && reportDoc.status !== 'deleted' && (
                              <button
                                className="action-btn-compact download"
                                onClick={() => handleDownload(reportDoc.id, reportDoc.filename, reportDoc.event_id, reportDoc.doc_type)}
                                title={`Download: ${reportDoc.filename}`}
                                style={{
                                  ...uniformButtonStyle,
                                  backgroundColor: '#007bff',
                                  color: 'white'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#0056b3'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#007bff'}
                              >
                                <Download size={12} />
                                <span>Download</span>
                              </button>
                            )}
                            
                            {/* Principal Actions for pending reports */}
                            {userRole === 'principal' && reportDoc && reportDoc.status === 'pending' && (
                              <>
                                <button
                                  className="action-btn-compact approve"
                                  onClick={() => handleApprove(reportDoc.id)}
                                  title="Approve Report"
                                  style={{
                                    ...uniformButtonStyle,
                                    backgroundColor: '#28a745',
                                    color: 'white',
                                    marginRight: '4px'
                                  }}
                                  onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
                                  onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
                                >
                                  <CheckCircle size={12} />
                                  <span>Approve</span>
                                </button>
                                <button
                                  className="action-btn-compact reject"
                                  onClick={() => handleReject(reportDoc.id)}
                                  title="Reject Report"
                                  style={{
                                    ...uniformButtonStyle,
                                    backgroundColor: '#dc3545',
                                    color: 'white'
                                  }}
                                  onMouseEnter={(e) => e.target.style.backgroundColor = '#c82333'}
                                  onMouseLeave={(e) => e.target.style.backgroundColor = '#dc3545'}
                                >
                                  <XCircle size={12} />
                                  <span>Reject</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* ZIP Document */}
                        <div className="doc-action-row">
                          <div className="doc-status-inline">
                            <span className="doc-icon">📦</span>
                            <span className="doc-label">ZIP:</span>
                            {zipDoc ? (
                              <span className={`status-badge status-${zipDoc.status}`}>
                                {zipDoc.status === 'pending' && <AlertCircle size={12} />}
                                {zipDoc.status === 'approved' && <CheckCircle size={12} />}
                                {zipDoc.status === 'rejected' && <XCircle size={12} />}
                                {zipDoc.status === 'deleted' && <XCircle size={12} />}
                                {zipDoc.status === 'deleted' ? 'Deleted by HoD' : zipDoc.status.charAt(0).toUpperCase() + zipDoc.status.slice(1)}
                              </span>
                            ) : (
                              <span className="status-badge status-not-uploaded">Not uploaded</span>
                            )}
                            {zipDoc && zipDoc.status === 'rejected' && zipDoc.rejection_reason && (
                              <div className="rejection-reason-inline">❌ {zipDoc.rejection_reason}</div>
                            )}
                          </div>
                          
                          {/* ZIP Actions */}
                          <div className="doc-actions-inline">
                            {/* HoD Upload ZIP button */}
                            {userRole === 'hod' && (!zipDoc || zipDoc.status === 'rejected' || zipDoc.status === 'deleted') && (
                              <button
                                className="action-btn-compact upload"
                                onClick={() => {
                                  setZipUploadForm({...zipUploadForm, event_id: event.id});
                                  setShowZipUploadModal(true);
                                }}
                                title="Upload ZIP"
                                style={{
                                  ...uniformButtonStyle,
                                  backgroundColor: '#28a745',
                                  color: 'white'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
                              >
                                <Upload size={12} />
                                <span>Upload</span>
                              </button>
                            )}
                            
                            {/* HoD Delete button for pending ZIP files */}
                            {userRole === 'hod' && zipDoc && zipDoc.status === 'pending' && (
                              <button
                                className="action-btn-compact delete"
                                onClick={() => handleDelete(zipDoc.id)}
                                title="Delete ZIP"
                                style={{
                                  ...uniformButtonStyle,
                                  backgroundColor: '#dc3545',
                                  color: 'white'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#c82333'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#dc3545'}
                              >
                                🗑️
                                <span>Delete</span>
                              </button>
                            )}
                            
                            {/* Download button for all roles */}
                            {zipDoc && zipDoc.status !== 'deleted' && (
                              <button
                                className="action-btn-compact download"
                                onClick={() => handleDownload(zipDoc.id, zipDoc.filename, zipDoc.event_id, zipDoc.doc_type)}
                                title={`Download: ${zipDoc.filename}`}
                                style={{
                                  ...uniformButtonStyle,
                                  backgroundColor: '#007bff',
                                  color: 'white'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#0056b3'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#007bff'}
                              >
                                <Download size={12} />
                                <span>Download</span>
                              </button>
                            )}
                            
                            {/* Principal Actions for pending ZIP files */}
                            {userRole === 'principal' && zipDoc && zipDoc.status === 'pending' && (
                              <>
                                <button
                                  className="action-btn-compact approve"
                                  onClick={() => handleApprove(zipDoc.id)}
                                  title="Approve ZIP"
                                  style={{
                                    ...uniformButtonStyle,
                                    backgroundColor: '#28a745',
                                    color: 'white',
                                    marginRight: '4px'
                                  }}
                                  onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
                                  onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
                                >
                                  <CheckCircle size={12} />
                                  <span>Approve</span>
                                </button>
                                <button
                                  className="action-btn-compact reject"
                                  onClick={() => handleReject(zipDoc.id)}
                                  title="Reject ZIP"
                                  style={{
                                    ...uniformButtonStyle,
                                    backgroundColor: '#dc3545',
                                    color: 'white'
                                  }}
                                  onMouseEnter={(e) => e.target.style.backgroundColor = '#c82333'}
                                  onMouseLeave={(e) => e.target.style.backgroundColor = '#dc3545'}
                                >
                                  <XCircle size={12} />
                                  <span>Reject</span>
                                </button>
                              </>
                            )}
                          </div>
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

      {/* Report Upload Modal */}
      {showReportUploadModal && (
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
            if (e.target === e.currentTarget) setShowReportUploadModal(false);
          }}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              maxWidth: '400px',
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
              <h3 style={{margin: 0, color: '#333'}}>📄 Upload Report</h3>
              <button 
                onClick={() => setShowReportUploadModal(false)}
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
            
            <form onSubmit={handleReportUpload} style={{padding: '20px'}}>
              <div style={{marginBottom: '20px'}}>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333'}}>
                  Report File (PDF/DOC/DOCX) *
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setReportUploadForm({...reportUploadForm, reportFile: e.target.files[0]})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
                <small style={{color: '#666', fontSize: '12px', marginTop: '5px', display: 'block'}}>
                  Upload the event report document
                </small>
              </div>

              <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px'}}>
                <button 
                  type="button" 
                  onClick={() => setShowReportUploadModal(false)}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: 'white',
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
                  Upload Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ZIP Upload Modal */}
      {showZipUploadModal && (
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
            if (e.target === e.currentTarget) setShowZipUploadModal(false);
          }}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              maxWidth: '400px',
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
              <h3 style={{margin: 0, color: '#333'}}>📦 Upload ZIP File</h3>
              <button 
                onClick={() => setShowZipUploadModal(false)}
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
            
            <form onSubmit={handleZipUpload} style={{padding: '20px'}}>
              <div style={{marginBottom: '20px'}}>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333'}}>
                  ZIP File *
                </label>
                <input
                  type="file"
                  required
                  accept=".zip"
                  onChange={(e) => setZipUploadForm({...zipUploadForm, zipFile: e.target.files[0]})}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
                <small style={{color: '#666', fontSize: '12px', marginTop: '5px', display: 'block'}}>
                  Upload supporting documents as ZIP file
                </small>
              </div>

              <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px'}}>
                <button 
                  type="button" 
                  onClick={() => setShowZipUploadModal(false)}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: 'white',
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
                  Upload ZIP
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
