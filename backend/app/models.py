from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

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


    academic_year_id = Column(Integer, ForeignKey("academic_years.id"))
    department_id = Column(Integer, ForeignKey("departments.id"))
    activity_category = Column(String)
    program_type = Column(String)
    sub_program_type = Column(String, nullable=True)
    budget_mode = Column(String)
    count = Column(Integer, default=0)
    total_budget = Column(Integer, default=0)
    remarks = Column(String, nullable=True)
