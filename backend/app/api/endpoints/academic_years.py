# app/api/endpoints/academic_years.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import schemas, crud, models
from app.models import ModuleDeadline

router = APIRouter(prefix="/academic-years", tags=["Academic Years"])

@router.get("/", response_model=list[schemas.AcademicYearOut])
def list_years(db: Session = Depends(get_db)):
    return crud.get_academic_years(db)

@router.get("/enabled", response_model=list[schemas.AcademicYearOut])
def get_enabled_years(db: Session = Depends(get_db)):
    return crud.get_enabled_academic_years(db)

@router.get("/{year_id}", response_model=schemas.AcademicYearOut)
def get_year(year_id: int, db: Session = Depends(get_db)):
    year = db.query(models.AcademicYear).filter(models.AcademicYear.id == year_id).first()
    if not year:
        raise HTTPException(status_code=404, detail="Year not found")
    return year

@router.post("/", response_model=schemas.AcademicYearOut)
def create_academic_year(data: schemas.AcademicYearCreate, db: Session = Depends(get_db)):
    existing = db.query(models.AcademicYear).filter_by(year=data.year).first()
    if existing:
        raise HTTPException(status_code=400, detail="Academic year already exists")

    year = models.AcademicYear(
        year=data.year,
        is_enabled=data.is_enabled
    )
    db.add(year)
    db.commit()
    db.refresh(year)
    return year

@router.patch("/{year_id}/toggle", response_model=schemas.AcademicYearOut)
def toggle_academic_year(year_id: int, db: Session = Depends(get_db)):
    year = db.query(models.AcademicYear).filter(models.AcademicYear.id == year_id).first()
    if not year:
        raise HTTPException(status_code=404, detail="Academic year not found")
    
    year.is_enabled = not year.is_enabled
    db.commit()
    db.refresh(year)
    return year

@router.delete("/{year_id}")
def delete_academic_year(year_id: int, db: Session = Depends(get_db)):
    # Check if any module deadlines exist for the year
    deadline_exists = db.query(ModuleDeadline).filter_by(academic_year_id=year_id).first()
    if deadline_exists:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete year when the modules have deadlines."
        )

    # Safe to delete
    year = db.query(models.AcademicYear).filter_by(id=year_id).first()
    if not year:
        raise HTTPException(status_code=404, detail="Academic year not found.")

    db.delete(year)
    db.commit()
    return {"message": "Academic year deleted successfully"}
