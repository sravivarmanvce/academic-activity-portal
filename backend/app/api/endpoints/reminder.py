from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models import Department, User, AcademicYear
from app.email_service import email_service
from datetime import datetime
from typing import List

router = APIRouter()

class ReminderRequest(BaseModel):
    dept_id: int
    academic_year_id: int

class BulkReminderRequest(BaseModel):
    dept_ids: List[int]
    academic_year_id: int

@router.post("/reminder/send")
async def send_reminder(request: ReminderRequest, db: Session = Depends(get_db)):
    try:
        # Get department info
        department = db.query(Department).filter(Department.id == request.dept_id).first()
        if not department:
            raise HTTPException(status_code=404, detail="Department not found")
        
        # Get academic year info
        academic_year = db.query(AcademicYear).filter(AcademicYear.id == request.academic_year_id).first()
        if not academic_year:
            raise HTTPException(status_code=404, detail="Academic year not found")
        
        # Get HoD email
        hod = db.query(User).filter(
            User.department_id == request.dept_id,
            User.role == "hod"
        ).first()
        
        if not hod:
            raise HTTPException(status_code=404, detail="HoD not found for this department")
        
        # Use the enhanced email service with professional HTML templates
        success = await email_service.send_deadline_reminder(
            user_email=hod.email,
            user_name=hod.name,
            department_name=department.name,
            academic_year=academic_year.year,
            deadline_date="2025-08-15",  # You can make this dynamic
            days_remaining=3,  # Calculate actual remaining days
            module_name="Budget Proposal Submission"
        )
        
        if success:
            return {"message": f"Enhanced reminder sent successfully to {department.name}"}
        else:
            raise HTTPException(status_code=500, detail="Failed to send email reminder")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send reminder: {str(e)}")

@router.post("/reminder/bulk-send")
async def send_bulk_reminder(request: BulkReminderRequest, db: Session = Depends(get_db)):
    """Send reminders to multiple departments at once"""
    try:
        results = []
        failed_departments = []
        
        # Get academic year info
        academic_year = db.query(AcademicYear).filter(AcademicYear.id == request.academic_year_id).first()
        if not academic_year:
            raise HTTPException(status_code=404, detail="Academic year not found")
        
        for dept_id in request.dept_ids:
            try:
                # Get department info
                department = db.query(Department).filter(Department.id == dept_id).first()
                if not department:
                    failed_departments.append(f"Department ID {dept_id} not found")
                    continue
                
                # Get HoD email
                hod = db.query(User).filter(
                    User.department_id == dept_id,
                    User.role == "hod"
                ).first()
                
                if not hod:
                    failed_departments.append(f"HoD not found for {department.name}")
                    continue
                
                # Send reminder using enhanced email service with HTML templates
                success = await email_service.send_deadline_reminder(
                    user_email=hod.email,
                    user_name=hod.name,
                    department_name=department.name,
                    academic_year=academic_year.year,
                    deadline_date="2025-08-15",  # Make dynamic
                    days_remaining=3,  # Calculate actual days
                    module_name="Budget Proposal Submission"
                )
                
                if success:
                    results.append(f"✅ {department.name}")
                else:
                    failed_departments.append(f"❌ {department.name} - Email failed")
                    
            except Exception as e:
                failed_departments.append(f"❌ {department.name if 'department' in locals() else f'Dept ID {dept_id}'} - {str(e)}")
        
        return {
            "message": f"Bulk reminder completed. {len(results)} successful, {len(failed_departments)} failed.",
            "successful": results,
            "failed": failed_departments
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send bulk reminders: {str(e)}")