# app/crud.py
from sqlalchemy.orm import Session
from . import models
from app.models import ProgramType
from app.models import ProgramCount
from app.models import AcademicYear
from app.models import ModuleDeadline
from app.schemas import ModuleDeadlineOut
from app.schemas import ProgramCountCreate
from app.schemas import ProgramTypeCreate
from app.models import PrincipalRemark
from app.schemas import PrincipalRemarkCreate
from app.models import HodRemarks
from app.schemas import HodRemarksCreate
from typing import Optional
import datetime


def get_enabled_academic_years(db: Session):
    return db.query(models.AcademicYear).filter_by(is_enabled=True).all()

def get_module_deadline(db: Session, academic_year_id: int, module: str):
    return (
        db.query(ModuleDeadline)
        .filter(
            ModuleDeadline.academic_year_id == academic_year_id,
            ModuleDeadline.module == module
        )
        .first()
    )

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
        existing = PrincipalRemark(**data.dict())
        db.add(existing)
    db.commit()
    db.refresh(existing)
    return existing

def get_hod_remark(db: Session, department_id: int, academic_year_id: int):
    return db.query(HodRemarks).filter_by(
        department_id=department_id,
        academic_year_id=academic_year_id
    ).first()

def save_or_update_hod_remark(db: Session, data: HodRemarksCreate):
    existing = get_hod_remark(db, data.department_id, data.academic_year_id)
    if existing:
        existing.remarks = data.remarks
    else:
        existing = HodRemarks(**data.dict())
        db.add(existing)
    db.commit()
    db.refresh(existing)
    return existing

def get_module_deadline(db: Session, academic_year_id: int, module: str):
    return db.query(models.ModuleDeadline).filter_by(
        academic_year_id=academic_year_id,
        module=module
    ).first()


def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()