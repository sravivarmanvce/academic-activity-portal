# app/api/endpoints/notifications_inbox.py

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.notification_service import notification_service
from app.schemas import NotificationOut, NotificationUpdate
from app.dependencies import get_current_user_role, get_current_user_id
from app.models import User

router = APIRouter()

@router.get("/notifications", response_model=List[NotificationOut])
async def get_notifications(
    unread_only: bool = Query(False, description="Only return unread notifications"),
    limit: int = Query(50, description="Maximum number of notifications to return"),
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Get notifications for the current user"""
    
    notifications = notification_service.get_user_notifications(
        db=db,
        user_id=current_user_id,
        limit=limit,
        unread_only=unread_only
    )
    
    return notifications

@router.get("/notifications/unread-count")
async def get_unread_count(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Get count of unread notifications"""
    
    count = notification_service.get_unread_count(db=db, user_id=current_user_id)
    return {"unread_count": count}

@router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Mark a specific notification as read"""
    
    success = notification_service.mark_as_read(
        db=db,
        notification_id=notification_id,
        user_id=current_user_id
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification marked as read"}

@router.patch("/notifications/mark-all-read")
async def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Mark all notifications as read for the current user"""
    
    count = notification_service.mark_all_as_read(db=db, user_id=current_user_id)
    return {"message": f"Marked {count} notifications as read"}

@router.delete("/notifications/{notification_id}")
async def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    """Delete a notification"""
    
    success = notification_service.delete_notification(
        db=db,
        notification_id=notification_id,
        user_id=current_user_id
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification deleted"}

# Admin endpoints for creating notifications (for testing)
# Commented out for production - uncomment if needed for development
# @router.post("/notifications/create-test")
# async def create_test_notification(
#     db: Session = Depends(get_db),
#     current_user_role: str = Depends(get_current_user_role),
#     current_user_id: int = Depends(get_current_user_id)
# ):
#     """Create a test notification (for development/testing)"""
#     
#     notification = notification_service.create_notification(
#         db=db,
#         user_id=current_user_id,
#         title="Test Notification",
#         message=f"This is a test notification created by {current_user_role} to verify the system is working correctly.",
#         notification_type="test"
#     )
#     
#     return {"message": "Test notification created", "notification_id": notification.id}
