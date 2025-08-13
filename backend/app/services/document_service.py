# backend/app/services/document_service.py
from sqlalchemy.orm import Session
from app.models import Document, User, Event, Department, AcademicYear, WorkflowStatus
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
    """Approve a document and update event status if all events in academic year have approved documents"""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise ValueError(f"Document with ID {document_id} not found")
    
    document.status = 'approved'
    document.approved_by = approved_by
    document.approved_at = datetime.now()
    document.rejection_reason = None
    document.updated_at = datetime.now()
    
    # Check if all events in the academic year have approved documents
    if document.event_id:
        event = db.query(Event).filter(Event.id == document.event_id).first()
        if event and event.academic_year_id:
            # Get all events in the same academic year
            all_academic_year_events = db.query(Event).filter(
                Event.academic_year_id == event.academic_year_id
            ).all()
            
            all_events_completed = True
            
            for year_event in all_academic_year_events:
                # Get all documents for this event (excluding deleted ones)
                event_docs = db.query(Document).filter(
                    Document.event_id == year_event.id,
                    Document.status != 'deleted',
                    Document.is_latest_version == True
                ).all()
                
                # Check for required document types - BOTH are required for completion
                required_types = ['complete_report', 'supporting_documents']
                event_has_all_required = True
                
                # Each event MUST have both document types with approved status
                for doc_type in required_types:
                    type_docs = [doc for doc in event_docs if doc.document_type == doc_type]
                    
                    # Check if this document type exists AND is approved
                    has_approved_doc_of_type = any(doc.status == 'approved' for doc in type_docs)
                    
                    if not has_approved_doc_of_type:
                        event_has_all_required = False
                        print(f"   ❌ Event {year_event.id} ({year_event.title}) missing approved {doc_type}")
                        break
                
                if not event_has_all_required:
                    all_events_completed = False
                    break
            
            # Update all events in the academic year to 'completed' if all are ready
            if all_events_completed:
                for year_event in all_academic_year_events:
                    if year_event.event_status != 'completed':
                        year_event.event_status = 'completed'
                        print(f"✅ Event {year_event.id} ({year_event.title}) status updated to 'completed' - all academic year events have approved documents")
                
                # Also update the workflow status to 'completed' for this department and academic year
                workflow_status = db.query(WorkflowStatus).filter(
                    WorkflowStatus.department_id == event.department_id,
                    WorkflowStatus.academic_year_id == event.academic_year_id
                ).first()
                
                if workflow_status and workflow_status.status != 'completed':
                    workflow_status.status = 'completed'
                    workflow_status.updated_at = datetime.now()
                    print(f"🏆 Workflow status updated to 'completed' for department {event.department_id}, academic year {event.academic_year_id} - all events have approved documents")
                elif not workflow_status:
                    # Create workflow status if it doesn't exist
                    workflow_status = WorkflowStatus(
                        department_id=event.department_id,
                        academic_year_id=event.academic_year_id,
                        status='completed',
                        updated_at=datetime.now()
                    )
                    db.add(workflow_status)
                    print(f"🏆 Workflow status created as 'completed' for department {event.department_id}, academic year {event.academic_year_id} - all events have approved documents")
    
    db.commit()
    db.refresh(document)
    return document

def reject_document(db: Session, document_id: int, rejected_by: int, rejection_reason: str):
    """Reject a document with reason and revert all events in academic year to planned if needed"""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise ValueError(f"Document with ID {document_id} not found")
    
    document.status = 'rejected'
    document.approved_by = rejected_by
    document.approved_at = datetime.now()
    document.rejected_at = datetime.now()
    document.rejection_reason = rejection_reason
    document.updated_at = datetime.now()
    
    # If this document belongs to an event, revert all events in academic year to planned
    if document.event_id:
        event = db.query(Event).filter(Event.id == document.event_id).first()
        if event and event.academic_year_id:
            # Get all events in the same academic year that are completed
            completed_events = db.query(Event).filter(
                Event.academic_year_id == event.academic_year_id,
                Event.event_status == 'completed'
            ).all()
            
            # Revert all completed events to planned
            for year_event in completed_events:
                year_event.event_status = 'planned'
                print(f"⚠️ Event {year_event.id} ({year_event.title}) status reverted to 'planned' - document rejected in academic year")
            
            # Also revert the workflow status if it was 'completed'
            workflow_status = db.query(WorkflowStatus).filter(
                WorkflowStatus.department_id == event.department_id,
                WorkflowStatus.academic_year_id == event.academic_year_id
            ).first()
            
            if workflow_status and workflow_status.status == 'completed':
                workflow_status.status = 'events_planned'  # Revert to previous state
                workflow_status.updated_at = datetime.now()
                print(f"⚠️ Workflow status reverted to 'events_planned' for department {event.department_id}, academic year {event.academic_year_id} - document rejected")
    
    db.commit()
    db.refresh(document)
    return document
