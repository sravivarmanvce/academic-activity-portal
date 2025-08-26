# app/api/endpoints/scorecard.py

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.dependencies import get_current_user_role, get_current_user_id, get_current_department_id
from app.models import (
    ScoreCardTemplate, ScoreCardQuestion, ScoreCardSubmission, 
    ScoreCardResponse, ScoreCardDocument, User, Department, AcademicYear
)
import json
import os
from pathlib import Path
from datetime import datetime
import uuid

router = APIRouter(prefix="/scorecard", tags=["Score Card"])

# Permission helpers
def check_admin_permissions(current_role: str):
    """Check if user has admin permissions (admin, principal, dean_iqac)"""
    if current_role not in ["admin", "principal", "dean_iqac"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Admin permissions required."
        )

def check_hod_or_admin_permissions(current_role: str):
    """Check if user has HoD or admin permissions"""
    if current_role not in ["admin", "principal", "dean_iqac", "hod"]:
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
    title: str = Form(...),
    description: str = Form(None),
    academic_year_id: int = Form(...),
    max_score: float = Form(...),
    db: Session = Depends(get_db),
    current_role: str = Depends(get_current_user_role),
    current_user_id: int = Depends(get_current_user_id)
):
    """Create a new scorecard template (Admin/Principal/Dean IQAC only)"""
    check_admin_permissions(current_role)
    
    template = ScoreCardTemplate(
        title=title,
        description=description,
        academic_year_id=academic_year_id,
        max_score=max_score,
        created_by=current_user_id
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
    """Create a new question for a template"""
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
    check_hod_or_admin_permissions(current_role)
    
    query = db.query(ScoreCardSubmission)
    
    # Filter by role permissions
    if current_role == "hod" and current_dept_id:
        query = query.filter(ScoreCardSubmission.department_id == current_dept_id)
    
    if template_id:
        query = query.filter(ScoreCardSubmission.template_id == template_id)
    if department_id and current_role != "hod":
        query = query.filter(ScoreCardSubmission.department_id == department_id)
    if submission_status:
        query = query.filter(ScoreCardSubmission.submission_status == submission_status)
    
    submissions = query.order_by(ScoreCardSubmission.created_at.desc()).all()
    
    # Enrich with department and template info
    result = []
    for submission in submissions:
        dept = db.query(Department).filter(Department.id == submission.department_id).first()
        template = db.query(ScoreCardTemplate).filter(ScoreCardTemplate.id == submission.template_id).first()
        
        result.append({
            "submission": submission,
            "department_name": dept.name if dept else "Unknown",
            "template_title": template.title if template else "Unknown"
        })
    
    return result

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
    if current_role != "hod":
        raise HTTPException(status_code=403, detail="Only HoDs can create submissions")
    
    if not current_dept_id:
        raise HTTPException(status_code=400, detail="Department ID not found for user")
    
    # Get academic year from template
    template = db.query(ScoreCardTemplate).filter(ScoreCardTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Check if submission already exists
    existing = db.query(ScoreCardSubmission).filter(
        ScoreCardSubmission.template_id == template_id,
        ScoreCardSubmission.department_id == current_dept_id,
        ScoreCardSubmission.academic_year_id == template.academic_year_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Submission already exists for this template and department")
    
    submission = ScoreCardSubmission(
        template_id=template_id,
        department_id=current_dept_id,
        academic_year_id=template.academic_year_id,
        submitted_by_user_id=current_user_id,
        hod_comments=hod_comments
    )
    
    db.add(submission)
    db.commit()
    db.refresh(submission)
    
    return submission

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
    
    # Get responses with questions
    responses = db.query(ScoreCardResponse).filter(
        ScoreCardResponse.submission_id == submission_id
    ).all()
    
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
        "responses": responses
    }

# =====================================================
# Responses Management
# =====================================================

@router.post("/responses")
def save_scorecard_response(
    submission_id: int = Form(...),
    question_id: int = Form(...),
    text_response: str = Form(None),
    count_response: int = Form(None),
    decimal_response: float = Form(None),
    onedrive_link_1: str = Form(None),
    onedrive_link_2: str = Form(None),
    onedrive_link_3: str = Form(None),
    onedrive_description: str = Form(None),
    has_physical_documents: bool = Form(False),
    physical_document_description: str = Form(None),
    physical_document_location: str = Form(None),
    physical_document_count: int = Form(None),
    physical_submission_notes: str = Form(None),
    db: Session = Depends(get_db),
    current_role: str = Depends(get_current_user_role),
    current_user_id: int = Depends(get_current_user_id)
):
    """Save or update response to a question"""
    check_hod_or_admin_permissions(current_role)
    
    # Check if response already exists
    existing_response = db.query(ScoreCardResponse).filter(
        ScoreCardResponse.submission_id == submission_id,
        ScoreCardResponse.question_id == question_id
    ).first()
    
    # Get question for scoring
    question = db.query(ScoreCardQuestion).filter(ScoreCardQuestion.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Calculate score based on question type and response
    calculated_score = calculate_question_score(question, count_response, text_response, has_physical_documents)
    
    if existing_response:
        # Update existing response
        existing_response.text_response = text_response
        existing_response.count_response = count_response
        existing_response.decimal_response = decimal_response
        existing_response.onedrive_link_1 = onedrive_link_1
        existing_response.onedrive_link_2 = onedrive_link_2
        existing_response.onedrive_link_3 = onedrive_link_3
        existing_response.onedrive_description = onedrive_description
        existing_response.has_physical_documents = has_physical_documents
        existing_response.physical_document_description = physical_document_description
        existing_response.physical_document_location = physical_document_location
        existing_response.physical_document_count = physical_document_count
        existing_response.physical_submission_notes = physical_submission_notes
        existing_response.calculated_score = calculated_score
        existing_response.max_question_score = question.max_score
        
        response = existing_response
    else:
        # Create new response
        response = ScoreCardResponse(
            submission_id=submission_id,
            question_id=question_id,
            text_response=text_response,
            count_response=count_response,
            decimal_response=decimal_response,
            onedrive_link_1=onedrive_link_1,
            onedrive_link_2=onedrive_link_2,
            onedrive_link_3=onedrive_link_3,
            onedrive_description=onedrive_description,
            has_physical_documents=has_physical_documents,
            physical_document_description=physical_document_description,
            physical_document_location=physical_document_location,
            physical_document_count=physical_document_count,
            physical_submission_notes=physical_submission_notes,
            calculated_score=calculated_score,
            max_question_score=question.max_score
        )
        db.add(response)
    
    db.commit()
    db.refresh(response)
    
    return response

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
    
    # Validate file type
    allowed_extensions = {'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip'}
    file_extension = Path(file.filename).suffix.lower()
    
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}"
        )
    
    # Create upload directory
    upload_dir = Path(f"uploads/scorecard/{submission_id}/{question_id}")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = upload_dir / unique_filename
    
    # Save file
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Save to database
    document = ScoreCardDocument(
        response_id=response_id,
        submission_id=submission_id,
        question_id=question_id,
        original_filename=file.filename,
        stored_filename=unique_filename,
        file_path=str(file_path),
        file_size_bytes=len(content),
        file_type=file_extension[1:],  # Remove the dot
        mime_type=file.content_type,
        uploaded_by=current_user_id
    )
    
    db.add(document)
    db.commit()
    db.refresh(document)
    
    return {
        "message": "File uploaded successfully",
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
    """Verify or reject scorecard submission (Dean IQAC only)"""
    if current_role not in ["dean_iqac", "admin", "principal"]:
        raise HTTPException(status_code=403, detail="Only Dean IQAC can verify submissions")
    
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
