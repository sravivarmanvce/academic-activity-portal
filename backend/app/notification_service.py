# app/notification_service.py

from sqlalchemy.orm import Session
from app.models import Notification, User
from app.schemas import NotificationCreate
from datetime import datetime
import json
from typing import List, Optional, Dict

class NotificationService:
    def __init__(self):
        pass
    
    def create_notification(
        self, 
        db: Session, 
        user_id: int, 
        title: str, 
        message: str, 
        notification_type: str
    ) -> Notification:
        """Create a new notification for a user"""
        
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=notification_type,
            created_at=datetime.now()
        )
        
        db.add(notification)
        db.commit()
        db.refresh(notification)
        
        return notification
    
    def create_bulk_notifications(
        self, 
        db: Session, 
        user_ids: List[int], 
        title: str, 
        message: str, 
        notification_type: str
    ) -> List[Notification]:
        """Create notifications for multiple users"""
        
        notifications = []
        
        for user_id in user_ids:
            notification = Notification(
                user_id=user_id,
                title=title,
                message=message,
                type=notification_type,
                created_at=datetime.now()
            )
            db.add(notification)
            notifications.append(notification)
        
        db.commit()
        
        return notifications
    
    def get_user_notifications(
        self, 
        db: Session, 
        user_id: int, 
        limit: int = 50,
        unread_only: bool = False
    ) -> List[Notification]:
        """Get notifications for a specific user"""
        
        query = db.query(Notification).filter(Notification.user_id == user_id)
        
        if unread_only:
            query = query.filter(Notification.read == False)
        
        return query.order_by(Notification.created_at.desc()).limit(limit).all()
    
    def mark_as_read(self, db: Session, notification_id: int, user_id: int) -> bool:
        """Mark a notification as read"""
        
        notification = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).first()
        
        if notification:
            notification.read = True  # Updated to match your column name
            db.commit()
            return True
        
        return False
    
    def mark_all_as_read(self, db: Session, user_id: int) -> int:
        """Mark all notifications as read for a user"""
        
        count = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.read == False
        ).update({'read': True})
        
        db.commit()
        return count
    
    def get_unread_count(self, db: Session, user_id: int) -> int:
        """Get count of unread notifications for a user"""
        
        return db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.read == False
        ).count()
    
    def delete_notification(self, db: Session, notification_id: int, user_id: int) -> bool:
        """Delete a notification"""
        
        notification = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).first()
        
        if notification:
            db.delete(notification)
            db.commit()
            return True
        
        return False

    # Workflow-specific notification helpers
    def notify_budget_submission(
        self, 
        db: Session, 
        hod_id: int, 
        principal_id: int, 
        department_name: str,
        academic_year: str
    ):
        """Create notifications for budget submission workflow"""
        
        # Notify HoD about successful submission
        self.create_notification(
            db=db,
            user_id=hod_id,
            title="Budget Submitted Successfully",
            message=f"Your budget proposal for {department_name} has been submitted and is awaiting Principal approval.",
            notification_type="budget_submission"
        )
        
        # Notify Principal about new submission
        self.create_notification(
            db=db,
            user_id=principal_id,
            title="New Budget Proposal",
            message=f"A new budget proposal from {department_name} is awaiting your review and approval.",
            notification_type="budget_approval_pending"
        )
    
    def notify_budget_approval(
        self, 
        db: Session, 
        hod_id: int, 
        department_name: str,
        academic_year: str,
        approved: bool,
        remarks: Optional[str] = None
    ):
        """Create notification for budget approval/rejection"""
        
        if approved:
            title = "Budget Approved! 🎉"
            message = f"Your budget proposal for {department_name} has been approved by the Principal. You can now start planning individual events."
            notification_type = "budget_approved"
        else:
            title = "Budget Requires Revision"
            message = f"Your budget proposal for {department_name} needs revision. Please check the remarks and resubmit."
            notification_type = "budget_rejected"
        
        if remarks:
            message += f" Remarks: {remarks}"
        
        self.create_notification(
            db=db,
            user_id=hod_id,
            title=title,
            message=message,
            notification_type=notification_type
        )
    
    def notify_deadline_reminder(
        self, 
        db: Session, 
        user_id: int, 
        department_name: str,
        deadline_date: str,
        days_remaining: int,
        module_name: str = "Budget Submission"
    ):
        """Create deadline reminder notification"""
        
        urgency = "🔴 Urgent" if days_remaining <= 1 else "⚠️ Reminder"
        
        self.create_notification(
            db=db,
            user_id=user_id,
            title=f"{urgency}: {module_name} Deadline",
            message=f"Reminder: {module_name} deadline is in {days_remaining} day(s). Please complete your submission for {department_name}.",
            notification_type="deadline_reminder"
        )
    
    def notify_event_submission(
        self, 
        db: Session, 
        hod_id: int, 
        principal_id: int, 
        department_name: str,
        academic_year: str,
        event_count: int = 0
    ):
        """Create notifications for event submission workflow"""
        
        # Notify HoD about successful event submission
        event_text = f"{event_count} events" if event_count > 0 else "event details"
        self.create_notification(
            db=db,
            user_id=hod_id,
            title="Events Submitted Successfully",
            message=f"Your {event_text} for {department_name} have been submitted and are awaiting Principal review.",
            notification_type="event_submission"
        )
        
        # Notify Principal about new event submission
        self.create_notification(
            db=db,
            user_id=principal_id,
            title="New Event Submissions",
            message=f"New event submissions from {department_name} are awaiting your review. {event_text.capitalize()} have been submitted for {academic_year}.",
            notification_type="event_approval_pending"
        )

# Create a singleton instance
notification_service = NotificationService()
