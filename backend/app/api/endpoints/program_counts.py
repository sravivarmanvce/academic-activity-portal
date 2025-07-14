# app/api/endpoints/program_counts.py

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import ProgramCount
from app.schemas import ProgramCountOut

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
