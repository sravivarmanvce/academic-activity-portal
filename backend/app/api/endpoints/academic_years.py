from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ...database import SessionLocal
from ... import crud, schemas

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/academic-years", response_model=list[schemas.AcademicYearOut])
def list_years(db: Session = Depends(get_db)):
    return crud.get_academic_years(db)
