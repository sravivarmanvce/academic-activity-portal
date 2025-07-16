# app/crud.py
from sqlalchemy.orm import Session
from app.models import ProgramType
from app.models import ProgramCount
from app.models import AcademicYear
from app.schemas import ProgramCountCreate
from app.schemas import ProgramTypeCreate
from app.models import PrincipalRemark
from app.schemas import PrincipalRemarkCreate
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


def get_remark(db: Session, department_id: int, academic_year_id: int):
    return db.query(PrincipalRemark).filter_by(
        department_id=department_id,
        academic_year_id=academic_year_id
    ).first()

def save_or_update_remark(db: Session, data: PrincipalRemarkCreate):
    existing = get_remark(db, data.department_id, data.academic_year_id)
    if existing:
        existing.remarks = data.remarks
        db.add(existing)
    else:
        new_entry = PrincipalRemark(**data.dict())
        db.add(new_entry)
    db.commit()
    return get_remark(db, data.department_id, data.academic_year_id)

