from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models import Event, Document
from app.services.document_service import save_event_document, get_event_documents, approve_document, reject_document
from app.dependencies import get_current_user_role, get_current_user_id
from pydantic import BaseModel
from datetime import datetime
import os

router = APIRouter()

UPLOAD_DIR = "uploads/documents"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Pydantic models for API responses
class EventDocumentResponse(BaseModel):
    id: int
    event_id: int
    doc_type: str  # This will be mapped from document_type
    filename: str
    file_path: str
    uploaded_at: datetime
    status: str
    approved_by: Optional[int]
    approved_at: Optional[datetime]
    rejection_reason: Optional[str]

@router.post("/upload/{event_id}")
def upload_event_documents(
    event_id: int, 
    report: UploadFile = File(...), 
    zipfile: UploadFile = File(...), 
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Upload both report (PDF/DOC/DOCX) and zip file for an event"""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Validate report file type
    allowed_report_types = ['.pdf', '.doc', '.docx']
    report_extension = os.path.splitext(report.filename.lower())[1] if report.filename else ''
    if report_extension not in allowed_report_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid report file type. Allowed: PDF, DOC, DOCX. Got: {report_extension}"
        )
    
    # Validate ZIP file type
    zip_extension = os.path.splitext(zipfile.filename.lower())[1] if zipfile.filename else ''
    if zip_extension != '.zip':
        raise HTTPException(
            status_code=400,
            detail=f"Invalid archive file type. Only ZIP files are allowed. Got: {zip_extension}"
        )
    
    try:
        # Save report (PDF, DOC, or DOCX)
        report_filename = f"event_{event_id}_report_{report.filename}"
        report_path = os.path.join(UPLOAD_DIR, report_filename)
        with open(report_path, "wb") as f:
            f.write(report.file.read())
        
        report_doc = save_event_document(
            db=db, 
            event_id=event_id, 
            doc_type="report", 
            filename=report_filename, 
            file_path=report_path,
            file_size=report.size or 0,
            mime_type=report.content_type,
            uploaded_by=current_user_id
        )
        
        # Save zip file
        zip_filename = f"event_{event_id}_files_{zipfile.filename}"
        zip_path = os.path.join(UPLOAD_DIR, zip_filename)
        with open(zip_path, "wb") as f:
            f.write(zipfile.file.read())
        
        zip_doc = save_event_document(
            db=db,
            event_id=event_id,
            doc_type="zip",
            filename=zip_filename,
            file_path=zip_path,
            file_size=zipfile.size or 0,
            mime_type=zipfile.content_type,
            uploaded_by=current_user_id
        )
        
        return {
            "message": "Documents uploaded successfully",
            "report_document_id": report_doc.id,
            "zip_document_id": zip_doc.id,
            "report_type": report_extension.upper()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/list")
def get_event_documents_list(db: Session = Depends(get_db)):
    """Get list of all event documents with compatibility mapping"""
    documents = get_event_documents(db)
    
    # Convert to response format with doc_type mapping
    response_docs = []
    for doc in documents:
        # Map document_type to doc_type for frontend compatibility
        type_mapping = {
            'complete_report': 'report',
            'supporting_documents': 'zipfile'
        }
        doc_type = type_mapping.get(doc.document_type, doc.document_type)
        
        response_docs.append({
            "id": doc.id,
            "event_id": doc.event_id,
            "doc_type": doc_type,
            "document_type": doc.document_type,  # Include original field too
            "filename": doc.filename,
            "file_path": doc.file_path,
            "uploaded_at": doc.uploaded_at,
            "status": doc.status,
            "approved_by": doc.approved_by,
            "approved_at": doc.approved_at,
            "rejection_reason": doc.rejection_reason
        })
    
    return response_docs

@router.post("/approve/{document_id}")
def approve_event_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
    current_user_role: str = Depends(get_current_user_role)
):
    """Approve a document (Principal only)"""
    if current_user_role not in ['principal', 'admin']:
        raise HTTPException(status_code=403, detail="Only principal can approve documents")
    
    try:
        document = approve_document(db, document_id, current_user_id)
        return {"message": "Document approved successfully", "document_id": document.id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Approval failed: {str(e)}")

@router.post("/reject/{document_id}")
def reject_event_document(
    document_id: int,
    reason: str = Form(...),
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id),
    current_user_role: str = Depends(get_current_user_role)
):
    """Reject a document with reason (Principal only)"""
    if current_user_role not in ['principal', 'admin']:
        raise HTTPException(status_code=403, detail="Only principal can reject documents")
    
    try:
        document = reject_document(db, document_id, current_user_id, reason)
        return {"message": "Document rejected successfully", "document_id": document.id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rejection failed: {str(e)}")

@router.get("/download/{document_id}")
def download_document(
    document_id: int,
    db: Session = Depends(get_db)
):
    """Download a document file"""
    from app.models import Document
    
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if not os.path.exists(document.file_path):
        raise HTTPException(status_code=404, detail="File not found on server")
    
    return FileResponse(
        path=document.file_path,
        filename=document.original_filename,
        media_type=document.mime_type or 'application/octet-stream'
    )
    document.rejection_reason = reason
    db.commit()
    
    return {"message": "Document rejected successfully"}

@router.get("/download/{document_id}")
def download_document(
    document_id: int,
    db: Session = Depends(get_db)
):
    from app.models import Document
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if not os.path.exists(document.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    return FileResponse(
        path=document.file_path,
        filename=document.filename,
        media_type='application/octet-stream'
    )

@router.delete("/delete/{document_id}")
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user_role: str = Depends(get_current_user_role),
    current_user_id: int = Depends(get_current_user_id)
):
    """Delete a document (HoD only, and only for pending documents)"""
    if current_user_role != 'hod':
        raise HTTPException(status_code=403, detail="Only HoDs can delete documents")
    
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Only allow deletion of pending documents
    if document.status != 'pending':
        raise HTTPException(status_code=400, detail="Only pending documents can be deleted")
    
    # Mark as deleted instead of actually deleting (for audit trail)
    document.status = 'deleted'
    document.updated_at = datetime.now()
    
    # Delete the actual file
    try:
        if os.path.exists(document.file_path):
            os.remove(document.file_path)
    except Exception as e:
        # Log the error but don't fail the request
        print(f"Error deleting file {document.file_path}: {e}")
    
    db.commit()
    
    return {"message": "Document deleted successfully"}
