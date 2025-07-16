# app/models.py

from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base

from app.database import Base

# Add this new model
class PrincipalRemark(Base):
    __tablename__ = "principal_remarks"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, nullable=False)
    academic_year_id = Column(Integer, nullable=False)
    remarks = Column(String, nullable=True)



Base = declarative_base()

# -----------------------------
# Department
# -----------------------------
class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)

# -----------------------------
# Academic Year
# -----------------------------
class AcademicYear(Base):
    __tablename__ = "academic_years"

    id = Column(Integer, primary_key=True, index=True)
    year = Column(String, unique=True, nullable=False)

# -----------------------------
# Program Types
# -----------------------------
class ProgramType(Base):
    __tablename__ = "program_types"

    id = Column(Integer, primary_key=True, index=True)
    program_type = Column(String, nullable=False)
    sub_program_type = Column(String, nullable=True)
    activity_category = Column(String, nullable=False)
    departments = Column(String, nullable=False)  # "ALL" or comma-separated
    budget_mode = Column(String, nullable=False)  # "Fixed" or "Variable"
    budget_per_event = Column(Float, nullable=True)

# -----------------------------
# Program Counts
# -----------------------------
class ProgramCount(Base):
    __tablename__ = "program_counts"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"))
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"))
    program_type = Column(String, nullable=False)
    sub_program_type = Column(String, nullable=True)
    activity_category = Column(String, nullable=False)
    budget_mode = Column(String, nullable=False)
    count = Column(Integer, nullable=False)
    total_budget = Column(Float, nullable=False)
    remarks = Column(Text, nullable=True)

# -----------------------------
# Principal Remarks
# -----------------------------
class PrincipalRemark(Base):
    __tablename__ = "principal_remarks"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"))
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"))
    remarks = Column(Text, nullable=False)
