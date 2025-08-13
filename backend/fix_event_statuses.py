#!/usr/bin/env python3
"""
Fix Existing Event Statuses
This script updates existing events to 'completed' status if all their documents are approved.
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

def fix_event_statuses():
    """Update event statuses to 'completed' where all documents are approved"""
    
    # Load environment variables
    env_path = backend_dir / '.env'
    load_dotenv(env_path)
    
    db = SessionLocal()
    
    try:
        print("🔧 Fixing existing event statuses...")
        
        # Find events with documents
        events_with_docs = db.query(Event).join(Document, Event.id == Document.event_id).distinct().all()
        
        updated_count = 0
        
        for event in events_with_docs:
            # Get all documents for this event
            docs = db.query(Document).filter(
                Document.event_id == event.id,
                Document.status != 'deleted',
                Document.is_latest_version == True
            ).all()
            
            # Count document types and statuses
            report_docs = [doc for doc in docs if doc.document_type == 'complete_report']
            zip_docs = [doc for doc in docs if doc.document_type == 'supporting_documents']
            
            approved_reports = [doc for doc in report_docs if doc.status == 'approved']
            approved_zips = [doc for doc in zip_docs if doc.status == 'approved']
            
            has_all_approved = (
                len(report_docs) > 0 and len(approved_reports) > 0 and
                len(zip_docs) > 0 and len(approved_zips) > 0
            )
            
            # Update event status if needed
            if has_all_approved and event.event_status != 'completed':
                event.event_status = 'completed'
                updated_count += 1
                print(f"✅ Updated Event {event.id} ({event.title}) to 'completed'")
        
        # Commit all changes
        db.commit()
        
        print(f"\n🎉 Successfully updated {updated_count} events to 'completed' status")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_event_statuses()
