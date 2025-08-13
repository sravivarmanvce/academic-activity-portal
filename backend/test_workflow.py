#!/usr/bin/env python3
"""
Test Workflow Status Update
This script tests the automatic workflow status update when all documents are approved.
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

def test_workflow_status():
    """Test that workflow status updates correctly based on academic year"""
    
    # Load environment variables
    env_path = backend_dir / '.env'
    load_dotenv(env_path)
    
    db = SessionLocal()
    
    try:
        print("🔍 Testing academic year-based workflow status update logic...")
        
        # Get all academic years with events
        academic_years = db.query(Event.academic_year_id).distinct().all()
        academic_year_ids = [ay[0] for ay in academic_years if ay[0] is not None]
        
        print(f"📊 Found {len(academic_year_ids)} academic years with events")
        
        for academic_year_id in academic_year_ids:
            print(f"\n📅 Academic Year ID: {academic_year_id}")
            
            # Get all events in this academic year
            year_events = db.query(Event).filter(Event.academic_year_id == academic_year_id).all()
            print(f"   Events in year: {len(year_events)}")
            
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
                    print(f"      Event {event.id} ({event.title}): No documents - SKIPPED")
                    continue
                
                events_with_docs += 1
                
                # Count document types and statuses
                report_docs = [doc for doc in docs if doc.document_type == 'complete_report']
                zip_docs = [doc for doc in docs if doc.document_type == 'supporting_documents']
                
                approved_reports = [doc for doc in report_docs if doc.status == 'approved']
                approved_zips = [doc for doc in zip_docs if doc.status == 'approved']
                
                event_ready = (
                    len(report_docs) > 0 and len(approved_reports) > 0 and
                    len(zip_docs) > 0 and len(approved_zips) > 0
                )
                
                print(f"      Event {event.id} ({event.title}): Status={event.event_status}, Ready={event_ready}")
                print(f"         Reports: {len(report_docs)} (approved: {len(approved_reports)})")
                print(f"         ZIPs: {len(zip_docs)} (approved: {len(approved_zips)})")
                
                if not event_ready:
                    all_year_events_ready = False
            
            print(f"   Events with documents: {events_with_docs}")
            print(f"   All events ready: {all_year_events_ready}")
            
            # Check if status matches expectation
            completed_events = [e for e in year_events if e.event_status == 'completed']
            
            if all_year_events_ready and events_with_docs > 0:
                if len(completed_events) == 0:
                    print(f"   ⚠️ All events are ready but none marked as 'completed'")
                else:
                    print(f"   ✅ {len(completed_events)} events correctly marked as 'completed'")
            elif not all_year_events_ready:
                if len(completed_events) > 0:
                    print(f"   ⚠️ {len(completed_events)} events marked 'completed' but not all are ready")
                else:
                    print(f"   ✅ No events marked 'completed' (correct - not all ready)")
    
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_workflow_status()
