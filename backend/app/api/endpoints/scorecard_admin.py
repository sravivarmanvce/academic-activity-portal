# app/api/endpoints/scorecard_admin.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app import schemas, crud
from app.database import get_db
from app.models import ScoreCardTemplate, ScoreCardQuestion
from app.dependencies import get_current_user_role
from fastapi.responses import Response
import json

router = APIRouter(prefix="/scorecard", tags=["Score Card Admin"])

# =====================================
# Template Management (Admin/Principal)
# =====================================

@router.get("/templates", response_model=List[schemas.ScoreCardTemplateOut])
def list_scorecard_templates(
    academic_year_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get all score card templates, optionally filtered by academic year"""
    query = db.query(ScoreCardTemplate)
    if academic_year_id:
        query = query.filter(ScoreCardTemplate.academic_year_id == academic_year_id)
    return query.order_by(ScoreCardTemplate.created_at.desc()).all()


@router.post("/templates", response_model=schemas.ScoreCardTemplateOut)
def create_scorecard_template(
    data: schemas.ScoreCardTemplateCreate,
    db: Session = Depends(get_db),
    role: str = Depends(get_current_user_role)
):
    """Create a new score card template (Admin/Principal/Dean IQAC/PA Principal only)"""
    if role not in ["admin", "principal", "pa_principal", "dean_iqac"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    template = ScoreCardTemplate(**data.dict())
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.put("/templates/{template_id}", response_model=schemas.ScoreCardTemplateOut)
def update_scorecard_template(
    template_id: int,
    data: schemas.ScoreCardTemplateCreate,
    db: Session = Depends(get_db),
    role: str = Depends(get_current_user_role)
):
    """Update an existing score card template (Admin/Principal/Dean IQAC/PA Principal only)"""
    if role not in ["admin", "principal", "pa_principal", "dean_iqac"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    template = db.query(ScoreCardTemplate).filter(ScoreCardTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    for field, value in data.dict().items():
        setattr(template, field, value)
    
    db.commit()
    db.refresh(template)
    return template


@router.delete("/templates/{template_id}", status_code=204)
def delete_scorecard_template(
    template_id: int,
    db: Session = Depends(get_db),
    role: str = Depends(get_current_user_role)
):
    """Delete a score card template (Admin/Principal/Dean IQAC/PA Principal only)"""
    if role not in ["admin", "principal", "pa_principal", "dean_iqac"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    template = db.query(ScoreCardTemplate).filter(ScoreCardTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    db.delete(template)
    db.commit()
    return Response(status_code=204)


# =====================================
# Question Management (Admin/Principal) 
# =====================================

@router.get("/templates/{template_id}/questions", response_model=List[schemas.ScoreCardQuestionOut])
def list_template_questions(
    template_id: int,
    db: Session = Depends(get_db)
):
    """Get all questions for a specific template"""
    return db.query(ScoreCardQuestion).filter(
        ScoreCardQuestion.template_id == template_id
    ).order_by(ScoreCardQuestion.question_number).all()


@router.post("/templates/{template_id}/questions", response_model=schemas.ScoreCardQuestionOut)
def create_template_question(
    template_id: int,
    data: schemas.ScoreCardQuestionCreate,
    db: Session = Depends(get_db),
    role: str = Depends(get_current_user_role)
):
    """Add a new question to a template (Admin/Principal/Dean IQAC/PA Principal only)"""
    if role not in ["admin", "principal", "pa_principal", "dean_iqac"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify template exists
    template = db.query(ScoreCardTemplate).filter(ScoreCardTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Create question with template_id
    question_data = data.dict()
    question_data['template_id'] = template_id
    
    question = ScoreCardQuestion(**question_data)
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


@router.put("/questions/{question_id}", response_model=schemas.ScoreCardQuestionOut)
def update_template_question(
    question_id: int,
    data: schemas.ScoreCardQuestionCreate,
    db: Session = Depends(get_db),
    role: str = Depends(get_current_user_role)
):
    """Update an existing question (Admin/Principal/Dean IQAC/PA Principal only)"""
    if role not in ["admin", "principal", "pa_principal", "dean_iqac"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    question = db.query(ScoreCardQuestion).filter(ScoreCardQuestion.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Update question fields (excluding template_id)
    update_data = data.dict(exclude={'template_id'})
    for field, value in update_data.items():
        setattr(question, field, value)
    
    db.commit()
    db.refresh(question)
    return question


@router.delete("/questions/{question_id}", status_code=204)
def delete_template_question(
    question_id: int,
    db: Session = Depends(get_db),
    role: str = Depends(get_current_user_role)
):
    """Delete a question (Admin/Principal/Dean IQAC/PA Principal only)"""
    if role not in ["admin", "principal", "pa_principal", "dean_iqac"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    question = db.query(ScoreCardQuestion).filter(ScoreCardQuestion.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    db.delete(question)
    db.commit()
    return Response(status_code=204)


# =====================================
# Bulk Question Management
# =====================================

@router.post("/templates/{template_id}/questions/bulk")
def create_questions_bulk(
    template_id: int,
    questions: List[schemas.ScoreCardQuestionCreate],
    db: Session = Depends(get_db),
    role: str = Depends(get_current_user_role)
):
    """Create multiple questions at once (Admin/Principal/Dean IQAC/PA Principal only)"""
    if role not in ["admin", "principal", "pa_principal", "dean_iqac"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify template exists
    template = db.query(ScoreCardTemplate).filter(ScoreCardTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    created_questions = []
    for question_data in questions:
        question_dict = question_data.dict()
        question_dict['template_id'] = template_id
        
        question = ScoreCardQuestion(**question_dict)
        db.add(question)
        created_questions.append(question)
    
    db.commit()
    
    # Refresh all questions
    for q in created_questions:
        db.refresh(q)
    
    return {
        "message": f"Created {len(created_questions)} questions",
        "template_id": template_id,
        "questions": created_questions
    }


@router.put("/templates/{template_id}/questions/reorder")
def reorder_template_questions(
    template_id: int,
    question_order: List[dict],  # [{"id": 1, "question_number": 1}, ...]
    db: Session = Depends(get_db),
    role: str = Depends(get_current_user_role)
):
    """Reorder questions in a template (Admin/Principal/Dean IQAC/PA Principal only)"""
    if role not in ["admin", "principal", "pa_principal", "dean_iqac"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Update question numbers
    for item in question_order:
        question = db.query(ScoreCardQuestion).filter(
            ScoreCardQuestion.id == item["id"],
            ScoreCardQuestion.template_id == template_id
        ).first()
        
        if question:
            question.question_number = item["question_number"]
    
    db.commit()
    
    return {"message": "Questions reordered successfully"}


# =====================================
# Template Statistics
# =====================================

@router.get("/templates/{template_id}/stats")
def get_template_statistics(
    template_id: int,
    db: Session = Depends(get_db)
):
    """Get statistics for a template"""
    template = db.query(ScoreCardTemplate).filter(ScoreCardTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    questions = db.query(ScoreCardQuestion).filter(
        ScoreCardQuestion.template_id == template_id
    ).all()
    
    total_questions = len(questions)
    total_score = sum(q.max_score for q in questions)
    document_required = len([q for q in questions if q.requires_document])
    
    # Group by question type
    question_types = {}
    for q in questions:
        question_types[q.question_type] = question_types.get(q.question_type, 0) + 1
    
    return {
        "template": template,
        "total_questions": total_questions,
        "total_possible_score": total_score,
        "questions_requiring_documents": document_required,
        "question_types_breakdown": question_types
    }


# =====================================
# Import/Export Questions (Advanced)
# =====================================

@router.get("/templates/{template_id}/export")
def export_template_questions(
    template_id: int,
    db: Session = Depends(get_db),
    role: str = Depends(get_current_user_role)
):
    """Export template questions as JSON (Admin/Principal/Dean IQAC/PA Principal only)"""
    if role not in ["admin", "principal", "pa_principal", "dean_iqac"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    template = db.query(ScoreCardTemplate).filter(ScoreCardTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    questions = db.query(ScoreCardQuestion).filter(
        ScoreCardQuestion.template_id == template_id
    ).order_by(ScoreCardQuestion.question_number).all()
    
    export_data = {
        "template": {
            "name": template.name,
            "description": template.description,
            "academic_year_id": template.academic_year_id,
            "is_active": template.is_active
        },
        "questions": [
            {
                "question_number": q.question_number,
                "question_text": q.question_text,
                "question_type": q.question_type,
                "max_score": q.max_score,
                "requires_document": q.requires_document,
                "is_mandatory": q.is_mandatory,
                "document_description": q.document_description,
                "document_formats": q.document_formats
            }
            for q in questions
        ]
    }
    
    return export_data


@router.post("/templates/{template_id}/import")
def import_template_questions(
    template_id: int,
    import_data: dict,  # JSON data with questions
    replace_existing: bool = False,
    db: Session = Depends(get_db),
    role: str = Depends(get_current_user_role)
):
    """Import questions from JSON data (Admin/Principal/Dean IQAC/PA Principal only)"""
    if role not in ["admin", "principal", "pa_principal", "dean_iqac"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    template = db.query(ScoreCardTemplate).filter(ScoreCardTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Optionally clear existing questions
    if replace_existing:
        db.query(ScoreCardQuestion).filter(
            ScoreCardQuestion.template_id == template_id
        ).delete()
    
    # Create new questions
    questions_data = import_data.get("questions", [])
    created_questions = []
    
    for question_data in questions_data:
        question_data['template_id'] = template_id
        question = ScoreCardQuestion(**question_data)
        db.add(question)
        created_questions.append(question)
    
    db.commit()
    
    return {
        "message": f"Imported {len(created_questions)} questions",
        "template_id": template_id,
        "replace_existing": replace_existing
    }
