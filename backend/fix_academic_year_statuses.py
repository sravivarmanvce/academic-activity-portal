#!/usr/bin/env python3
"""
Fix Academic Year Event Statuses
This script updates event statuses to 'completed' only when ALL events in the academic year have approved documents.
"""

import os
import sys
from pathlib import Path
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.append(str(backend_dir))

from app.database import SessionLocal
from app.models import Event, Document

def fix_academic_year_statuses():
    """Update event statuses based on academic year completion logic"""
    
    # Load environment variables
    env_path = backend_dir / '.env'
    load_dotenv(env_path)
    
    db = SessionLocal()
    
    try:
        print("🔧 Fixing event statuses based on academic year logic...")
        
        # First, reset all events to 'planned' to start fresh
        all_events = db.query(Event).all()
        for event in all_events:
            if event.event_status == 'completed':
                event.event_status = 'planned'
        
        print(f"🔄 Reset all {len(all_events)} events to 'planned' status")
        
        # Get all academic years with events
        academic_years = db.query(Event.academic_year_id).distinct().all()
        academic_year_ids = [ay[0] for ay in academic_years if ay[0] is not None]
        
        updated_years = 0
        total_updated_events = 0
        
        for academic_year_id in academic_year_ids:
            print(f"\n📅 Processing Academic Year ID: {academic_year_id}")
            
            # Get all events in this academic year
            year_events = db.query(Event).filter(Event.academic_year_id == academic_year_id).all()
            
            all_year_events_ready = True
            events_with_docs = 0
            
            for event in year_events:
                # Get all documents for this event
                docs = db.query(Document).filter(
                    Document.event_id == event.id,
                    Document.status != 'deleted',
                    Document.is_latest_version == True
                ).all()
                
                if not docs:
                    # No documents for this event, skip it
                    continue
                
                events_with_docs += 1
                
                # Check for required document types
                required_types = ['complete_report', 'supporting_documents']
                event_has_all_required = True
                
                for doc_type in required_types:
                    type_docs = [doc for doc in docs if doc.document_type == doc_type]
                    if type_docs:  # If there are documents of this type
                        if not any(doc.status == 'approved' for doc in type_docs):
                            event_has_all_required = False
                            break
                    else:
                        # No documents of required type exist, event is incomplete
                        event_has_all_required = False
                        break
                
                if not event_has_all_required:
                    all_year_events_ready = False
                    break
            
            print(f"   Events in year: {len(year_events)}")
            print(f"   Events with documents: {events_with_docs}")
            print(f"   All events ready: {all_year_events_ready}")
            
            # Update all events in the academic year to 'completed' if all are ready
            if all_year_events_ready and events_with_docs > 0:
                for event in year_events:
                    if event.event_status != 'completed':
                        event.event_status = 'completed'
                        total_updated_events += 1
                        print(f"   ✅ Updated Event {event.id} ({event.title}) to 'completed'")
                updated_years += 1
        
        # Commit all changes
        db.commit()
        
        print(f"\n🎉 Successfully updated {total_updated_events} events across {updated_years} academic years")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_academic_year_statuses()
