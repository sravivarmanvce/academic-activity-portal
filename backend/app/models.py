# app/models.py

from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()  

# -----------------------------
# User
# -----------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    role = Column(String(20), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)

    department = relationship("Department", back_populates="users")

# -----------------------------
# Department
# -----------------------------
class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)  # short name of department
    full_name = Column(String, nullable=False)  # full name of department

    users = relationship("User", back_populates="department") 

# -----------------------------
# Academic Year
# -----------------------------
class AcademicYear(Base):
    __tablename__ = "academic_years"

    id = Column(Integer, primary_key=True, index=True)
    year = Column(String, unique=True, nullable=False)
    is_enabled = Column(Boolean, default=True)

# ----------------------------- 
# Module Deadlines
# -----------------------------

class ModuleDeadline(Base):
    __tablename__ = "module_deadlines"

    id = Column(Integer, primary_key=True, index=True)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"))
    module = Column(String, index=True)
    deadline = Column(DateTime)

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
# Workflow Status
# -----------------------------
class WorkflowStatus(Base):
    __tablename__ = "workflow_status"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"), nullable=False)
    status = Column(String(20), nullable=False, default='draft')  # 'draft', 'submitted', 'approved', 'events_planned', 'completed'
    updated_at = Column(DateTime, nullable=True)

# -----------------------------
# Deadline Override
# -----------------------------
class DeadlineOverride(Base):
    __tablename__ = "deadline_overrides"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"), nullable=False)
    module_name = Column(String(50), nullable=False)  # 'program_entry', etc.
    enabled_by_principal = Column(Boolean, default=True)
    reason = Column(Text, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    duration_hours = Column(Integer, default=24)
    created_at = Column(DateTime, nullable=False, default=datetime.now)

# -----------------------------
# Principal Remarks
# -----------------------------
class PrincipalRemark(Base):
    __tablename__ = "principal_remarks"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"))
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"))
    remarks = Column(Text, nullable=False)

# -----------------------------
# HoD Remarks
# -----------------------------
class HodRemarks(Base):
    __tablename__ = "hod_remarks"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"))
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"))
    remarks = Column(Text)

