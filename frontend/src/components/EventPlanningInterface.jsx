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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initialize events based on approved program counts
    initializeEvents();
  }, [mergedData]);

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
            description: '',
            status: 'planned' // 'planned', 'ongoing', 'completed'
          });
        }
      }
    });
    
    setEvents(eventsList);
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
      
      // Update workflow status to 'events_planned'
      await API.put('/workflow-status', {
        department_id: departmentId,
        academic_year_id: academicYearId,
        status: 'events_planned'
      });

      alert('Events saved successfully!');
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
          <h6 className="text-primary mb-0">📅 Plan Individual Events</h6>
          <small className="text-muted">
            Create detailed plans for each approved activity
          </small>
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
                          <label className="form-label">Description</label>
                          <textarea
                            className="form-control form-control-sm"
                            rows="2"
                            value={event.description}
                            onChange={(e) => handleEventChange(event.id, 'description', e.target.value)}
                            placeholder="Brief description of the event"
                          />
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
