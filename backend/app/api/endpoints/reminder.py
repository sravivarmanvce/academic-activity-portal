from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models import Department, User
from app.reminder_email import send_reminder_email

router = APIRouter()

class ReminderRequest(BaseModel):
    dept_id: int
    academic_year_id: int

@router.post("/reminder/send")
def send_reminder(request: ReminderRequest, db: Session = Depends(get_db)):
    try:
        # Get department info
        department = db.query(Department).filter(Department.id == request.dept_id).first()
        if not department:
            raise HTTPException(status_code=404, detail="Department not found")
        
        # Get HoD email
        hod = db.query(User).filter(
            User.department_id == request.dept_id,
            User.role == "hod"
        ).first()
        
        if not hod:
            raise HTTPException(status_code=404, detail="HoD not found for this department")
        
        # Compose email
        subject = f"Reminder: Budget Proposal Submission for {department.name}"
        body = f"""Dear HoD of {department.name},

This is a reminder that your department's budget proposal for student activities has not been submitted yet for the current academic year.

Please log in to the portal and submit your budget proposal at your earliest convenience.

Thank you.
Academic Activity Portal"""
        
        # Send email using your existing function
        success = send_reminder_email(hod.email, subject, body)
        
        if success:
            return {"message": f"Reminder sent successfully to {department.name}"}
        else:
            raise HTTPException(status_code=500, detail="Failed to send email")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send reminder: {str(e)}")