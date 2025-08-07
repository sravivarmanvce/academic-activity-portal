# app/services/document_service.py

import os
import uuid
import shutil
from pathlib import Path
from typing import List, Optional, BinaryIO
from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session
from app.models import Document, DocumentFolder, DocumentAccess, User, Department
import mimetypes
import json
from datetime import datetime

class DocumentService:
    def __init__(self):
        # Configure upload directory
        self.upload_base_path = Path("uploads")
        self.upload_base_path.mkdir(exist_ok=True)
        
        # Allowed file types and max sizes
        self.allowed_extensions = {
            'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
            'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg',
            'txt', 'rtf', 'csv', 'zip', 'rar'
        }
        self.max_file_size = 50 * 1024 * 1024  # 50MB

    def get_file_extension(self, filename: str) -> str:
        """Get file extension from filename"""
        return filename.split('.')[-1].lower() if '.' in filename else ''

    def is_allowed_file(self, filename: str) -> bool:
        """Check if file type is allowed"""
        extension = self.get_file_extension(filename)
        return extension in self.allowed_extensions

    def generate_unique_filename(self, original_filename: str) -> str:
        """Generate unique filename while preserving extension"""
        extension = self.get_file_extension(original_filename)
        unique_id = str(uuid.uuid4())
        return f"{unique_id}.{extension}" if extension else unique_id

    def get_department_folder(self, department_id: int, academic_year_id: int) -> Path:
        """Get or create department folder structure"""
        dept_folder = self.upload_base_path / f"dept_{department_id}" / f"year_{academic_year_id}"
        dept_folder.mkdir(parents=True, exist_ok=True)
        return dept_folder

    async def upload_document(
        self,
        file: UploadFile,
        title: str,
        document_type: str,
        department_id: int,
        academic_year_id: int,
        uploaded_by: int,
        description: Optional[str] = None,
        event_id: Optional[int] = None,
        tags: Optional[List[str]] = None,
        db: Session = None
    ) -> Document:
        """Upload and save document"""
        
        # Validation
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        if not self.is_allowed_file(file.filename):
            raise HTTPException(status_code=400, detail="File type not allowed")
        
        if file.size and file.size > self.max_file_size:
            raise HTTPException(status_code=400, detail=f"File too large. Max size: {self.max_file_size // 1024 // 1024}MB")

        # Generate unique filename and path
        unique_filename = self.generate_unique_filename(file.filename)
        dept_folder = self.get_department_folder(department_id, academic_year_id)
        
        # Create document type subfolder
        doc_type_folder = dept_folder / document_type
        doc_type_folder.mkdir(exist_ok=True)
        
        file_path = doc_type_folder / unique_filename

        try:
            # Save file to disk
            with open(file_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
                file_size = len(content)

            # Get MIME type
            mime_type = mimetypes.guess_type(file.filename)[0] or 'application/octet-stream'

            # Create database record
            document = Document(
                filename=unique_filename,
                original_filename=file.filename,
                file_path=str(file_path),
                file_size=file_size,
                mime_type=mime_type,
                document_type=document_type,
                title=title,
                description=description,
                department_id=department_id,
                academic_year_id=academic_year_id,
                event_id=event_id,
                uploaded_by=uploaded_by,
                tags=json.dumps(tags) if tags else None
            )

            db.add(document)
            db.commit()
            db.refresh(document)

            return document

        except Exception as e:
            # Clean up file if database operation fails
            if file_path.exists():
                file_path.unlink()
            raise HTTPException(status_code=500, detail=f"Failed to upload document: {str(e)}")

    def get_documents(
        self,
        department_id: Optional[int] = None,
        academic_year_id: Optional[int] = None,
        document_type: Optional[str] = None,
        event_id: Optional[int] = None,
        status: Optional[str] = None,
        user_id: Optional[int] = None,
        db: Session = None
    ) -> List[Document]:
        """Get documents with filters"""
        
        query = db.query(Document)
        
        if department_id:
            query = query.filter(Document.department_id == department_id)
        if academic_year_id:
            query = query.filter(Document.academic_year_id == academic_year_id)
        if document_type:
            query = query.filter(Document.document_type == document_type)
        if event_id:
            query = query.filter(Document.event_id == event_id)
        if status:
            query = query.filter(Document.status == status)
        if user_id:
            query = query.filter(Document.uploaded_by == user_id)
            
        return query.order_by(Document.uploaded_at.desc()).all()

    def get_document_by_id(self, document_id: int, db: Session) -> Optional[Document]:
        """Get document by ID"""
        return db.query(Document).filter(Document.id == document_id).first()

    def download_document(self, document_id: int, user_id: int, db: Session) -> tuple:
        """Get document file for download"""
        
        document = self.get_document_by_id(document_id, db)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Check access permissions (simplified - you can expand this)
        if not self.can_access_document(document, user_id, "download", db):
            raise HTTPException(status_code=403, detail="Access denied")
        
        file_path = Path(document.file_path)
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found on disk")
        
        return document, file_path

    def can_access_document(self, document: Document, user_id: int, access_type: str, db: Session) -> bool:
        """Check if user can access document"""
        
        # Get user info
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False
        
        # Owner can always access
        if document.uploaded_by == user_id:
            return True
        
        # Same department access
        if document.department_id == user.department_id:
            return True
        
        # Principal can access all
        if user.role == 'principal':
            return True
        
        # Public documents
        if document.is_public and access_type == 'view':
            return True
        
        # Check explicit access permissions
        access = db.query(DocumentAccess).filter(
            DocumentAccess.document_id == document.id,
            DocumentAccess.user_id == user_id,
            DocumentAccess.access_type == access_type
        ).first()
        
        if access:
            # Check if access has expired
            if access.expires_at and access.expires_at < datetime.now():
                return False
            return True
        
        return False

    def approve_document(self, document_id: int, approved_by: int, db: Session) -> Document:
        """Approve a document"""
        
        document = self.get_document_by_id(document_id, db)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Check if user can approve (Principal or Admin)
        approver = db.query(User).filter(User.id == approved_by).first()
        if not approver or approver.role not in ['principal', 'admin']:
            raise HTTPException(status_code=403, detail="Insufficient permissions to approve")
        
        document.status = "approved"
        document.approved_by = approved_by
        document.approved_at = datetime.now()
        
        db.commit()
        db.refresh(document)
        
        return document

    def reject_document(self, document_id: int, rejected_by: int, reason: str, db: Session) -> Document:
        """Reject a document"""
        
        document = self.get_document_by_id(document_id, db)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Check permissions
        rejecter = db.query(User).filter(User.id == rejected_by).first()
        if not rejecter or rejecter.role not in ['principal', 'admin']:
            raise HTTPException(status_code=403, detail="Insufficient permissions to reject")
        
        document.status = "rejected"
        document.description = f"{document.description or ''}\n\nRejection Reason: {reason}".strip()
        
        db.commit()
        db.refresh(document)
        
        return document

    def delete_document(self, document_id: int, user_id: int, db: Session) -> bool:
        """Delete document"""
        
        document = self.get_document_by_id(document_id, db)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Check permissions (owner, admin, or principal)
        user = db.query(User).filter(User.id == user_id).first()
        if not (document.uploaded_by == user_id or user.role in ['principal', 'admin']):
            raise HTTPException(status_code=403, detail="Insufficient permissions to delete")
        
        # Delete file from disk
        file_path = Path(document.file_path)
        if file_path.exists():
            file_path.unlink()
        
        # Delete database record
        db.delete(document)
        db.commit()
        
        return True

    def create_folder(
        self,
        name: str,
        department_id: int,
        academic_year_id: int,
        created_by: int,
        description: Optional[str] = None,
        parent_folder_id: Optional[int] = None,
        db: Session = None
    ) -> DocumentFolder:
        """Create a new document folder"""
        
        folder = DocumentFolder(
            name=name,
            description=description,
            parent_folder_id=parent_folder_id,
            department_id=department_id,
            academic_year_id=academic_year_id,
            created_by=created_by
        )
        
        db.add(folder)
        db.commit()
        db.refresh(folder)
        
        return folder

    def get_folders(
        self,
        department_id: Optional[int] = None,
        academic_year_id: Optional[int] = None,
        parent_folder_id: Optional[int] = None,
        db: Session = None
    ) -> List[DocumentFolder]:
        """Get document folders"""
        
        query = db.query(DocumentFolder)
        
        if department_id:
            query = query.filter(DocumentFolder.department_id == department_id)
        if academic_year_id:
            query = query.filter(DocumentFolder.academic_year_id == academic_year_id)
        if parent_folder_id is not None:
            query = query.filter(DocumentFolder.parent_folder_id == parent_folder_id)
        else:
            query = query.filter(DocumentFolder.parent_folder_id.is_(None))
            
        return query.order_by(DocumentFolder.name).all()

# Create global instance
document_service = DocumentService()
