# app/api/endpoints/program_counts.py

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import ProgramCount
from app.models import Department
from app.models import WorkflowStatus
from app.schemas import ProgramCountOut, ProgramCountBatch, PrincipalRemarksInput

router = APIRouter()

@router.get("/program-counts", response_model=List[ProgramCountOut])
def get_program_counts(
    department_id: Optional[int] = Query(None),
    academic_year_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(ProgramCount)

    if department_id is not None:
        query = query.filter(ProgramCount.department_id == department_id)
    if academic_year_id is not None:
        query = query.filter(ProgramCount.academic_year_id == academic_year_id)

    results = query.all()
    if not results:
        raise HTTPException(status_code=404, detail="No matching program counts found")
    return results

@router.post("/program-counts", response_model=List[ProgramCountOut])
def create_or_update_program_counts(payload: ProgramCountBatch, db: Session = Depends(get_db)):
    created = []

    for entry in payload.entries:
        existing = db.query(ProgramCount).filter_by(
            department_id=entry.department_id,
            academic_year_id=entry.academic_year_id,
            program_type=entry.program_type,
            sub_program_type=entry.sub_program_type
        ).first()

        if existing:
            existing.count = entry.count
            existing.total_budget = entry.total_budget
            existing.remarks = entry.remarks
            db.add(existing)
            created.append(existing)
        else:
            new_entry = ProgramCount(**entry.dict())
            db.add(new_entry)
            created.append(new_entry)

    db.commit()
    return created

@router.post("/program-counts/remarks")
def update_principal_remarks(input: PrincipalRemarksInput, db: Session = Depends(get_db)):
    # Update all rows of department+academic year with the same principal remarks
    updated = db.query(ProgramCount).filter_by(
        department_id=input.department_id,
        academic_year_id=input.academic_year_id
    ).all()

    if not updated:
        raise HTTPException(status_code=404, detail="No entries found to update remarks")

    for row in updated:
        row.principal_remarks = input.principal_remarks
        db.add(row)

    db.commit()
    return {"message": "Remarks updated successfully"}

@router.get("/program-counts/status-summary")
def get_program_counts_status_summary(
    academic_year_id: int = Query(...),
    db: Session = Depends(get_db)
):
    # Get all departments
    departments = db.query(Department).all()
    status_summary = {}
    
    for dept in departments:
        # Get all program count entries for this department and academic year
        entries = db.query(ProgramCount).filter_by(
            department_id=dept.id,
            academic_year_id=academic_year_id
        ).all()
        
        # Determine basic submission status
        basic_status = "Submitted" if entries else "Not Submitted"
        
        # Get workflow status from workflow_status table
        workflow_entry = db.query(WorkflowStatus).filter_by(
            department_id=dept.id,
            academic_year_id=academic_year_id
        ).first()
        
        workflow_status = workflow_entry.status if workflow_entry else 'draft'
        last_updated = workflow_entry.updated_at if workflow_entry else None
        
        # Calculate grand total budget
        grand_total_budget = sum(entry.total_budget or 0 for entry in entries)
        
        status_summary[dept.id] = {
            "status": basic_status,
            "workflow_status": workflow_status,
            "last_updated": last_updated,
            "grand_total_budget": grand_total_budget
        }
    
    return status_summary
