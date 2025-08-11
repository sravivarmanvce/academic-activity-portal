from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, time, timedelta
from app.database import get_db
from app.models import Event, ProgramType, Department, AcademicYear
from app.schemas import EventCreate, EventResponse
from app.dependencies import get_current_user_role

router = APIRouter()

@router.post("/events", response_model=EventResponse)
def create_event(
    event: EventCreate,
    db: Session = Depends(get_db),
    current_user_role: str = Depends(get_current_user_role)
):
    """Create a new event - Only HoDs can create events"""
    
    # Only HoDs can create events
    if current_user_role != "hod":
        raise HTTPException(status_code=403, detail="Only HoDs can create events")
    
    # Validate that the foreign key references exist
    program_type = db.query(ProgramType).filter(ProgramType.id == event.program_type_id).first()
    if not program_type:
        # Get available program types for debugging
        available_types = db.query(ProgramType).all()
        available_ids = [f"{pt.id}: {pt.program_type}" for pt in available_types]
        raise HTTPException(
            status_code=400, 
            detail=f"Program type with ID {event.program_type_id} does not exist. Available program types: {available_ids}"
        )
    
    department = db.query(Department).filter(Department.id == event.department_id).first()
    if not department:
        raise HTTPException(status_code=400, detail=f"Department with ID {event.department_id} does not exist")
    
    academic_year = db.query(AcademicYear).filter(AcademicYear.id == event.academic_year_id).first()
    if not academic_year:
        raise HTTPException(status_code=400, detail=f"Academic year with ID {event.academic_year_id} does not exist")
    
    # Validate that event date is in the future (assuming events happen during the day)
    if event.event_date <= datetime.now().date():
        raise HTTPException(status_code=400, detail="Event date must be in the future")
    
    # Validate budget amount
    if event.budget_amount <= 0:
        raise HTTPException(status_code=400, detail="Budget amount must be greater than 0")
    
    # Create new event
    db_event = Event(
        title=event.title,
        description=event.description,
        event_date=event.event_date,
        budget_amount=event.budget_amount,
        coordinator_name=event.coordinator_name,
        coordinator_contact=event.coordinator_contact,
        department_id=event.department_id,
        academic_year_id=event.academic_year_id,
        program_type_id=event.program_type_id,
        created_by=1,  # TODO: Replace with actual user ID when user system is implemented
        created_at=datetime.now(),
        event_status='planned'
    )
    
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    
    return db_event

@router.get("/events", response_model=List[EventResponse])
def get_events(
    department_id: Optional[int] = None,
    academic_year_id: Optional[int] = None,
    program_type_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get events with optional filters"""
    
    query = db.query(Event)
    
    if department_id:
        query = query.filter(Event.department_id == department_id)
    
    if academic_year_id:
        query = query.filter(Event.academic_year_id == academic_year_id)
    
    if program_type_id:
        query = query.filter(Event.program_type_id == program_type_id)
    
    if status:
        query = query.filter(Event.event_status == status)
    
    events = query.order_by(Event.event_date.asc()).all()
    return events

@router.get("/events/{event_id}", response_model=EventResponse)
def get_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user_role: str = Depends(get_current_user_role)
):
    """Get a specific event by ID"""
    
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return event

@router.put("/events/{event_id}", response_model=EventResponse)
def update_event(
    event_id: int,
    event_update: EventCreate,
    db: Session = Depends(get_db),
    current_user_role: str = Depends(get_current_user_role)
):
    """Update an existing event - Only HoDs can update events"""
    
    # Only HoDs can update events
    if current_user_role != "hod":
        raise HTTPException(status_code=403, detail="Only HoDs can update events")
    
    db_event = db.query(Event).filter(Event.id == event_id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Validate that event date is in the future
    if event_update.event_date <= datetime.now().date():
        raise HTTPException(status_code=400, detail="Event date must be in the future")
    
    # Update event fields
    for field, value in event_update.dict(exclude_unset=True).items():
        setattr(db_event, field, value)
    
    db_event.updated_at = datetime.now()
    db_event.updated_by = 1  # TODO: Replace with actual user ID when user system is implemented
    
    db.commit()
    db.refresh(db_event)
    
    return db_event

@router.delete("/events/{event_id}")
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user_role: str = Depends(get_current_user_role)
):
    """Delete an event - Only HoDs can delete events"""
    
    # Only HoDs can delete events
    if current_user_role != "hod":
        raise HTTPException(status_code=403, detail="Only HoDs can delete events")
    
    db_event = db.query(Event).filter(Event.id == event_id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Only allow deletion if event hasn't started yet (assuming events happen during the day)
    if db_event.event_date <= datetime.now().date():
        raise HTTPException(status_code=400, detail="Cannot delete events that have already started")
    
    db.delete(db_event)
    db.commit()
    
    return {"message": "Event deleted successfully"}

@router.put("/events/{event_id}/status")
def update_event_status(
    event_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user_role: str = Depends(get_current_user_role)
):
    """Update event status - HoDs and Principals can update status"""
    
    # Only HoDs and Principals can update event status
    if current_user_role not in ["hod", "principal"]:
        raise HTTPException(status_code=403, detail="Only HoDs and Principals can update event status")
    
    valid_statuses = ['planned', 'ongoing', 'completed', 'cancelled']
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
    
    db_event = db.query(Event).filter(Event.id == event_id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    db_event.event_status = status
    db_event.updated_at = datetime.now()
    db_event.updated_by = 1  # TODO: Replace with actual user ID when user system is implemented
    
    db.commit()
    db.refresh(db_event)
    
    return {"message": f"Event status updated to {status}", "event": db_event}

@router.get("/events/budget-summary/{department_id}/{academic_year_id}")
def get_budget_summary(
    department_id: int,
    academic_year_id: int,
    db: Session = Depends(get_db),
    current_user_role: str = Depends(get_current_user_role)
):
    """Get budget summary for a department's events by program type"""
    
    events = db.query(Event).filter(
        Event.department_id == department_id,
        Event.academic_year_id == academic_year_id,
        Event.event_status != 'cancelled'
    ).all()
    
    # Group by program type
    budget_by_type = {}
    event_count_by_type = {}
    
    for event in events:
        type_id = event.program_type_id
        if type_id not in budget_by_type:
            budget_by_type[type_id] = 0
            event_count_by_type[type_id] = 0
        
        budget_by_type[type_id] += event.budget_amount or 0
        event_count_by_type[type_id] += 1
    
    return {
        "budget_by_type": budget_by_type,
        "event_count_by_type": event_count_by_type,
        "total_planned_budget": sum(budget_by_type.values()),
        "total_events": sum(event_count_by_type.values())
    }
