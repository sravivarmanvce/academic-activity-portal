# app/api/endpoints/deadline_override.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import DeadlineOverride, User, Department, AcademicYear
from app.schemas import DeadlineOverrideCreate, DeadlineOverrideResponse
from app.notification_service import notification_service
from datetime import datetime, timedelta

router = APIRouter()

@router.post("/deadline-override")
def create_deadline_override(
    override_data: DeadlineOverrideCreate,
    db: Session = Depends(get_db)
):
    """Create a deadline override for a specific department"""
    
    # Check if override already exists
    existing = db.query(DeadlineOverride).filter(
        DeadlineOverride.department_id == override_data.department_id,
        DeadlineOverride.academic_year_id == override_data.academic_year_id,
        DeadlineOverride.module_name == override_data.module_name
    ).first()
    
    if existing:
        # Update existing override with new expiration time
        now = datetime.now()
        existing.enabled_by_principal = override_data.enabled_by_principal
        existing.reason = override_data.reason
        existing.duration_hours = override_data.duration_hours
        existing.expires_at = now + timedelta(hours=override_data.duration_hours)
        existing.created_at = now
        db.commit()
        db.refresh(existing)
        return {"message": "Deadline override updated", "override": existing}
    else:
        # Create new override with expiration time
        now = datetime.now()
        override = DeadlineOverride(
            department_id=override_data.department_id,
            academic_year_id=override_data.academic_year_id,
            module_name=override_data.module_name,
            enabled_by_principal=override_data.enabled_by_principal,
            reason=override_data.reason,
            duration_hours=override_data.duration_hours,
            expires_at=now + timedelta(hours=override_data.duration_hours),
            created_at=now
        )
        db.add(override)
        db.commit()
        db.refresh(override)
        
        # Send notification to HoD about deadline extension
        try:
            send_deadline_override_notification(
                db=db,
                department_id=override_data.department_id,
                academic_year_id=override_data.academic_year_id,
                module_name=override_data.module_name,
                duration_hours=override_data.duration_hours,
                reason=override_data.reason
            )
        except Exception as e:
            print(f"Warning: Failed to send deadline override notification: {str(e)}")
        
        return {"message": "Deadline override created", "override": override}

@router.get("/deadline-override")
def get_deadline_override(
    department_id: int,
    academic_year_id: int,
    module_name: str,
    db: Session = Depends(get_db)
):
    """Check if a deadline override exists and is still valid for a department"""
    override = db.query(DeadlineOverride).filter(
        DeadlineOverride.department_id == department_id,
        DeadlineOverride.academic_year_id == academic_year_id,
        DeadlineOverride.module_name == module_name,
        DeadlineOverride.enabled_by_principal == True
    ).first()
    
    if override:
        # Check if override has expired
        now = datetime.now()
        if override.expires_at and override.expires_at < now:
            # Override has expired
            return {
                "has_override": False, 
                "expired": True,
                "expired_at": override.expires_at,
                "override": override
            }
        else:
            # Override is still valid
            return {
                "has_override": True, 
                "expired": False,
                "expires_at": override.expires_at,
                "override": override
            }
    else:
        return {"has_override": False, "expired": False}

@router.get("/deadline-overrides/list")
def list_deadline_overrides(
    academic_year_id: int = None,
    db: Session = Depends(get_db)
):
    """Get a list of all deadline overrides (for admin/principal view)"""
    query = db.query(DeadlineOverride)
    
    if academic_year_id:
        query = query.filter(DeadlineOverride.academic_year_id == academic_year_id)
    
    overrides = query.all()
    
    # Add status for each override
    now = datetime.now()
    result = []
    for override in overrides:
        status = "active"
        if override.expires_at and override.expires_at < now:
            status = "expired"
        elif not override.enabled_by_principal:
            status = "disabled"
            
        result.append({
            "id": override.id,
            "department_id": override.department_id,
            "academic_year_id": override.academic_year_id,
            "module_name": override.module_name,
            "reason": override.reason,
            "duration_hours": override.duration_hours,
            "expires_at": override.expires_at,
            "created_at": override.created_at,
            "status": status
        })
    
    return {"overrides": result}

@router.put("/deadline-override/extend")
def extend_deadline_override(
    department_id: int,
    academic_year_id: int,
    module_name: str,
    additional_hours: int,
    db: Session = Depends(get_db)
):
    """Extend an existing deadline override by additional hours"""
    override = db.query(DeadlineOverride).filter(
        DeadlineOverride.department_id == department_id,
        DeadlineOverride.academic_year_id == academic_year_id,
        DeadlineOverride.module_name == module_name
    ).first()
    
    if not override:
        raise HTTPException(status_code=404, detail="Override not found")
    
    # Extend the expiration time
    if override.expires_at:
        override.expires_at = override.expires_at + timedelta(hours=additional_hours)
    else:
        # If no expiration was set, set it from now
        override.expires_at = datetime.now() + timedelta(hours=additional_hours)
    
    override.duration_hours = (override.duration_hours or 0) + additional_hours
    
    db.commit()
    db.refresh(override)
    
    return {
        "message": f"Override extended by {additional_hours} hours", 
        "override": override
    }

@router.delete("/deadline-override")
def remove_deadline_override(
    department_id: int,
    academic_year_id: int,
    module_name: str,
    db: Session = Depends(get_db)
):
    """Remove a deadline override"""
    override = db.query(DeadlineOverride).filter(
        DeadlineOverride.department_id == department_id,
        DeadlineOverride.academic_year_id == academic_year_id,
        DeadlineOverride.module_name == module_name
    ).first()
    
    if override:
        db.delete(override)
        db.commit()
        return {"message": "Deadline override removed"}
    else:
        raise HTTPException(status_code=404, detail="Override not found")

def send_deadline_override_notification(
    db: Session,
    department_id: int,
    academic_year_id: int,
    module_name: str,
    duration_hours: int,
    reason: str
):
    """Send notification to HoD about deadline extension"""
    
    # Get department, academic year, and HoD info
    department = db.query(Department).filter(Department.id == department_id).first()
    academic_year = db.query(AcademicYear).filter(AcademicYear.id == academic_year_id).first()
    hod = db.query(User).filter(
        User.department_id == department_id,
        User.role == 'hod'
    ).first()
    
    if department and academic_year and hod:
        # Calculate new deadline
        hours_text = f"{duration_hours} hours" if duration_hours > 1 else "1 hour"
        
        notification_service.create_notification(
            db=db,
            user_id=hod.id,
            title=f"Deadline Extended: {module_name} ⏰",
            message=f"Good news! The Principal has granted a {hours_text} extension for {module_name} submission. Reason: {reason}",
            notification_type="deadline_extension"
        )
