# app/models/documents.py - Document Management Models

from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, BigInteger
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
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
    file_size = Column(BigInteger, nullable=False)  # in bytes
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
    status = Column(String(20), nullable=False, default=DocumentStatus.PENDING)
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

class DocumentComment(Base):
    __tablename__ = "document_comments"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    comment = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=False)  # Internal comments vs public feedback
    created_at = Column(DateTime, nullable=False, default=datetime.now)
    
    # Relationships
    document = relationship("Document")
    user = relationship("User")

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

class DocumentFolderItem(Base):
    __tablename__ = "document_folder_items"

    id = Column(Integer, primary_key=True, index=True)
    folder_id = Column(Integer, ForeignKey("document_folders.id"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    added_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    added_at = Column(DateTime, nullable=False, default=datetime.now)
    
    # Relationships
    folder = relationship("DocumentFolder")
    document = relationship("Document")
    added_by_user = relationship("User")
