import React, { useState, useEffect } from "react";
import API from "../Api";

function EventPlanningModal({ 
  show, 
  onHide, 
  departmentId, 
  academicYearId, 
  approvedBudget,
  departmentName,
  approvedProgramData = [] // New prop for approved program counts
}) {
  const [programEvents, setProgramEvents] = useState({});
  const [documents, setDocuments] = useState([]);
  const [actualEvents, setActualEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Generate dynamic event rows based on approved program counts
  useEffect(() => {
    if (show && approvedProgramData.length > 0) {
      generateEventRows();
    }
  }, [show, approvedProgramData]);

  // Load documents when modal is shown
  useEffect(() => {
    if (show && departmentId && academicYearId) {
      loadDocuments();
      loadActualEvents();
    }
  }, [show, departmentId, academicYearId]);

  const loadActualEvents = async () => {
    try {
      console.log('Loading actual events for modal, dept:', departmentId, 'year:', academicYearId);
      const response = await API.get('/events', {
        params: {
          department_id: departmentId,
          academic_year_id: academicYearId
        }
      });
      console.log('Modal actual events loaded:', response.data);
      setActualEvents(response.data || []);
    } catch (error) {
      console.error('Error loading actual events for modal:', error);
      setActualEvents([]);
    }
  };

  const loadDocuments = async () => {
    try {
      console.log('Loading documents for modal, dept:', departmentId, 'year:', academicYearId);
      const response = await API.get('/documents/list', {
        params: {
          department_id: departmentId,
          academic_year_id: academicYearId
        }
      });
      console.log('Modal documents loaded:', response.data);
      setDocuments(response.data || []);
    } catch (error) {
      console.error('Error loading documents for modal:', error);
      setDocuments([]);
    }
  };

  // Function to get document status for an event - check by event title match since IDs are different
  const getDocumentStatus = (eventTitle) => {
    if (!eventTitle || !documents.length || !actualEvents.length) {
      return { report: false, files: false };
    }
    
    // Find the actual event by title match
    const actualEvent = actualEvents.find(event => 
      event.title && event.title.toLowerCase().trim() === eventTitle.toLowerCase().trim()
    );
    
    if (!actualEvent) {
      return { report: false, files: false };
    }
    
    const eventDocs = documents.filter(doc => doc.event_id === actualEvent.id);
    const hasReport = eventDocs.some(doc => doc.doc_type === 'report');
    const hasFiles = eventDocs.some(doc => doc.doc_type === 'files');
    
    console.log(`Document status for event "${eventTitle}" (ID: ${actualEvent.id}):`, { hasReport, hasFiles, eventDocs });
    
    return { report: hasReport, files: hasFiles };
  };

  const generateEventRows = () => {
    const eventRows = {};
    
    approvedProgramData.forEach(program => {
      const count = program.count || 0;
      const totalBudget = program.total_budget || 0;
      
      if (count > 0) {
        const programKey = `${program.program_type}_${program.sub_program_type || 'default'}`;
        
        // Generate individual event rows based on count
        const rows = [];
        for (let i = 0; i < count; i++) {
          const budgetPerEvent = program.budget_mode === 'Fixed' 
            ? program.budget_per_event 
            : Math.round(totalBudget / count);
            
          rows.push({
            id: `${programKey}_${i}`,
            eventNumber: i + 1,
            title: '',
            event_date: '',
            coordinator_name: '',
            coordinator_contact: '',
            budget_amount: budgetPerEvent,
            status: 'planning' // 'planning', 'completed', 'reported'
          });
        }
        
        eventRows[programKey] = {
          programInfo: program,
          totalCount: count,
          totalBudget: totalBudget,
          events: rows
        };
      }
    });
    
    setProgramEvents(eventRows);
  };

  const handleEventChange = (programKey, eventIndex, field, value) => {
    setProgramEvents(prev => ({
      ...prev,
      [programKey]: {
        ...prev[programKey],
        events: prev[programKey].events.map((event, idx) => 
          idx === eventIndex 
            ? { ...event, [field]: value }
            : event
        )
      }
    }));
  };

  const validateEvents = (programKey) => {
    const program = programEvents[programKey];
    if (!program) return false;
    
    // Check if all events have required fields
    const invalidEvents = program.events.filter(event => 
      !event.title.trim() || 
      !event.event_date
    );
    
    if (invalidEvents.length > 0) {
      alert(`Please fill in all required fields (Event Title and Date) for all ${program.totalCount} events`);
      return false;
    }
    
    // Validate total budget allocation
    const totalAllocated = program.events.reduce((sum, event) => sum + (parseFloat(event.budget_amount) || 0), 0);
    if (Math.abs(totalAllocated - program.totalBudget) > 1) { // Allow ₹1 difference for rounding
      alert(`Total budget allocation (₹${totalAllocated.toLocaleString()}) must equal approved budget (₹${program.totalBudget.toLocaleString()})`);
      return false;
    }
    
    return true;
  };

  const handleSaveProgramEvents = async (programKey) => {
    if (!validateEvents(programKey)) return;
    
    setSaving(true);
    try {
      const program = programEvents[programKey];
      const eventsData = program.events.map(event => ({
        name: event.title,
        program_type_id: program.programInfo.id, // You'll need to map this properly
        department_id: departmentId,
        academic_year_id: academicYearId,
        event_date: event.event_date,
        estimated_budget: parseFloat(event.budget_amount),
        coordinator_name: event.coordinator_name,
        coordinator_contact: event.coordinator_contact
      }));
      
      // Save all events for this program type
      await Promise.all(eventsData.map(eventData => API.post("/events", eventData)));
      
      alert(`Successfully saved ${program.totalCount} events for ${program.programInfo.program_type}!`);
      
      // Mark as completed
      setProgramEvents(prev => ({
        ...prev,
        [programKey]: {
          ...prev[programKey],
          events: prev[programKey].events.map(event => ({
            ...event,
            status: 'completed'
          }))
        }
      }));
      
    } catch (error) {
      console.error("Error saving events:", error);
      alert("Failed to save events. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!show) return null;

  return (
    <div 
      className="position-fixed top-0 start-0 w-100 h-100" 
      style={{ 
        backgroundColor: 'rgba(0,0,0,0.5)', 
        zIndex: 1055,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={(e) => e.target === e.currentTarget && onHide()}
    >
      <div 
        className="bg-white rounded shadow-lg" 
        style={{ 
          width: '95vw',
          height: '90vh',
          maxWidth: 'none',
          margin: 0
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="d-flex flex-column h-100">
          <div className="modal-header bg-primary text-white flex-shrink-0">
            <h5 className="modal-title mb-0">
              <i className="fas fa-calendar-plus"></i> Event Planning - {departmentName} (HoD)
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onHide}></button>
          </div>
          
          <div className="flex-grow-1 overflow-auto p-3">
            {/* Header Info */}
            <div className="alert alert-info">
              <h6 className="alert-heading mb-2">
                <i className="fas fa-info-circle"></i> Event Planning Instructions
              </h6>
              <p className="mb-1">
                Plan individual events based on your approved program counts and budgets. 
                Fill in details for each event and ensure total budget allocation matches the approved amount.
              </p>
            </div>

            {/* Program Event Tables */}
            {Object.keys(programEvents).length === 0 ? (
              <div className="text-center py-5">
                <i className="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                <h5 className="text-muted">No Approved Programs Found</h5>
                <p className="text-muted">
                  No programs with approved counts available for event planning.
                </p>
              </div>
            ) : (
              Object.entries(programEvents).map(([programKey, program]) => (
                <div key={programKey} className="card mb-4">
                  <div className="card-header bg-primary text-white">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h6 className="mb-0">
                          <i className="fas fa-calendar-check"></i> {program.programInfo.program_type}
                          {program.programInfo.sub_program_type && ` - ${program.programInfo.sub_program_type}`}
                        </h6>
                        <small>
                          Approved: {program.totalCount} events | Budget: ₹{program.totalBudget.toLocaleString()}
                          {program.programInfo.budget_mode === 'Fixed' && 
                            ` (₹${program.programInfo.budget_per_event} per event)`
                          }
                        </small>
                      </div>
                      <div>
                        {program.events.every(e => e.status === 'completed') ? (
                          <span className="badge bg-success">
                            <i className="fas fa-check"></i> Events Planned
                          </span>
                        ) : (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleSaveProgramEvents(programKey)}
                            disabled={saving}
                          >
                            {saving ? (
                              <><i className="fas fa-spinner fa-spin"></i> Saving...</>
                            ) : (
                              <><i className="fas fa-save"></i> Save All Events</>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="card-body p-0">
                    <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      <table className="table table-bordered mb-0" style={{ minWidth: '1200px' }}>
                        <thead className="table-light">
                          <tr>
                            <th style={{ width: '50px' }}>#</th>
                            <th style={{ width: '250px' }}>Event Title *</th>
                            <th style={{ width: '150px' }}>Date *</th>
                            <th style={{ width: '150px' }}>Budget (₹) *</th>
                            <th style={{ width: '180px' }}>Coordinator</th>
                            <th style={{ width: '150px' }}>Contact</th>
                            <th style={{ width: '200px' }}>Documents</th>
                          </tr>
                        </thead>
                        <tbody>
                          {program.events.map((event, eventIndex) => (
                            <tr key={event.id} className={event.status === 'completed' ? 'table-success' : ''}>
                              <td className="text-center fw-bold">{event.eventNumber}</td>
                              
                              {/* Event Title */}
                              <td>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={event.title}
                                  onChange={(e) => handleEventChange(programKey, eventIndex, 'title', e.target.value)}
                                  placeholder="Event title"
                                  disabled={event.status === 'completed'}
                                />
                              </td>
                              
                              {/* Event Date */}
                              <td>
                                <input
                                  type="date"
                                  className="form-control form-control-sm"
                                  value={event.event_date}
                                  onChange={(e) => handleEventChange(programKey, eventIndex, 'event_date', e.target.value)}
                                  min={new Date().toISOString().split('T')[0]}
                                  disabled={event.status === 'completed'}
                                />
                              </td>
                              
                              {/* Budget Amount */}
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  value={event.budget_amount}
                                  onChange={(e) => handleEventChange(programKey, eventIndex, 'budget_amount', parseFloat(e.target.value) || 0)}
                                  min="0"
                                  step="0.01"
                                  disabled={program.programInfo.budget_mode === 'Fixed' || event.status === 'completed'}
                                />
                              </td>
                              
                              {/* Coordinator Name */}
                              <td>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={event.coordinator_name}
                                  onChange={(e) => handleEventChange(programKey, eventIndex, 'coordinator_name', e.target.value)}
                                  placeholder="Name"
                                  disabled={event.status === 'completed'}
                                />
                              </td>
                              
                              {/* Coordinator Contact */}
                              <td>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={event.coordinator_contact}
                                  onChange={(e) => handleEventChange(programKey, eventIndex, 'coordinator_contact', e.target.value)}
                                  placeholder="Phone/Email"
                                  disabled={event.status === 'completed'}
                                />
                              </td>
                              
                              {/* Documents */}
                              <td>
                                {(() => {
                                  const docStatus = getDocumentStatus(event.title);
                                  return (
                                    <div className="d-flex gap-1 flex-wrap">
                                      <span className={`small ${docStatus.report ? 'text-success' : 'text-muted'}`}>
                                        Report: {docStatus.report ? 'Available' : 'Not available'}
                                      </span>
                                      <br />
                                      <span className={`small ${docStatus.files ? 'text-success' : 'text-muted'}`}>
                                        ZIP: {docStatus.files ? 'Available' : 'Not available'}
                                      </span>
                                    </div>
                                  );
                                })()}
                              </td>
                            </tr>
                          ))}
                          
                          {/* Budget Summary Row */}
                          <tr className="table-warning">
                            <td colSpan="3" className="text-end fw-bold">Total Budget Allocation:</td>
                            <td className="fw-bold text-primary">
                              ₹{program.events.reduce((sum, event) => sum + (parseFloat(event.budget_amount) || 0), 0).toLocaleString()}
                            </td>
                            <td colSpan="3" className="text-muted small">
                              {program.events.reduce((sum, event) => sum + (parseFloat(event.budget_amount) || 0), 0) === program.totalBudget ? (
                                <span className="text-success">
                                  <i className="fas fa-check"></i> Budget allocation matches approved amount
                                </span>
                              ) : (
                                <span className="text-danger">
                                  <i className="fas fa-exclamation-triangle"></i> Must equal ₹{program.totalBudget.toLocaleString()}
                                </span>
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="modal-footer bg-light flex-shrink-0">
            <button type="button" className="btn btn-secondary" onClick={onHide}>
              <i className="fas fa-times"></i> Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventPlanningModal;
