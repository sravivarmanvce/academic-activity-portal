# app/api/endpoints/documents.py

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.dependencies import get_current_user_role, get_current_user_id, get_current_department_id
from app.services.document_service import document_service
from app.models import Document, DocumentFolder
from pydantic import BaseModel
from datetime import datetime
import json

router = APIRouter()

# Pydantic models for API responses
class DocumentResponse(BaseModel):
    id: int
    filename: str
    original_filename: str
    file_size: int
    mime_type: str
    document_type: str
    title: str
    description: Optional[str]
    status: str
    is_public: bool
    uploaded_at: datetime
    uploaded_by: int
    uploader_name: str
    approved_by: Optional[int]
    approved_at: Optional[datetime]
    department_name: str
    event_id: Optional[int]
    tags: List[str]

class FolderResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    parent_folder_id: Optional[int]
    is_public: bool
    created_at: datetime
    created_by: int
    creator_name: str

@router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    document_type: str = Form(...),
    description: Optional[str] = Form(None),
    event_id: Optional[int] = Form(None),
    tags: Optional[str] = Form(None),  # JSON string
    is_public: bool = Form(False),
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
    current_dept_id: int = Depends(get_current_department_id)
):
    """Upload a new document"""
    
    # Parse tags if provided
    parsed_tags = json.loads(tags) if tags else None
    
    # Get current academic year (you might want to make this configurable)
    from app.models import AcademicYear
    academic_year = db.query(AcademicYear).filter(AcademicYear.is_enabled == True).first()
    if not academic_year:
        raise HTTPException(status_code=400, detail="No active academic year")
    
    try:
        document = await document_service.upload_document(
            file=file,
            title=title,
            document_type=document_type,
            department_id=current_dept_id,
            academic_year_id=academic_year.id,
            uploaded_by=current_user_id,
            description=description,
            event_id=event_id,
            tags=parsed_tags,
            db=db
        )
        
        # Set public status
        if is_public:
            document.is_public = is_public
            db.commit()
        
        return {
            "message": "Document uploaded successfully",
            "document_id": document.id,
            "filename": document.original_filename
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/documents", response_model=List[DocumentResponse])
async def get_documents(
    document_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    event_id: Optional[int] = Query(None),
    my_documents: bool = Query(False),
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
    current_user_role: str = Depends(get_current_user_role),
    current_dept_id: int = Depends(get_current_department_id)
):
    """Get documents with filters"""
    
    # Get current academic year
    from app.models import AcademicYear
    academic_year = db.query(AcademicYear).filter(AcademicYear.is_enabled == True).first()
    if not academic_year:
        raise HTTPException(status_code=404, detail="No active academic year")
    
    # Filter parameters
    dept_filter = current_dept_id if current_user_role != 'principal' else None
    user_filter = current_user_id if my_documents else None
    
    documents = document_service.get_documents(
        department_id=dept_filter,
        academic_year_id=academic_year.id,
        document_type=document_type,
        event_id=event_id,
        status=status,
        user_id=user_filter,
        db=db
    )
    
    # Convert to response format
    response = []
    for doc in documents:
        # Parse tags
        tags = json.loads(doc.tags) if doc.tags else []
        
        response.append(DocumentResponse(
            id=doc.id,
            filename=doc.filename,
            original_filename=doc.original_filename,
            file_size=doc.file_size,
            mime_type=doc.mime_type,
            document_type=doc.document_type,
            title=doc.title,
            description=doc.description,
            status=doc.status,
            is_public=doc.is_public,
            uploaded_at=doc.uploaded_at,
            uploaded_by=doc.uploaded_by,
            uploader_name=doc.uploader.name,
            approved_by=doc.approved_by,
            approved_at=doc.approved_at,
            department_name=doc.department.name,
            event_id=doc.event_id,
            tags=tags
        ))
    
    return response

@router.get("/documents/{document_id}")
async def get_document_details(
    document_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Get document details"""
    
    document = document_service.get_document_by_id(document_id, db)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Check access
    if not document_service.can_access_document(document, current_user_id, "view", db):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Parse tags
    tags = json.loads(document.tags) if document.tags else []
    
    return DocumentResponse(
        id=document.id,
        filename=document.filename,
        original_filename=document.original_filename,
        file_size=document.file_size,
        mime_type=document.mime_type,
        document_type=document.document_type,
        title=document.title,
        description=document.description,
        status=document.status,
        is_public=document.is_public,
        uploaded_at=document.uploaded_at,
        uploaded_by=document.uploaded_by,
        uploader_name=document.uploader.name,
        approved_by=document.approved_by,
        approved_at=document.approved_at,
        department_name=document.department.name,
        event_id=document.event_id,
        tags=tags
    )

@router.get("/documents/{document_id}/download")
async def download_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Download document file"""
    
    try:
        document, file_path = document_service.download_document(document_id, current_user_id, db)
        
        return FileResponse(
            path=str(file_path),
            filename=document.original_filename,
            media_type=document.mime_type
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/documents/{document_id}/approve")
async def approve_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
    current_user_role: str = Depends(get_current_user_role)
):
    """Approve a document"""
    
    if current_user_role not in ['principal', 'admin']:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    document = document_service.approve_document(document_id, current_user_id, db)
    
    # Send notification to uploader
    from app.notification_service import notification_service
    notification_service.create_notification(
        db=db,
        user_id=document.uploaded_by,
        title="Document Approved",
        message=f'Your document "{document.title}" has been approved.',
        notification_type="document_approval"
    )
    
    return {"message": "Document approved successfully"}

@router.patch("/documents/{document_id}/reject")
async def reject_document(
    document_id: int,
    reason: str = Form(...),
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
    current_user_role: str = Depends(get_current_user_role)
):
    """Reject a document"""
    
    if current_user_role not in ['principal', 'admin']:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    document = document_service.reject_document(document_id, current_user_id, reason, db)
    
    # Send notification to uploader
    from app.notification_service import notification_service
    notification_service.create_notification(
        db=db,
        user_id=document.uploaded_by,
        title="Document Rejected",
        message=f'Your document "{document.title}" has been rejected. Reason: {reason}',
        notification_type="document_rejection"
    )
    
    return {"message": "Document rejected successfully"}

@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Delete a document"""
    
    document_service.delete_document(document_id, current_user_id, db)
    return {"message": "Document deleted successfully"}

@router.post("/documents/folders")
async def create_folder(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    parent_folder_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
    current_dept_id: int = Depends(get_current_department_id)
):
    """Create a new folder"""
    
    # Get current academic year
    from app.models import AcademicYear
    academic_year = db.query(AcademicYear).filter(AcademicYear.is_enabled == True).first()
    if not academic_year:
        raise HTTPException(status_code=400, detail="No active academic year")
    
    folder = document_service.create_folder(
        name=name,
        department_id=current_dept_id,
        academic_year_id=academic_year.id,
        created_by=current_user_id,
        description=description,
        parent_folder_id=parent_folder_id,
        db=db
    )
    
    return {"message": "Folder created successfully", "folder_id": folder.id}

@router.get("/documents/folders", response_model=List[FolderResponse])
async def get_folders(
    parent_folder_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user_role: str = Depends(get_current_user_role),
    current_dept_id: int = Depends(get_current_department_id)
):
    """Get folders"""
    
    # Get current academic year
    from app.models import AcademicYear
    academic_year = db.query(AcademicYear).filter(AcademicYear.is_enabled == True).first()
    if not academic_year:
        raise HTTPException(status_code=404, detail="No active academic year")
    
    dept_filter = current_dept_id if current_user_role != 'principal' else None
    
    folders = document_service.get_folders(
        department_id=dept_filter,
        academic_year_id=academic_year.id,
        parent_folder_id=parent_folder_id,
        db=db
    )
    
    return [
        FolderResponse(
            id=folder.id,
            name=folder.name,
            description=folder.description,
            parent_folder_id=folder.parent_folder_id,
            is_public=folder.is_public,
            created_at=folder.created_at,
            created_by=folder.created_by,
            creator_name=folder.creator.name
        )
        for folder in folders
    ]

@router.get("/documents/types")
async def get_document_types():
    """Get available document types"""
    return [
        {"value": "event_proposal", "label": "Event Proposal"},
        {"value": "budget_document", "label": "Budget Document"},
        {"value": "receipt", "label": "Receipt"},
        {"value": "report", "label": "Report"},
        {"value": "approval_letter", "label": "Approval Letter"},
        {"value": "certificate", "label": "Certificate"},
        {"value": "invoice", "label": "Invoice"},
        {"value": "other", "label": "Other"}
    ]

@router.get("/documents/events")
async def get_events_for_documents(
    db: Session = Depends(get_db),
    current_user_role: str = Depends(get_current_user_role),
    current_dept_id: int = Depends(get_current_department_id)
):
    """Get events that can have documents attached"""
    
    # Get current academic year
    from app.models import AcademicYear, Event
    academic_year = db.query(AcademicYear).filter(AcademicYear.is_enabled == True).first()
    if not academic_year:
        raise HTTPException(status_code=404, detail="No active academic year")
    
    # Build query for events
    query = db.query(Event).filter(
        Event.academic_year_id == academic_year.id
    )
    
    # Filter by department unless user is principal
    if current_user_role != 'principal':
        query = query.filter(Event.department_id == current_dept_id)
    
    events = query.order_by(Event.event_date.desc()).all()
    
    return [
        {
            "id": event.id,
            "title": event.title,
            "description": event.description,
            "event_date": event.event_date,
            "budget_amount": event.budget_amount,
            "event_status": event.event_status,
            "department_name": event.department.name,
            "coordinator_name": event.coordinator_name
        }
        for event in events
    ]
