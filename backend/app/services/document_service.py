# backend/app/services/document_service.py
from sqlalchemy.orm import Session
from app.models import Document, User, Event, Department, AcademicYear
from datetime import datetime
import os

def save_event_document(db: Session, event_id: int, doc_type: str, filename: str, file_path: str, 
                       file_size: int, mime_type: str = None, uploaded_by: int = None):
    """
    Save or update an event document using the advanced schema with versioning support.
    
    Args:
        db: Database session
        event_id: ID of the event
        doc_type: 'report' or 'zip' (will be mapped to document_type)
        filename: Name of the uploaded file
        file_path: Path where file is stored
        file_size: Size of the file in bytes
        mime_type: MIME type of the file
        uploaded_by: ID of the user uploading the document
    """
    
    # Map doc_type to document_type for database storage
    type_mapping = {
        'report': 'complete_report',
        'zip': 'supporting_documents'
    }
    document_type = type_mapping.get(doc_type, 'other')
    
    # Get event details for required fields
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise ValueError(f"Event with ID {event_id} not found")
    
    # Get department and academic year from event or use defaults
    department_id = getattr(event, 'department_id', 1)  # Default to first department
    academic_year_id = getattr(event, 'academic_year_id', 1)  # Default to current academic year
    
    # Check for existing latest version of this document type for this event
    existing_doc = db.query(Document).filter(
        Document.event_id == event_id,
        Document.document_type == document_type,
        Document.is_latest_version == True
    ).first()
    
    if existing_doc:
        # Handle re-upload: mark existing as not latest and create new version
        if existing_doc.status == 'rejected':
            # Mark old version as not latest
            existing_doc.is_latest_version = False
            db.commit()
            
            # Create new version
            new_version = existing_doc.version + 1
            parent_document_id = existing_doc.parent_document_id or existing_doc.id
        else:
            # If document is pending or approved, replace it
            existing_doc.is_latest_version = False
            db.commit()
            new_version = existing_doc.version + 1
            parent_document_id = existing_doc.parent_document_id or existing_doc.id
    else:
        new_version = 1
        parent_document_id = None
    
    # Create new document record
    new_document = Document(
        filename=filename,
        original_filename=filename,
        file_path=file_path,
        file_size=file_size,
        mime_type=mime_type or 'application/octet-stream',
        document_type=document_type,
        title=f"{event.title} - {doc_type.title()}",
        description=f"{doc_type.title()} document for event: {event.title}",
        department_id=department_id,
        academic_year_id=academic_year_id,
        event_id=event_id,
        status='pending',
        uploaded_by=uploaded_by or 1,  # Default to admin user if not specified
        uploaded_at=datetime.now(),
        version=new_version,
        parent_document_id=parent_document_id,
        is_latest_version=True,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    
    db.add(new_document)
    db.commit()
    db.refresh(new_document)
    
    return new_document

def get_event_documents(db: Session, event_id: int = None):
    """
    Get event documents, optionally filtered by event_id.
    Only returns latest versions of documents.
    """
    query = db.query(Document).filter(
        Document.event_id.isnot(None),
        Document.is_latest_version == True,
        Document.document_type.in_(['complete_report', 'supporting_documents'])
    )
    
    if event_id:
        query = query.filter(Document.event_id == event_id)
    
    return query.order_by(Document.uploaded_at.desc()).all()

def approve_document(db: Session, document_id: int, approved_by: int):
    """Approve a document"""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise ValueError(f"Document with ID {document_id} not found")
    
    document.status = 'approved'
    document.approved_by = approved_by
    document.approved_at = datetime.now()
    document.rejection_reason = None
    document.updated_at = datetime.now()
    
    db.commit()
    db.refresh(document)
    return document

def reject_document(db: Session, document_id: int, rejected_by: int, rejection_reason: str):
    """Reject a document with reason"""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise ValueError(f"Document with ID {document_id} not found")
    
    document.status = 'rejected'
    document.approved_by = rejected_by
    document.approved_at = datetime.now()
    document.rejected_at = datetime.now()
    document.rejection_reason = rejection_reason
    document.updated_at = datetime.now()
    
    db.commit()
    db.refresh(document)
    return document
