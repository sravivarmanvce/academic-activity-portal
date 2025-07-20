# app/api/endpoints/academic_years.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ...database import SessionLocal
from ... import crud, schemas

router = APIRouter(prefix="/academic-years", tags=["Academic Years"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", response_model=list[schemas.AcademicYearOut])
def list_years(db: Session = Depends(get_db)):
    return crud.get_academic_years(db)

@router.get("/enabled", response_model=list[schemas.AcademicYearOut])
def get_enabled_years(db: Session = Depends(get_db)):
    return crud.get_enabled_academic_years(db)

@router.get("/academic-years/{year_id}", response_model=schemas.AcademicYearOut)
def get_year(year_id: int, db: Session = Depends(get_db)):
    year = db.query(models.AcademicYear).filter(models.AcademicYear.id == year_id).first()
    if not year:
        raise HTTPException(status_code=404, detail="Year not found")
    return year
