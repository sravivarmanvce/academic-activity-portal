# app/api/endpoints/deadlines.py

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app import schemas, crud, models
from app.database import get_db
from typing import List, Optional

router = APIRouter()


@router.get("/module-deadlines/{academic_year_id}", response_model=List[schemas.ModuleDeadlineOut])
def get_all_deadlines_for_year(
    academic_year_id: int,
    db: Session = Depends(get_db)
):
    deadlines = db.query(models.ModuleDeadline).filter_by(academic_year_id=academic_year_id).all()
    return deadlines



@router.get("/module-deadlines", response_model=schemas.ModuleDeadlineOut)
def get_module_deadline(
    academic_year_id: int,
    module_name: str,
    db: Session = Depends(get_db)
):
    deadline = crud.get_module_deadline(db, academic_year_id, module_name)
    if not deadline:
        raise HTTPException(status_code=404, detail="Deadline not found")
    return deadline

@router.post("/module-deadlines", response_model=schemas.ModuleDeadlineOut)
def create_or_update_module_deadline(
    data: schemas.ModuleDeadlineIn,
    db: Session = Depends(get_db)
):
    existing = crud.get_module_deadline(db, data.academic_year_id, data.module)
    
    if existing:
        existing.deadline = data.deadline
    else:
        existing = models.ModuleDeadline(
            academic_year_id=data.academic_year_id,
            module=data.module,
            deadline=data.deadline
        )
        db.add(existing)

    db.commit()
    db.refresh(existing)
    return existing