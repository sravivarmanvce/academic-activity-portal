from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import SessionLocal

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", response_model=list[schemas.AcademicYearOut])
def read_academic_years(db: Session = Depends(get_db)):
    return db.query(models.AcademicYear).all()

@router.post("/", response_model=schemas.AcademicYearOut)
def create_academic_year(year: schemas.AcademicYearCreate, db: Session = Depends(get_db)):
    db_year = db.query(models.AcademicYear).filter_by(name=year.name).first()
    if db_year:
        raise HTTPException(status_code=400, detail="Academic year already exists")
    new_year = models.AcademicYear(name=year.name)
    db.add(new_year)
    db.commit()
    db.refresh(new_year)
    return new_year
