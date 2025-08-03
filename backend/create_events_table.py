"""
Database migration script to create the events table
Run this script to create the events table in your database
"""

from app.database import SessionLocal, engine
from app.models import Base, Event
from sqlalchemy import text

def create_events_table():
    """Create the events table"""
    
    # Create the table using SQLAlchemy
    Base.metadata.create_all(bind=engine, tables=[Event.__table__])
    
    print("Events table created successfully!")

def verify_table_creation():
    """Verify that the events table was created"""
    db = SessionLocal()
    try:
        # Try to query the table structure
        result = db.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'events'"))
        columns = result.fetchall()
        
        if columns:
            print("\nEvents table structure:")
            for column in columns:
                print(f"  {column[0]}: {column[1]}")
        else:
            print("Events table not found!")
            
    except Exception as e:
        print(f"Error verifying table: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("Creating events table...")
    create_events_table()
    verify_table_creation()
