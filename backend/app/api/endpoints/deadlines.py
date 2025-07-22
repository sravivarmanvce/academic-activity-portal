# app/api/endpoints/deadlines.py

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app import schemas, crud, models
from app.database import get_db
from typing import List, Optional

router = APIRouter()

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
