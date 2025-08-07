# app/api/endpoints/workflow_status.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import WorkflowStatus, User, Department, AcademicYear
from app.schemas import WorkflowStatusResponse, WorkflowStatusUpdate
from app.email_service import email_service
from app.notification_service import notification_service
from datetime import datetime
import asyncio

router = APIRouter()

@router.get("/workflow-status", response_model=WorkflowStatusResponse)
def get_workflow_status(
    department_id: int,
    academic_year_id: int,
    db: Session = Depends(get_db)
):
    """Get the current workflow status for a department and academic year"""
    status = db.query(WorkflowStatus).filter(
        WorkflowStatus.department_id == department_id,
        WorkflowStatus.academic_year_id == academic_year_id
    ).first()
    
    if not status:
        # Create default status if doesn't exist
        status = WorkflowStatus(
            department_id=department_id,
            academic_year_id=academic_year_id,
            status='draft',
            updated_at=datetime.now()
        )
        db.add(status)
        db.commit()
        db.refresh(status)
    
    return status

@router.put("/workflow-status")
async def update_workflow_status(
    update_data: WorkflowStatusUpdate,
    db: Session = Depends(get_db)
):
    """Update the workflow status for a department and academic year"""
    status = db.query(WorkflowStatus).filter(
        WorkflowStatus.department_id == update_data.department_id,
        WorkflowStatus.academic_year_id == update_data.academic_year_id
    ).first()
    
    old_status = status.status if status else 'draft'
    
    if not status:
        # Create new status if doesn't exist
        status = WorkflowStatus(
            department_id=update_data.department_id,
            academic_year_id=update_data.academic_year_id,
            status=update_data.status,
            updated_at=datetime.now()
        )
        db.add(status)
    else:
        # Update existing status
        status.status = update_data.status
        status.updated_at = datetime.now()
    
    db.commit()
    db.refresh(status)
    
    # Send email notifications for status changes
    try:
        await send_status_change_notifications(
            db, 
            update_data.department_id, 
            update_data.academic_year_id, 
            old_status, 
            update_data.status
        )
    except Exception as e:
        print(f"Warning: Failed to send email notification: {str(e)}")
    
    # Send in-app notifications for status changes
    try:
        send_in_app_notifications(
            db,
            update_data.department_id, 
            update_data.academic_year_id, 
            old_status, 
            update_data.status
        )
    except Exception as e:
        print(f"Warning: Failed to send in-app notification: {str(e)}")
    
    return {"message": f"Status updated to {update_data.status}", "status": status.status}

async def send_status_change_notifications(
    db: Session, 
    department_id: int, 
    academic_year_id: int, 
    old_status: str, 
    new_status: str
):
    """Send appropriate email notifications based on status change"""
    
    # Get department and academic year info
    department = db.query(Department).filter(Department.id == department_id).first()
    academic_year = db.query(AcademicYear).filter(AcademicYear.id == academic_year_id).first()
    
    if not department or not academic_year:
        return
    
    # Get HoD and Principal users
    hod = db.query(User).filter(
        User.department_id == department_id,
        User.role == 'hod'
    ).first()
    
    principal = db.query(User).filter(User.role == 'principal').first()
    
    # Status change: draft -> submitted (HoD submits budget)
    if old_status == 'draft' and new_status == 'submitted':
        if hod and principal:
            await email_service.send_budget_submission_notification(
                hod_email=hod.email,
                hod_name=hod.name,
                department_name=department.name,
                academic_year=academic_year.year,
                principal_email=principal.email,
                principal_name=principal.name
            )
    
    # Status change: submitted -> approved (Principal approves budget)
    elif old_status == 'submitted' and new_status == 'approved':
        if hod:
            await email_service.send_budget_approval_notification(
                hod_email=hod.email,
                hod_name=hod.name,
                department_name=department.name,
                academic_year=academic_year.year,
                approved=True,
                remarks="Budget approved successfully! You can now plan individual events."
            )
    
    # Status change: approved -> events_submitted (HoD submits events)
    elif old_status == 'approved' and new_status == 'events_submitted':
        if hod and principal:
            # Count events for this department (you might need to implement this)
            event_count = 0  # Placeholder - implement actual count
            await email_service.send_event_submission_notification(
                hod_email=hod.email,
                hod_name=hod.name,
                department_name=department.name,
                academic_year=academic_year.year,
                principal_email=principal.email,
                principal_name=principal.name,
                event_count=event_count
            )

def send_in_app_notifications(
    db: Session, 
    department_id: int, 
    academic_year_id: int, 
    old_status: str, 
    new_status: str
):
    """Send appropriate in-app notifications based on status change"""
    
    # Get department and academic year info
    department = db.query(Department).filter(Department.id == department_id).first()
    academic_year = db.query(AcademicYear).filter(AcademicYear.id == academic_year_id).first()
    
    if not department or not academic_year:
        return
    
    # Get HoD and Principal users
    hod = db.query(User).filter(
        User.department_id == department_id,
        User.role == 'hod'
    ).first()
    
    principal = db.query(User).filter(User.role == 'principal').first()
    
    # Status change: draft -> submitted (HoD submits budget)
    if old_status == 'draft' and new_status == 'submitted':
        if hod and principal:
            notification_service.notify_budget_submission(
                db=db,
                hod_id=hod.id,
                principal_id=principal.id,
                department_name=department.name,
                academic_year=academic_year.year
            )
    
    # Status change: submitted -> approved (Principal approves budget)
    elif old_status == 'submitted' and new_status == 'approved':
        if hod:
            notification_service.notify_budget_approval(
                db=db,
                hod_id=hod.id,
                department_name=department.name,
                academic_year=academic_year.year,
                approved=True,
                remarks="Budget approved successfully! You can now plan individual events."
            )
    
    # Status change: approved -> events_submitted (HoD submits events)
    elif old_status == 'approved' and new_status == 'events_submitted':
        if hod and principal:
            # Count events for this department (you might need to implement this)
            event_count = 0  # Placeholder - implement actual count
            notification_service.notify_event_submission(
                db=db,
                hod_id=hod.id,
                principal_id=principal.id,
                department_name=department.name,
                academic_year=academic_year.year,
                event_count=event_count
            )
