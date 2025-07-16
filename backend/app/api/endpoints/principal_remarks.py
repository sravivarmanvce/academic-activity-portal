# app/api/endpoints/principal_remarks.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import PrincipalRemarkCreate, PrincipalRemarkOut
from app import crud

router = APIRouter()

@router.get("/principal-remarks", response_model=PrincipalRemarkOut)
def get_principal_remark(department_id: int, academic_year_id: int, db: Session = Depends(get_db)):
    remark = crud.get_remark(db, department_id, academic_year_id)
    if not remark:
        raise HTTPException(status_code=404, detail="Remark not found")
    return remark

@router.post("/principal-remarks", response_model=PrincipalRemarkOut)
def save_principal_remark(data: PrincipalRemarkCreate, db: Session = Depends(get_db)):
    return crud.save_or_update_remark(db, data)
