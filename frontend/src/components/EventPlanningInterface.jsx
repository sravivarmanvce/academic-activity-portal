// EventPlanningInterface.jsx - Component for planning individual events
import React, { useState, useEffect } from 'react';
import API from '../Api';

const EventPlanningInterface = ({ 
  departmentId, 
  academicYearId, 
  mergedData, 
  onClose, 
  onSave 
}) => {
  const [events, setEvents] = useState([]);
  const [eventDocuments, setEventDocuments] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load actual events first, then documents
    const loadData = async () => {
      console.log('EventPlanningInterface useEffect triggered');
      console.log('Department ID:', departmentId, 'Academic Year ID:', academicYearId);
      
      if (departmentId && academicYearId) {
        console.log('Loading events first...');
        await loadActualEvents();
        
        console.log('Loading documents after events...');
        await loadEventDocuments();
      }
    };
    
    loadData();
  }, [departmentId, academicYearId]);

  const loadActualEvents = async () => {
    try {
      console.log('Loading actual events for department:', departmentId, 'academic year:', academicYearId);
      let url = '/events';
      const params = new URLSearchParams();
      
      if (academicYearId) {
        params.append('academic_year_id', academicYearId);
      }
      
      if (departmentId) {
        params.append('department_id', departmentId);
      }
      
      if (params.toString()) {
        url += '?' + params.toString();
      }
      
      console.log('Fetching events from:', url);
      const response = await API.get(url);
      const actualEvents = response.data;
      console.log('Raw events received:', actualEvents);
      
      // Convert to the format expected by the interface
      const eventsList = actualEvents.map(event => ({
        id: event.id, // Use real database ID
        program_type: event.program_type?.name || 'Unknown',
        sub_program_type: event.program_type?.sub_type || '',
        activity_category: event.program_type?.activity_category || '',
        budget_per_event: event.budget_amount || 0,
        allocated_budget: event.budget_amount || 0,
        
        // Event details from database
        title: event.title || '',
        date: event.event_date ? event.event_date.split('T')[0] : '', // Format date for input
        actual_budget: event.budget_amount || 0,
        status: 'completed' // These are saved events
      }));
      
      console.log('Mapped events:', eventsList);
      setEvents(eventsList);
      console.log('Events state updated with:', eventsList.length, 'events');
    } catch (error) {
      console.error('Error loading actual events:', error);
      // Fallback to mergedData if API fails
      initializeEvents();
    }
  };

  const initializeEvents = () => {
    const eventsList = [];
    
    mergedData.forEach((program) => {
      const count = program.count || 0;
      if (count > 0) {
        // Create individual event slots for each count
        for (let i = 0; i < count; i++) {
          eventsList.push({
            id: `${program.program_type}_${program.sub_program_type || 'default'}_${i}`,
            program_type: program.program_type,
            sub_program_type: program.sub_program_type,
            activity_category: program.activity_category,
            budget_per_event: program.budget_per_event || 0,
            allocated_budget: program.budget_mode === 'Fixed' 
              ? program.budget_per_event 
              : Math.round(program.total_budget / count),
            
            // Event details to be filled
            title: '',
            date: '',
            actual_budget: program.budget_mode === 'Fixed' 
              ? program.budget_per_event 
              : Math.round(program.total_budget / count),
            status: 'planned' // 'planned', 'ongoing', 'completed'
          });
        }
      }
    });
    
    setEvents(eventsList);
  };

  const loadEventDocuments = async () => {
    try {
      console.log('Loading event documents...');
      const response = await API.get('/documents/list');
      const documents = response.data;
      console.log('Raw documents from API:', documents);
      
      // Group documents by event_id using actual database IDs
      const docsByEvent = {};
      documents.forEach(doc => {
        if (!docsByEvent[doc.event_id]) {
          docsByEvent[doc.event_id] = {};
        }
        // Use the doc_type field from the API response (already mapped by backend)
        docsByEvent[doc.event_id][doc.doc_type] = doc;
        console.log(`Mapped document: Event ${doc.event_id}, Type: ${doc.doc_type}, Status: ${doc.status}`);
      });
      
      console.log('Final grouped event documents:', docsByEvent);
      setEventDocuments(docsByEvent);
      console.log('EventDocuments state updated with keys:', Object.keys(docsByEvent));
    } catch (error) {
      console.error('Error loading event documents:', error);
    }
  };

  const handleDownloadDocument = async (documentId, filename, docType) => {
    try {
      const response = await API.get(`/documents/download/${documentId}`, {
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
      alert('Error downloading document');
    }
  };

  const checkAllEventsHaveApprovedDocuments = () => {
    const savedEvents = events.filter(event => event.title && event.date);
    if (savedEvents.length === 0) return false;
    
    return savedEvents.every(event => {
      const docs = eventDocuments[event.id];
      return docs && 
             docs.report && docs.report.status === 'approved' &&
             docs.zipfile && docs.zipfile.status === 'approved';
    });
  };

  const handleEventChange = (eventId, field, value) => {
    setEvents(prev => prev.map(event => 
      event.id === eventId 
        ? { ...event, [field]: value }
        : event
    ));
  };

  const handleSaveEvents = async () => {
    setLoading(true);
    try {
      // Validate all events have required fields
      const invalidEvents = events.filter(event => 
        !event.title.trim() || !event.date || !event.actual_budget
      );
      
      if (invalidEvents.length > 0) {
        alert(`Please fill in all required fields for ${invalidEvents.length} events`);
        setLoading(false);
        return;
      }

      // Save events to backend
      const payload = {
        department_id: departmentId,
        academic_year_id: academicYearId,
        events: events
      };

      await API.post('/event-details', payload);
      
      // Check if all events have approved documents to set status as completed
      const allApproved = checkAllEventsHaveApprovedDocuments();
      const workflowStatus = allApproved ? 'completed' : 'events_planned';
      
      // Update workflow status
      await API.put('/workflow-status', {
        department_id: departmentId,
        academic_year_id: academicYearId,
        status: workflowStatus
      });

      const message = allApproved 
        ? 'Events saved successfully! All documents approved - workflow completed!'
        : 'Events saved successfully!';
      alert(message);
      onSave();
    } catch (error) {
      console.error('Error saving events:', error);
      alert('Error saving events');
    } finally {
      setLoading(false);
    }
  };

  // Group events by program type for better organization
  const groupedEvents = events.reduce((groups, event) => {
    const key = `${event.program_type}${event.sub_program_type ? ' - ' + event.sub_program_type : ''}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(event);
    return groups;
  }, {});

  return (
    <div className="container-fluid">
      <div className="row mb-3">
        <div className="col">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h6 className="text-primary mb-0">📅 Plan Individual Events</h6>
              <small className="text-muted">
                Create detailed plans for each approved activity
              </small>
            </div>
            <div className="text-end">
              {checkAllEventsHaveApprovedDocuments() && (
                <span className="badge bg-success">
                  ✅ All Documents Approved - Workflow Complete
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col">
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {Object.entries(groupedEvents).map(([programType, programEvents]) => (
              <div key={programType} className="mb-4">
                <h6 className="bg-light p-2 rounded">{programType}</h6>
                
                {programEvents.map((event, index) => (
                  <div key={event.id} className="card mb-3">
                    <div className="card-header py-2">
                      <small className="text-muted">
                        Event {index + 1} | Budget: ₹{event.allocated_budget}
                      </small>
                    </div>
                    <div className="card-body">
                      <div className="row">
                        <div className="col-md-6">
                          <label className="form-label">Event Title *</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={event.title}
                            onChange={(e) => handleEventChange(event.id, 'title', e.target.value)}
                            placeholder="Enter event title"
                          />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label">Event Date *</label>
                          <input
                            type="date"
                            className="form-control form-control-sm"
                            value={event.date}
                            onChange={(e) => handleEventChange(event.id, 'date', e.target.value)}
                          />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label">Actual Budget *</label>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={event.actual_budget}
                            onChange={(e) => handleEventChange(event.id, 'actual_budget', Number(e.target.value))}
                            min="0"
                            max={event.allocated_budget * 1.1} // Allow 10% variance
                          />
                        </div>
                      </div>
                      <div className="row mt-2">
                        <div className="col">
                          <label className="form-label">Event Documents</label>
                          <div className="d-flex gap-2">
                            {(() => {
                              console.log(`Checking documents for event ${event.id}:`, eventDocuments[event.id]);
                              console.log('All eventDocuments:', eventDocuments);
                              return null;
                            })()}
                            {eventDocuments[event.id]?.report?.status === 'approved' ? (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => handleDownloadDocument(
                                  eventDocuments[event.id].report.id, 
                                  eventDocuments[event.id].report.filename, 
                                  'report'
                                )}
                              >
                                📄 Download Report
                              </button>
                            ) : (
                              <span className="text-muted small">
                                Report: {eventDocuments[event.id]?.report ? 
                                  `Status: ${eventDocuments[event.id].report.status}` : 
                                  'Not uploaded/approved'
                                }
                              </span>
                            )}
                            
                            {eventDocuments[event.id]?.zipfile?.status === 'approved' ? (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-success"
                                onClick={() => handleDownloadDocument(
                                  eventDocuments[event.id].zipfile.id, 
                                  eventDocuments[event.id].zipfile.filename, 
                                  'zipfile'
                                )}
                              >
                                📦 Download ZIP
                              </button>
                            ) : (
                              <span className="text-muted small">
                                ZIP: {eventDocuments[event.id]?.zipfile ? 
                                  `Status: ${eventDocuments[event.id].zipfile.status}` : 
                                  'Not uploaded/approved'
                                }
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {events.length === 0 && (
        <div className="text-center p-4">
          <div className="text-muted">
            <h6>No events to plan</h6>
            <p>No approved program counts found for event planning.</p>
          </div>
        </div>
      )}

      <div className="row mt-3">
        <div className="col text-end">
          <button
            className="btn btn-secondary me-2"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSaveEvents}
            disabled={loading || events.length === 0}
          >
            {loading ? 'Saving...' : `Save ${events.length} Events`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventPlanningInterface;
