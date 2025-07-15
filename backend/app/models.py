# app/models.py

from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey, Float
from app.database import Base

class Department(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

class AcademicYear(Base):
    __tablename__ = "academic_years"
    id = Column(Integer, primary_key=True, index=True)
    year = Column(String, unique=True)
    is_enabled = Column(Boolean, default=False)
    deadline = Column(Date, nullable=True)

class ProgramCount(Base):
    __tablename__ = "program_counts"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"))
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"))
    program_type = Column(String)
    sub_program_type = Column(String, nullable=True)
    activity_category = Column(String)
    budget_mode = Column(String)
    count = Column(Integer, default=0)
    total_budget = Column(Integer, default=0)
    remarks = Column(String, nullable=True)

class ProgramType(Base):
    __tablename__ = "program_types"

    id = Column(Integer, primary_key=True, index=True)
    program_type = Column(String, nullable=False)
    sub_program_type = Column(String, nullable=True)
    activity_category = Column(String, nullable=False)
    departments = Column(String, nullable=False)  # e.g., "ALL" or "CSE,EEE"
    budget_mode = Column(String, nullable=False)  # "Fixed" or "Variable"
    budget_per_event = Column(Float, nullable=True)  # Can be null if variable

