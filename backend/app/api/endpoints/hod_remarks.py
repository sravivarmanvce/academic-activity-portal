# app/api/endpoints/hod_remarks.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import HodRemarksCreate, HodRemarksOut
from app import crud

router = APIRouter()

@router.get("/hod-remarks", response_model=HodRemarksOut)
def get_hod_remark(department_id: int, academic_year_id: int, db: Session = Depends(get_db)):
    remark = crud.get_hod_remark(db, department_id, academic_year_id)
    if not remark:
        raise HTTPException(status_code=404, detail="Remark not found")
    return remark

@router.post("/hod-remarks", response_model=HodRemarksOut)
def save_hod_remark(data: HodRemarksCreate, db: Session = Depends(get_db)):
    return crud.save_or_update_hod_remark(db, data)

