# app/crud.py
from sqlalchemy.orm import Session
from app.models import ProgramType
from app.models import AcademicYear
from app.schemas import ProgramTypeCreate
from typing import Optional

def get_program_types(db: Session, department: Optional[str] = None):
    query = db.query(ProgramType)
    if department and department != "ALL":
        query = query.filter(
            (ProgramType.departments == "ALL") |
            (ProgramType.departments.like(f"%{department}%"))
        )
    return query.all()

def create_program_type(db: Session, data: ProgramTypeCreate):
    db_entry = ProgramType(**data.dict())
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

def update_program_type(db: Session, id: int, data: ProgramTypeCreate):
    entry = db.query(ProgramType).get(id)
    if entry:
        for field, value in data.dict().items():
            setattr(entry, field, value)
        db.commit()
        db.refresh(entry)
    return entry

def delete_program_type(db: Session, id: int):
    entry = db.query(ProgramType).get(id)
    if entry:
        db.delete(entry)
        db.commit()
    return entry

def get_academic_years(db: Session):
    return db.query(AcademicYear).order_by(AcademicYear.year.desc()).all()
