# Database migration script to create notifications table
# Run this to create the notifications table

import sys
import os

# Add the parent directory to sys.path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine
from app.models import Base

def create_notifications_table():
    """Create the notifications table"""
    try:
        # Create all tables (this will only create missing ones)
        Base.metadata.create_all(bind=engine)
        print("✅ Notifications table created successfully!")
        
        # Test the table creation
        from sqlalchemy import text
        with engine.connect() as conn:
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='notifications';"))
            table_exists = result.fetchone()
            
            if table_exists:
                print("✅ Confirmed: notifications table exists in database")
                
                # Show table structure
                result = conn.execute(text("PRAGMA table_info(notifications);"))
                columns = result.fetchall()
                print("\n📋 Table structure:")
                for col in columns:
                    print(f"   {col[1]} ({col[2]})")
            else:
                print("❌ Table creation may have failed")
                
    except Exception as e:
        print(f"❌ Error creating notifications table: {e}")

if __name__ == "__main__":
    create_notifications_table()
