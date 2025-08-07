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

# -----------------------------
# Events
# -----------------------------
class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    event_date = Column(DateTime, nullable=False)
    budget_amount = Column(Float, nullable=False)
    coordinator_name = Column(String(100), nullable=True)
    coordinator_contact = Column(String(100), nullable=True)
    
    # Foreign Keys
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"), nullable=False)
    program_type_id = Column(Integer, ForeignKey("program_types.id"), nullable=False)
    
    # Status and Audit Fields
    event_status = Column(String(20), nullable=False, default='planned')  # 'planned', 'ongoing', 'completed', 'cancelled'
    created_at = Column(DateTime, nullable=False, default=datetime.now)
    updated_at = Column(DateTime, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relationships
    department = relationship("Department")
    academic_year = relationship("AcademicYear")
    program_type = relationship("ProgramType")
    creator = relationship("User", foreign_keys=[created_by])
    updater = relationship("User", foreign_keys=[updated_by])

# -----------------------------
# Notifications
# -----------------------------
class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), nullable=False)  # 'budget_submission', 'approval', 'deadline', 'reminder', etc.
    read = Column(Boolean, default=False)  # Match your column name 'read' instead of 'is_read'
    created_at = Column(DateTime, nullable=False, default=datetime.now)
    
    # Relationships
    user = relationship("User")

# -----------------------------
# Document Management
# -----------------------------
from enum import Enum

class DocumentType(str, Enum):
    EVENT_PROPOSAL = "event_proposal"
    BUDGET_DOCUMENT = "budget_document"
    RECEIPT = "receipt"
    REPORT = "report"
    APPROVAL_LETTER = "approval_letter"
    CERTIFICATE = "certificate"
    INVOICE = "invoice"
    OTHER = "other"

class DocumentStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    ARCHIVED = "archived"

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)  # in bytes
    mime_type = Column(String(100), nullable=False)
    
    # Classification
    document_type = Column(String(50), nullable=False)  # DocumentType enum
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Associations
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"), nullable=False)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=True)  # Optional: link to specific event
    
    # Status and Approval
    status = Column(String(20), nullable=False, default="pending")
    is_public = Column(Boolean, default=False)  # Can other departments see this?
    
    # Audit Fields
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    uploaded_at = Column(DateTime, nullable=False, default=datetime.now)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    
    # Version Control
    version = Column(Integer, default=1)
    parent_document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)  # For versioning
    
    # Metadata
    tags = Column(Text, nullable=True)  # JSON string of tags
    expiry_date = Column(DateTime, nullable=True)  # For certificates, approvals, etc.
    
    # Relationships
    department = relationship("Department")
    academic_year = relationship("AcademicYear")
    event = relationship("Event")
    uploader = relationship("User", foreign_keys=[uploaded_by])
    approver = relationship("User", foreign_keys=[approved_by])
    parent_document = relationship("Document", remote_side=[id])

class DocumentAccess(Base):
    __tablename__ = "document_access"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    access_type = Column(String(20), nullable=False)  # 'view', 'edit', 'approve', 'download'
    granted_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    granted_at = Column(DateTime, nullable=False, default=datetime.now)
    expires_at = Column(DateTime, nullable=True)
    
    # Relationships
    document = relationship("Document")
    user = relationship("User", foreign_keys=[user_id])
    granter = relationship("User", foreign_keys=[granted_by])

class DocumentFolder(Base):
    __tablename__ = "document_folders"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    parent_folder_id = Column(Integer, ForeignKey("document_folders.id"), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id"), nullable=False)
    
    # Access Control
    is_public = Column(Boolean, default=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.now)
    
    # Relationships
    parent_folder = relationship("DocumentFolder", remote_side=[id])
    department = relationship("Department")
    academic_year = relationship("AcademicYear")
    creator = relationship("User")

