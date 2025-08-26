# app/crud.py
from sqlalchemy.orm import Session
from . import models
from app.models import ProgramType
from app.models import ProgramCount
from app.models import AcademicYear
from app.models import ModuleDeadline
from app.schemas import ModuleDeadlineOut
from app.schemas import ProgramCountCreate
from app.schemas import ProgramTypeCreate
from app.models import PrincipalRemark
from app.schemas import PrincipalRemarkCreate
from app.models import HodRemarks
from app.schemas import HodRemarksCreate
from typing import Optional
import datetime


def get_enabled_academic_years(db: Session):
    return db.query(models.AcademicYear).filter_by(is_enabled=True).all()

def get_module_deadline(db: Session, academic_year_id: int, module: str):
    return (
        db.query(ModuleDeadline)
        .filter(
            ModuleDeadline.academic_year_id == academic_year_id,
            ModuleDeadline.module == module
        )
        .first()
    )

def get_program_types(db: Session, department: Optional[str] = None):
    query = db.query(ProgramType)
    if department and department != "ALL":
        query = query.filter(
            (ProgramType.departments == "ALL") |
            (ProgramType.departments.like(f"%{department}%"))
        )
    return query.all()

def create_program_type(db: Session, data: ProgramTypeCreate):
    db_entry = ProgramType(**data.dict())
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

def update_program_type(db: Session, id: int, data: ProgramTypeCreate):
    entry = db.query(ProgramType).get(id)
    if entry:
        for field, value in data.dict().items():
            setattr(entry, field, value)
        db.commit()
        db.refresh(entry)
    return entry

def delete_program_type(db: Session, id: int):
    entry = db.query(ProgramType).get(id)
    if entry:
        db.delete(entry)
        db.commit()
    return entry

def get_academic_years(db: Session):
    return db.query(AcademicYear).order_by(AcademicYear.year.desc()).all()


def get_remark(db: Session, department_id: int, academic_year_id: int):
    return db.query(PrincipalRemark).filter_by(
        department_id=department_id,
        academic_year_id=academic_year_id
    ).first()

def save_or_update_remark(db: Session, data: PrincipalRemarkCreate):
    existing = get_remark(db, data.department_id, data.academic_year_id)
    if existing:
        existing.remarks = data.remarks
        db.add(existing)
    else:
        existing = PrincipalRemark(**data.dict())
        db.add(existing)
    db.commit()
    db.refresh(existing)
    return existing

def get_hod_remark(db: Session, department_id: int, academic_year_id: int):
    return db.query(HodRemarks).filter_by(
        department_id=department_id,
        academic_year_id=academic_year_id
    ).first()

def save_or_update_hod_remark(db: Session, data: HodRemarksCreate):
    existing = get_hod_remark(db, data.department_id, data.academic_year_id)
    if existing:
        existing.remarks = data.remarks
    else:
        existing = HodRemarks(**data.dict())
        db.add(existing)
    db.commit()
    db.refresh(existing)
    return existing

def get_module_deadline(db: Session, academic_year_id: int, module: str):
    return db.query(models.ModuleDeadline).filter_by(
        academic_year_id=academic_year_id,
        module=module
    ).first()


def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

# -------------------------------
# Score Card CRUD Operations
# -------------------------------

def create_scorecard_template(db: Session, template_data: dict, user_id: int):
    """Create a new score card template"""
    from app.models import ScoreCardTemplate
    
    template = ScoreCardTemplate(
        name=template_data['name'],
        description=template_data.get('description'),
        academic_year_id=template_data['academic_year_id'],
        is_active=template_data.get('is_active', True)
    )
    
    db.add(template)
    db.commit()
    db.refresh(template)
    return template

def get_scorecard_templates(db: Session, academic_year_id: Optional[int] = None, is_active: Optional[bool] = None):
    """Get score card templates with filters"""
    from app.models import ScoreCardTemplate
    
    query = db.query(ScoreCardTemplate)
    
    if academic_year_id:
        query = query.filter(ScoreCardTemplate.academic_year_id == academic_year_id)
    
    if is_active is not None:
        query = query.filter(ScoreCardTemplate.is_active == is_active)
    
    return query.all()

def get_scorecard_template_by_id(db: Session, template_id: int):
    """Get a single score card template with questions"""
    from app.models import ScoreCardTemplate
    
    return db.query(ScoreCardTemplate).filter(ScoreCardTemplate.id == template_id).first()

def create_scorecard_questions(db: Session, template_id: int, questions_data: list):
    """Create multiple questions for a template"""
    from app.models import ScoreCardQuestion
    
    questions = []
    for q_data in questions_data:
        question = ScoreCardQuestion(
            template_id=template_id,
            question_number=q_data['question_number'],
            question_text=q_data['question_text'],
            question_type=q_data.get('question_type', 'objective'),
            max_score=q_data.get('max_score', 5),
            requires_document=q_data.get('requires_document', False),
            is_mandatory=q_data.get('is_mandatory', True),
            document_description=q_data.get('document_description'),
            document_formats=q_data.get('document_formats')
        )
        questions.append(question)
    
    db.add_all(questions)
    db.commit()
    
    for q in questions:
        db.refresh(q)
    
    return questions

def create_scorecard_submission(db: Session, submission_data: dict, user_id: int):
    """Create a new score card submission"""
    from app.models import ScoreCardSubmission
    
    submission = ScoreCardSubmission(
        template_id=submission_data['template_id'],
        department_id=submission_data['department_id'],
        submitted_by=user_id,
        submission_status=submission_data.get('submission_status', 'draft'),
        comments=submission_data.get('comments')
    )
    
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission

def get_scorecard_submissions(db: Session, department_id: Optional[int] = None, 
                             template_id: Optional[int] = None, user_id: Optional[int] = None):
    """Get score card submissions with filters"""
    from app.models import ScoreCardSubmission
    
    query = db.query(ScoreCardSubmission)
    
    if department_id:
        query = query.filter(ScoreCardSubmission.department_id == department_id)
    
    if template_id:
        query = query.filter(ScoreCardSubmission.template_id == template_id)
    
    if user_id:
        query = query.filter(ScoreCardSubmission.submitted_by == user_id)
    
    return query.all()

def get_scorecard_submission_by_id(db: Session, submission_id: int):
    """Get a single score card submission with responses and documents"""
    from app.models import ScoreCardSubmission
    
    return db.query(ScoreCardSubmission).filter(ScoreCardSubmission.id == submission_id).first()

def create_scorecard_response(db: Session, response_data: dict):
    """Create a response to a score card question"""
    from app.models import ScoreCardResponse
    
    response = ScoreCardResponse(
        submission_id=response_data['submission_id'],
        question_id=response_data['question_id'],
        response_text=response_data.get('response_text'),
        score=response_data.get('score', 0.0),
        reviewer_comments=response_data.get('reviewer_comments')
    )
    
    db.add(response)
    db.commit()
    db.refresh(response)
    return response

def create_scorecard_document(db: Session, document_data: dict, response_id: int):
    """Create a document associated with a response"""
    from app.models import ScoreCardDocument
    
    document = ScoreCardDocument(
        response_id=response_id,
        document_type=document_data.get('document_type', 'upload'),
        file_name=document_data.get('file_name'),
        file_path=document_data.get('file_path'),
        file_size=document_data.get('file_size'),
        onedrive_link=document_data.get('onedrive_link'),
        physical_location=document_data.get('physical_location'),
        physical_status=document_data.get('physical_status', 'pending')
    )
    
    db.add(document)
    db.commit()
    db.refresh(document)
    return document

def update_scorecard_submission_status(db: Session, submission_id: int, status: str, 
                                     reviewer_id: Optional[int] = None):
    """Update submission status and reviewer information"""
    from app.models import ScoreCardSubmission
    import datetime
    
    submission = db.query(ScoreCardSubmission).filter(ScoreCardSubmission.id == submission_id).first()
    if not submission:
        return None
    
    submission.submission_status = status
    
    if status == 'submitted' and not submission.submission_date:
        submission.submission_date = datetime.datetime.utcnow()
    
    if reviewer_id:
        submission.reviewed_by = reviewer_id
        submission.reviewed_date = datetime.datetime.utcnow()
    
    submission.updated_at = datetime.datetime.utcnow()
    
    db.commit()
    db.refresh(submission)
    return submission

def calculate_submission_score(db: Session, submission_id: int):
    """Calculate total score for a submission"""
    from app.models import ScoreCardSubmission, ScoreCardResponse, ScoreCardQuestion
    
    # Get all responses for this submission
    responses = db.query(ScoreCardResponse).filter(ScoreCardResponse.submission_id == submission_id).all()
    
    total_score = sum(response.score for response in responses)
    
    # Get max possible score from template questions
    submission = db.query(ScoreCardSubmission).filter(ScoreCardSubmission.id == submission_id).first()
    if not submission:
        return None
    
    questions = db.query(ScoreCardQuestion).filter(ScoreCardQuestion.template_id == submission.template_id).all()
    max_possible_score = sum(question.max_score for question in questions)
    
    percentage_score = (total_score / max_possible_score * 100) if max_possible_score > 0 else 0
    
    # Update submission with calculated scores
    submission.total_score = total_score
    submission.max_possible_score = max_possible_score
    submission.percentage_score = percentage_score
    
    db.commit()
    db.refresh(submission)
    return submission

def log_scorecard_action(db: Session, submission_id: int, user_id: int, action: str, 
                        old_values: Optional[str] = None, new_values: Optional[str] = None):
    """Log an action in the audit trail"""
    from app.models import ScoreCardAuditLog
    
    log_entry = ScoreCardAuditLog(
        submission_id=submission_id,
        user_id=user_id,
        action=action,
        old_values=old_values,
        new_values=new_values
    )
    
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry