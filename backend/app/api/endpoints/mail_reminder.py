# app/api/endpoints/mail_reminder.py
from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.reminder_email import send_reminder_email

router = APIRouter()

@router.post("/reminder/send")
def send_reminder(
    dept_id: int = Body(...),
    academic_year_id: int = Body(...),
    db: Session = Depends(get_db)
):
    dept = db.query(models.Department).filter_by(id=dept_id).first()
    if not dept:
        return {"error": "Department not found"}

    user = db.query(models.User).filter_by(department_id=dept_id).first()
    if not user:
        return {"error": "No user found for department"}

    to_email = user.email
    subject = f"Reminder: Program Entry Submission for {dept.name} ({academic_year_id})"
    body = f"Dear {dept.full_name},\n\nThis is a reminder to submit your program entry for the academic year {academic_year_id}. If already submitted, please ignore this message.\n\nRegards,\nAdmin"
    success = send_reminder_email(to_email, subject, body)
    if success:
        return {"message": "Reminder email sent successfully."}
    else:
        return {"error": "Failed to send reminder email."}
