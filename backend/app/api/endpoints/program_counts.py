# app/api/endpoints/program_counts.py

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import ProgramCount
from app.schemas import ProgramCountOut, ProgramCountBatch

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
def create_program_counts(batch: ProgramCountBatch, db: Session = Depends(get_db)):
    created = []

    for entry in batch.entries:
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
