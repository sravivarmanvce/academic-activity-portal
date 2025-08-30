# app/api/endpoints/scorecard.py

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.dependencies import get_current_user_role, get_current_user_id, get_current_department_id
from app.models import (
    ScoreCardTemplate, ScoreCardQuestion, ScoreCardSubmission, 
    ScoreCardResponse, ScoreCardDocument, User, Department, AcademicYear
)
from app.schemas import ScoreCardQuestionUpdate
import json
import os
from pathlib import Path
from datetime import datetime
import uuid

router = APIRouter(prefix="/scorecard", tags=["Score Card"])

# Permission helpers
def check_admin_permissions(current_role: str):
    """Check if user has admin permissions (admin, principal, dean_iqac, pa_principal)"""
    if current_role not in ["admin", "principal", "dean_iqac", "pa_principal"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Admin permissions required."
        )

def check_hod_or_admin_permissions(current_role: str):
    """Check if user has HoD or admin permissions"""
    if current_role not in ["admin", "principal", "dean_iqac", "pa_principal", "hod"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. HoD or admin permissions required."
        )

# =====================================================
# Template Management (Admin/Principal/Dean IQAC only)
# =====================================================

@router.get("/templates")
def get_scorecard_templates(
    db: Session = Depends(get_db),
    current_role: str = Depends(get_current_user_role)
):
    """Get all scorecard templates"""
    check_hod_or_admin_permissions(current_role)
    
    templates = db.query(ScoreCardTemplate).filter(
        ScoreCardTemplate.is_active == True
    ).order_by(ScoreCardTemplate.created_at.desc()).all()
    
    return templates

@router.get("/templates/{template_id}")
def get_scorecard_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_role: str = Depends(get_current_user_role)
):
    """Get specific scorecard template with questions"""
    check_hod_or_admin_permissions(current_role)
    
    template = db.query(ScoreCardTemplate).filter(
        ScoreCardTemplate.id == template_id
    ).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Get questions for this template
    questions = db.query(ScoreCardQuestion).filter(
        ScoreCardQuestion.template_id == template_id
    ).order_by(ScoreCardQuestion.question_number).all()
    
    return {
        "template": template,
        "questions": questions
    }

@router.post("/templates")
def create_scorecard_template(
    name: str = Form(...),
    description: str = Form(None),
    academic_year_id: int = Form(...),
    db: Session = Depends(get_db),
    current_role: str = Depends(get_current_user_role),
    current_user_id: int = Depends(get_current_user_id)
):
    """Create a new scorecard template (Admin/Principal/Dean IQAC/PA Principal only)"""
    check_admin_permissions(current_role)
    
    template = ScoreCardTemplate(
        name=name,
        description=description,
        academic_year_id=academic_year_id
    )
    
    db.add(template)
    db.commit()
    db.refresh(template)
    
    return template

# =====================================================
# Questions Management
# =====================================================

@router.post("/templates/{template_id}/questions")
def create_scorecard_question(
    template_id: int,
    question_text: str = Form(...),
    question_type: str = Form("objective"),
    max_score: int = Form(5),
    question_number: int = Form(...),
    requires_document: bool = Form(False),
    is_mandatory: bool = Form(True),
    document_description: str = Form(None),
    document_formats: str = Form(None),
    db: Session = Depends(get_db),
    current_role: str = Depends(get_current_user_role)
):
    """Create a new question for a template (Admin/Principal/Dean IQAC/PA Principal only)"""
    check_admin_permissions(current_role)
    
    question = ScoreCardQuestion(
        template_id=template_id,
        question_text=question_text,
        question_type=question_type,
        max_score=max_score,
        question_number=question_number,
        requires_document=requires_document,
        is_mandatory=is_mandatory,
        document_description=document_description,
        document_formats=document_formats
    )
    
    db.add(question)
    db.commit()
    db.refresh(question)
    
    return question

@router.put("/questions/{question_id}")
def update_scorecard_question(
    question_id: int,
    question_data: ScoreCardQuestionUpdate,
    db: Session = Depends(get_db),
    current_role: str = Depends(get_current_user_role)
):
    """Update a scorecard question (Admin, Principal, Dean IQAC, PA only)"""
    check_admin_permissions(current_role)
    
    # Get existing question
    question = db.query(ScoreCardQuestion).filter(ScoreCardQuestion.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Update question fields
    question.question_text = question_data.question_text
    question.question_type = question_data.question_type
    question.max_score = question_data.max_score
    question.question_number = question_data.question_number
    question.requires_document = question_data.requires_document
    question.is_mandatory = question_data.is_mandatory
    question.document_description = question_data.document_description
    question.document_formats = question_data.document_formats
    
    db.commit()
    db.refresh(question)
    
    return question

@router.delete("/questions/{question_id}")
def delete_scorecard_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_role: str = Depends(get_current_user_role)
):
    """Delete a scorecard question (Admin, Principal, Dean IQAC, PA only)"""
    check_admin_permissions(current_role)
    
    # Get existing question
    question = db.query(ScoreCardQuestion).filter(ScoreCardQuestion.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Check if question has responses (prevent deletion if it does)
    response_count = db.query(ScoreCardResponse).filter(ScoreCardResponse.question_id == question_id).count()
    if response_count > 0:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete question that has responses. Please archive it instead."
        )
    
    db.delete(question)
    db.commit()
    
    return {"message": "Question deleted successfully"}

@router.put("/templates/{template_id}/questions/reorder")
def reorder_scorecard_questions(
    template_id: int,
    question_order: List[dict],
    db: Session = Depends(get_db),
    current_role: str = Depends(get_current_user_role)
):
    """Reorder scorecard questions (Admin, Principal, Dean IQAC, PA only)"""
    check_admin_permissions(current_role)
    
    # Verify template exists
    template = db.query(ScoreCardTemplate).filter(ScoreCardTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Update question numbers
    for item in question_order:
        question = db.query(ScoreCardQuestion).filter(ScoreCardQuestion.id == item['id']).first()
        if question and question.template_id == template_id:
            question.question_number = item['question_number']
    
    db.commit()
    
    return {"message": "Questions reordered successfully"}

# =====================================================
# Submissions (HoD can create/edit, Admin can view/verify)
# =====================================================

@router.get("/submissions")
def get_scorecard_submissions(
    template_id: Optional[int] = None,
    department_id: Optional[int] = None,
    submission_status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_role: str = Depends(get_current_user_role),
    current_dept_id: Optional[int] = Depends(get_current_department_id)
):
    """Get scorecard submissions with optional filters"""
    try:
        print(f"GET submissions - Role: {current_role}, Dept: {current_dept_id}, Template: {template_id}")
        
        # Check permissions first
        try:
            check_hod_or_admin_permissions(current_role)
            print("Permission check passed")
        except Exception as perm_error:
            print(f"Permission check failed: {perm_error}")
            raise
        
        # Build query
        try:
            query = db.query(ScoreCardSubmission)
            print("Base query created")
            
            # Filter by role permissions
            if current_role == "hod" and current_dept_id:
                query = query.filter(ScoreCardSubmission.department_id == current_dept_id)
                print(f"Filtered by department: {current_dept_id}")
            
            if template_id:
                query = query.filter(ScoreCardSubmission.template_id == template_id)
                print(f"Filtered by template: {template_id}")
                
            if department_id and current_role != "hod":
                query = query.filter(ScoreCardSubmission.department_id == department_id)
                
            if submission_status:
                query = query.filter(ScoreCardSubmission.submission_status == submission_status)
                
            print("Query filters applied")
        except Exception as query_error:
            print(f"Query building failed: {query_error}")
            raise
        
        # Execute query
        try:
            submissions = query.order_by(ScoreCardSubmission.created_at.desc()).all()
            print(f"Found {len(submissions)} submissions")
        except Exception as exec_error:
            print(f"Query execution failed: {exec_error}")
            raise
        
        # Simple response first to test
        return [{"submission": sub} for sub in submissions]
        
    except Exception as e:
        print(f"Error getting submissions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/submissions")
def create_scorecard_submission(
    template_id: int = Form(...),
    hod_comments: str = Form(None),
    db: Session = Depends(get_db),
    current_role: str = Depends(get_current_user_role),
    current_user_id: int = Depends(get_current_user_id),
    current_dept_id: Optional[int] = Depends(get_current_department_id)
):
    """Create new scorecard submission (HoD only)"""
    try:
        print(f"Creating submission - Role: {current_role}, User: {current_user_id}, Dept: {current_dept_id}")
        
        if current_role != "hod":
            raise HTTPException(status_code=403, detail="Only HoDs can create submissions")
        
        if not current_dept_id:
            raise HTTPException(status_code=400, detail="Department ID not found for user")
        
        # Get academic year from template
        template = db.query(ScoreCardTemplate).filter(ScoreCardTemplate.id == template_id).first()
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Check if submission already exists for this template and department
        existing = db.query(ScoreCardSubmission).filter(
            ScoreCardSubmission.template_id == template_id,
            ScoreCardSubmission.department_id == current_dept_id
        ).first()
        
        if existing:
            print(f"Returning existing submission: {existing.id}")
            return existing
        
        submission = ScoreCardSubmission(
            template_id=template_id,
            department_id=current_dept_id,
            submitted_by=current_user_id,
            comments=hod_comments
        )
        
        db.add(submission)
        db.commit()
        db.refresh(submission)
        
        print(f"Successfully created submission: {submission.id}")
        return submission
        
    except Exception as e:
        print(f"Error creating submission: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/submissions/{submission_id}")
def get_scorecard_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    current_role: str = Depends(get_current_user_role),
    current_dept_id: Optional[int] = Depends(get_current_department_id)
):
    """Get specific scorecard submission with responses"""
    check_hod_or_admin_permissions(current_role)
    
    submission = db.query(ScoreCardSubmission).filter(
        ScoreCardSubmission.id == submission_id
    ).first()
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Check permissions - HoD can only see their department
    if current_role == "hod" and submission.department_id != current_dept_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get responses with questions and documents
    responses = db.query(ScoreCardResponse).filter(
        ScoreCardResponse.submission_id == submission_id
    ).all()
    
    # Get documents for each response
    response_data = []
    for response in responses:
        documents = db.query(ScoreCardDocument).filter(
            ScoreCardDocument.response_id == response.id
        ).all()
        
        response_data.append({
            "response": response,
            "documents": documents
        })
    
    # Get template and questions
    template = db.query(ScoreCardTemplate).filter(
        ScoreCardTemplate.id == submission.template_id
    ).first()
    
    questions = db.query(ScoreCardQuestion).filter(
        ScoreCardQuestion.template_id == submission.template_id
    ).order_by(ScoreCardQuestion.question_number).all()
    
    return {
        "submission": submission,
        "template": template,
        "questions": questions,
        "responses": response_data
    }

# =====================================================
# Responses Management
# =====================================================

@router.post("/responses")
def save_scorecard_response(
    submission_id: int = Form(...),
    question_id: int = Form(...),
    count_response: int = Form(0),
    onedrive_links: str = Form(None),  # JSON string of links
    onedrive_description: str = Form(None),
    has_physical_documents: bool = Form(False),
    physical_location: str = Form(None),
    physical_description: str = Form(None),
    db: Session = Depends(get_db),
    current_role: str = Depends(get_current_user_role),
    current_user_id: int = Depends(get_current_user_id)
):
    """Save or update response to a question with document support"""
    try:
        print(f"POST responses - Role: {current_role}, User: {current_user_id}, Submission: {submission_id}, Question: {question_id}")
        print(f"Count response: {count_response}")
        
        check_hod_or_admin_permissions(current_role)
        
        # Get question for validation and scoring
        question = db.query(ScoreCardQuestion).filter(ScoreCardQuestion.id == question_id).first()
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")
        
        # Check if response already exists
        existing_response = db.query(ScoreCardResponse).filter(
            ScoreCardResponse.submission_id == submission_id,
            ScoreCardResponse.question_id == question_id
        ).first()
        
        # Calculate basic score based on count response
        calculated_score = calculate_count_score(question, count_response, has_physical_documents)
        
        if existing_response:
            # Update existing response
            existing_response.response_text = str(count_response)  # Store count as text
            existing_response.score = calculated_score
            response = existing_response
        else:
            # Create new response
            response = ScoreCardResponse(
                submission_id=submission_id,
                question_id=question_id,
                response_text=str(count_response),  # Store count as text
                score=calculated_score
            )
            db.add(response)
        
        db.commit()
        db.refresh(response)
        
        # Handle OneDrive documents
        if onedrive_links:
            try:
                import json
                links = json.loads(onedrive_links)
                
                # Remove existing OneDrive documents for this response
                db.query(ScoreCardDocument).filter(
                    ScoreCardDocument.response_id == response.id,
                    ScoreCardDocument.document_type == 'onedrive'
                ).delete()
                
                # Add new OneDrive documents
                for i, link in enumerate(links):
                    if link and link.strip():
                        doc = ScoreCardDocument(
                            response_id=response.id,
                            document_type='onedrive',
                            onedrive_link=link.strip(),
                            file_name=onedrive_description or f"OneDrive Link {i+1}"
                        )
                        db.add(doc)
                        
            except json.JSONDecodeError:
                pass  # Invalid JSON, skip
        
        # Handle physical documents
        if has_physical_documents:
            # Remove existing physical document entries
            db.query(ScoreCardDocument).filter(
                ScoreCardDocument.response_id == response.id,
                ScoreCardDocument.document_type == 'physical'
            ).delete()
            
            # Add physical document entry
            physical_doc = ScoreCardDocument(
                response_id=response.id,
                document_type='physical',
                physical_location=physical_location,
                file_name=physical_description or 'Physical Documents'
            )
            db.add(physical_doc)
        
        db.commit()
        print(f"Response and documents saved successfully: {response.id}")
        
        # Return response with documents
        documents = db.query(ScoreCardDocument).filter(
            ScoreCardDocument.response_id == response.id
        ).all()
        
        return {
            "response": response,
            "documents": documents
        }
        
    except Exception as e:
        print(f"Error saving response: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# =====================================================
# File Upload
# =====================================================

@router.post("/upload")
async def upload_scorecard_file(
    submission_id: int = Form(...),
    question_id: int = Form(...),
    response_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_role: str = Depends(get_current_user_role),
    current_user_id: int = Depends(get_current_user_id)
):
    """Upload file for scorecard response"""
    check_hod_or_admin_permissions(current_role)
    
    # Validate response exists
    response = db.query(ScoreCardResponse).filter(ScoreCardResponse.id == response_id).first()
    if not response:
        raise HTTPException(status_code=404, detail="Response not found")
    
    # Delete existing documents for this response (only one file per question allowed)
    existing_documents = db.query(ScoreCardDocument).filter(
        ScoreCardDocument.response_id == response_id
    ).all()
    
    for doc in existing_documents:
        # Delete physical file
        try:
            if os.path.exists(doc.file_path):
                os.remove(doc.file_path)
        except Exception as e:
            print(f"Warning: Could not delete file {doc.file_path}: {e}")
        
        # Delete from database
        db.delete(doc)
    
    # Validate file type
    allowed_extensions = {'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.jpg', '.jpeg', '.png'}
    file_extension = Path(file.filename).suffix.lower()
    
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}"
        )
    
    # Read file content and validate size (100MB limit)
    content = await file.read()
    max_file_size = 100 * 1024 * 1024  # 100MB in bytes
    
    if len(content) > max_file_size:
        raise HTTPException(
            status_code=413,
            detail=f"File size too large. Maximum allowed size is 100MB. Uploaded file size: {len(content) / (1024*1024):.2f}MB"
        )
    
    # Create upload directory
    upload_dir = Path(f"uploads/scorecard/{submission_id}/{question_id}")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    import uuid
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = upload_dir / unique_filename
    
    # Save file
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Save to database
    document = ScoreCardDocument(
        response_id=response_id,
        document_type='upload',
        file_name=file.filename,
        file_path=str(file_path),
        file_size=len(content)
    )
    
    db.add(document)
    db.commit()
    db.refresh(document)
    
    return {
        "message": "File uploaded successfully" + (" (replaced existing file)" if existing_documents else ""),
        "document": document
    }

# =====================================================
# Submission Actions
# =====================================================

@router.put("/submissions/{submission_id}/submit")
def submit_scorecard(
    submission_id: int,
    db: Session = Depends(get_db),
    current_role: str = Depends(get_current_user_role)
):
    """Submit scorecard for review (HoD only)"""
    if current_role != "hod":
        raise HTTPException(status_code=403, detail="Only HoDs can submit scorecards")
    
    submission = db.query(ScoreCardSubmission).filter(
        ScoreCardSubmission.id == submission_id
    ).first()
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    if submission.submission_status != "draft":
        raise HTTPException(status_code=400, detail="Only draft submissions can be submitted")
    
    submission.submission_status = "submitted"
    submission.submitted_at = datetime.utcnow()
    
    db.commit()
    db.refresh(submission)
    
    return {"message": "Submission submitted successfully", "submission": submission}

@router.put("/submissions/{submission_id}/verify")
def verify_scorecard(
    submission_id: int,
    action: str = Form(...),  # 'verify' or 'reject'
    dean_comments: str = Form(None),
    db: Session = Depends(get_db),
    current_role: str = Depends(get_current_user_role),
    current_user_id: int = Depends(get_current_user_id)
):
    """Verify or reject scorecard submission (Dean IQAC/Admin/Principal/PA Principal only)"""
    if current_role not in ["dean_iqac", "admin", "principal", "pa_principal"]:
        raise HTTPException(status_code=403, detail="Only Dean IQAC/Admin/Principal/PA Principal can verify submissions")
    
    submission = db.query(ScoreCardSubmission).filter(
        ScoreCardSubmission.id == submission_id
    ).first()
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    if action == "verify":
        submission.submission_status = "approved"
        submission.reviewed_date = datetime.utcnow()
        submission.reviewed_by = current_user_id
    elif action == "reject":
        submission.submission_status = "rejected"
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'verify' or 'reject'")
    
    submission.dean_comments = dean_comments
    
    db.commit()
    db.refresh(submission)
    
    return {"message": f"Submission {action}ed successfully", "submission": submission}

# =====================================================
# Helper Functions
# =====================================================

def calculate_count_score(question: ScoreCardQuestion, count_response: int, has_documents: bool) -> float:
    """
    Calculate score based on count response
    This can be enhanced with more sophisticated scoring logic
    """
    if count_response <= 0:
        return 0.0
    
    # Basic scoring: award full points for any positive count
    # This can be customized based on question requirements
    base_score = question.max_score
    
    # Bonus for documents if required
    if question.requires_document and has_documents:
        base_score = question.max_score  # Full score with documents
    elif question.requires_document and not has_documents:
        base_score = question.max_score * 0.8  # 80% without required documents
    
    return min(base_score, question.max_score)

def calculate_basic_score(question: ScoreCardQuestion, response_text: str, has_documents: bool) -> float:
    """
    Calculate basic score based on response completeness
    This can be enhanced with more sophisticated scoring logic
    """
    if not response_text or not response_text.strip():
        return 0.0
    
    # Basic scoring: 80% for having a response, 20% bonus for documents if required
    base_score = question.max_score * 0.8
    
    if question.requires_document and has_documents:
        base_score += question.max_score * 0.2
    elif not question.requires_document:
        base_score = question.max_score  # Full score if no documents required
    
    return min(base_score, question.max_score)

def calculate_question_score(question: ScoreCardQuestion, count_response: int, text_response: str, has_documents: bool) -> float:
    """Calculate score for a question based on response - implement your scoring logic here"""
    # This is a placeholder - implement your actual scoring logic
    # You can use question.id to determine specific scoring rules
    
    if question.question_type == "count":
        if count_response is None:
            return 0.0
        # Simple example: award full score if count > 0
        return question.max_score if count_response > 0 else 0.0
    
    elif question.question_type == "text":
        if not text_response or len(text_response.strip()) == 0:
            return 0.0
        # Simple example: award full score if text provided
        return question.max_score
    
    elif question.question_type == "upload":
        # Award score if documents provided
        return question.max_score if has_documents else 0.0
    
    return 0.0

# =====================================================
# File Download
# =====================================================

@router.get("/documents/{document_id}/download")
def download_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_role: str = Depends(get_current_user_role)
):
    """Download a document file"""
    
    # Get document
    document = db.query(ScoreCardDocument).filter(
        ScoreCardDocument.id == document_id
    ).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check permissions - user should have access to this document
    check_hod_or_admin_permissions(current_role)
    
    # Build file path - the file_path already includes the full relative path
    file_path = Path(document.file_path)
    
    if not file_path.exists():
        # Try absolute path from current working directory
        absolute_path = Path.cwd() / document.file_path
        if absolute_path.exists():
            file_path = absolute_path
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"File not found on server: {document.file_path}"
            )
    
    return FileResponse(
        path=str(file_path),
        filename=document.file_name,
        media_type='application/octet-stream'
    )

@router.delete("/documents/{document_id}")
def delete_scorecard_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_role: str = Depends(get_current_user_role)
):
    """Delete a scorecard document (HoD or Admin only)"""
    check_hod_or_admin_permissions(current_role)
    
    # Get the document
    document = db.query(ScoreCardDocument).filter(ScoreCardDocument.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete physical file if it exists (for uploaded files)
    if document.file_path and document.document_type == 'upload':
        try:
            file_path = Path(document.file_path)
            if file_path.exists():
                os.remove(file_path)
        except Exception as e:
            print(f"Warning: Could not delete file {document.file_path}: {e}")
    
    # Delete from database
    db.delete(document)
    db.commit()
    
    return {"message": "Document deleted successfully"}
