from sqlalchemy.orm import Session
from . import models, schemas

def get_departments(db: Session):
    return db.query(models.Department).order_by(models.Department.id).all()

def get_academic_years(db: Session):
    return db.query(models.AcademicYear).order_by(models.AcademicYear.id).all()

def get_program_counts(db: Session, department_id: int, academic_year_id: int):
    return db.query(models.ProgramCount).filter_by(
        department_id=department_id,
        academic_year_id=academic_year_id
    ).all()

def save_program_counts(db: Session, entries: list[schemas.ProgramCountIn]):
    for entry in entries:
        record = db.query(models.ProgramCount).filter_by(
            department_id=entry.department_id,
            academic_year_id=entry.academic_year_id,
            program_type=entry.program_type,
            sub_program_type=entry.sub_program_type,
            activity_category=entry.activity_category,
            budget_mode=entry.budget_mode
        ).first()

        if record:
            record.count = entry.count
            record.total_budget = entry.total_budget
            record.remarks = entry.remarks
        else:
            db.add(models.ProgramCount(**entry.dict()))
    db.commit()
