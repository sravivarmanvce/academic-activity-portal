# Test script to create sample notifications
# Run this to test the notification system

from app.database import get_db
from app.notification_service import notification_service
from app.models import User

def create_sample_notifications():
    """Create some sample notifications for testing"""
    
    db = next(get_db())
    
    try:
        # Check if we have any users in the database
        users = db.query(User).limit(3).all()
        
        if not users:
            print("❌ No users found in database. Please add some users first.")
            return
        
        print(f"📋 Found {len(users)} users in database")
        
        # Create sample notifications for the first user
        user = users[0]
        print(f"👤 Creating notifications for user: {user.name} ({user.email})")
        
        # Create different types of notifications
        notifications_data = [
            {
                "title": "Welcome to the Portal! 🎉",
                "message": "Welcome to the Academic Activity Portal. You can now manage your department's budget and events.",
                "type": "welcome"
            },
            {
                "title": "Budget Submission Deadline Approaching",
                "message": "Your budget submission is due in 3 days. Please complete your proposal.",
                "type": "deadline_reminder"
            },
            {
                "title": "System Update",
                "message": "The portal has been updated with new features for better user experience.",
                "type": "system_update"
            }
        ]
        
        created_notifications = []
        for notif_data in notifications_data:
            notification = notification_service.create_notification(
                db=db,
                user_id=user.id,
                title=notif_data["title"],
                message=notif_data["message"],
                notification_type=notif_data["type"]
            )
            created_notifications.append(notification)
            print(f"✅ Created notification: {notification.title}")
        
        print(f"\n🎯 Successfully created {len(created_notifications)} sample notifications!")
        
        # Test retrieving notifications
        retrieved_notifications = notification_service.get_user_notifications(
            db=db,
            user_id=user.id,
            limit=10
        )
        
        print(f"📖 Retrieved {len(retrieved_notifications)} notifications for user")
        
        # Test unread count
        unread_count = notification_service.get_unread_count(db=db, user_id=user.id)
        print(f"🔔 Unread notifications: {unread_count}")
        
        print("\n✅ Notification system is working correctly!")
        print("🌐 You can now test the API endpoints at http://127.0.0.1:8000/docs")
        
    except Exception as e:
        print(f"❌ Error creating sample notifications: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    create_sample_notifications()
