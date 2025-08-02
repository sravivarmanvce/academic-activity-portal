# app/api/endpoints/workflow_status.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import WorkflowStatus
from app.schemas import WorkflowStatusResponse, WorkflowStatusUpdate
from datetime import datetime

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
def update_workflow_status(
    update_data: WorkflowStatusUpdate,
    db: Session = Depends(get_db)
):
    """Update the workflow status for a department and academic year"""
    status = db.query(WorkflowStatus).filter(
        WorkflowStatus.department_id == update_data.department_id,
        WorkflowStatus.academic_year_id == update_data.academic_year_id
    ).first()
    
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
    
    return {"message": f"Status updated to {update_data.status}", "status": status.status}
