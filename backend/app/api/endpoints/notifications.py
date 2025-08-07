# app/api/endpoints/notifications.py

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from app.email_service import email_service
from app.dependencies import get_current_user_role

router = APIRouter()

class EmailNotificationRequest(BaseModel):
    to_emails: List[EmailStr]
    notification_type: str  # 'budget_submission', 'budget_approval', 'event_submission', 'deadline_reminder'
    data: dict  # Contains template-specific data

class BudgetSubmissionData(BaseModel):
    hod_email: EmailStr
    hod_name: str
    department_name: str
    academic_year: str
    principal_email: EmailStr
    principal_name: Optional[str] = "Principal"

class BudgetApprovalData(BaseModel):
    hod_email: EmailStr
    hod_name: str
    department_name: str
    academic_year: str
    approved: bool
    remarks: Optional[str] = ""

class EventSubmissionData(BaseModel):
    hod_email: EmailStr
    hod_name: str
    department_name: str
    academic_year: str
    principal_email: EmailStr
    principal_name: Optional[str] = "Principal"
    event_count: int

class DeadlineReminderData(BaseModel):
    user_email: EmailStr
    user_name: str
    department_name: str
    academic_year: str
    deadline_date: str
    days_remaining: int
    module_name: Optional[str] = "Budget Submission"

@router.post("/send-budget-submission-notification")
async def send_budget_submission_notification(
    data: BudgetSubmissionData,
    current_user_role: str = Depends(get_current_user_role)
):
    """Send notification when HoD submits budget for approval"""
    try:
        success = await email_service.send_budget_submission_notification(
            hod_email=data.hod_email,
            hod_name=data.hod_name,
            department_name=data.department_name,
            academic_year=data.academic_year,
            principal_email=data.principal_email,
            principal_name=data.principal_name
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to send email notification")
            
        return {"message": "Budget submission notification sent successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sending notification: {str(e)}")

@router.post("/send-budget-approval-notification")
async def send_budget_approval_notification(
    data: BudgetApprovalData,
    current_user_role: str = Depends(get_current_user_role)
):
    """Send notification when Principal approves/rejects budget"""
    try:
        success = await email_service.send_budget_approval_notification(
            hod_email=data.hod_email,
            hod_name=data.hod_name,
            department_name=data.department_name,
            academic_year=data.academic_year,
            approved=data.approved,
            remarks=data.remarks
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to send email notification")
            
        return {"message": "Budget approval notification sent successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sending notification: {str(e)}")

@router.post("/send-event-submission-notification")
async def send_event_submission_notification(
    data: EventSubmissionData,
    current_user_role: str = Depends(get_current_user_role)
):
    """Send notification when HoD submits events for approval"""
    try:
        success = await email_service.send_event_submission_notification(
            hod_email=data.hod_email,
            hod_name=data.hod_name,
            department_name=data.department_name,
            academic_year=data.academic_year,
            principal_email=data.principal_email,
            principal_name=data.principal_name,
            event_count=data.event_count
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to send email notification")
            
        return {"message": "Event submission notification sent successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sending notification: {str(e)}")

@router.post("/send-deadline-reminder")
async def send_deadline_reminder(
    data: DeadlineReminderData,
    current_user_role: str = Depends(get_current_user_role)
):
    """Send deadline reminder notification"""
    try:
        success = await email_service.send_deadline_reminder(
            user_email=data.user_email,
            user_name=data.user_name,
            department_name=data.department_name,
            academic_year=data.academic_year,
            deadline_date=data.deadline_date,
            days_remaining=data.days_remaining,
            module_name=data.module_name
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to send email notification")
            
        return {"message": "Deadline reminder sent successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sending notification: {str(e)}")

@router.post("/test-email")
async def test_email(
    to_email: EmailStr,
    current_user_role: str = Depends(get_current_user_role)
):
    """Test email functionality"""
    try:
        success = await email_service.send_email(
            to_emails=[to_email],
            subject="Test Email from Academic Activity Portal",
            template_name="deadline_reminder.html",
            template_data={
                "user_name": "Test User",
                "department_name": "Test Department",
                "academic_year": "2024-25",
                "deadline_date": "2025-08-10",
                "days_remaining": 3,
                "module_name": "Test Module",
                "portal_url": "http://localhost:3000",
                "year": "2025"
            }
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to send test email")
            
        return {"message": f"Test email sent successfully to {to_email}"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error sending test email: {str(e)}")
