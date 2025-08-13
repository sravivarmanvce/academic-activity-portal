"""
Test and fix script to check if events marked as 'completed' actually have all required documents
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.database import SessionLocal
from app.models import WorkflowStatus, Event, Document, AcademicYear
from datetime import datetime

def check_and_fix_completed_events():
    db = SessionLocal()
    
    try:
        print("🔍 Checking Events Marked as 'Completed'...")
        print("=" * 70)
        
        # Get all events marked as completed
        completed_events = db.query(Event).filter(Event.event_status == 'completed').all()
        
        print(f"Found {len(completed_events)} events marked as 'completed'")
        
        events_to_revert = []
        
        for event in completed_events:
            print(f"\n🔍 Event {event.id}: {event.title}")
            
            # Get all documents for this event (excluding deleted ones)
            event_docs = db.query(Document).filter(
                Document.event_id == event.id,
                Document.status != 'deleted',
                Document.is_latest_version == True
            ).all()
            
            print(f"   📄 Total documents: {len(event_docs)}")
            
            # Check for required document types
            required_types = ['complete_report', 'supporting_documents']
            missing_types = []
            
            for doc_type in required_types:
                type_docs = [doc for doc in event_docs if doc.document_type == doc_type]
                approved_docs = [doc for doc in type_docs if doc.status == 'approved']
                
                print(f"   📋 {doc_type}: {len(type_docs)} total, {len(approved_docs)} approved")
                
                if len(approved_docs) == 0:
                    missing_types.append(doc_type)
            
            if missing_types:
                print(f"   ❌ INVALID: Missing approved documents for: {', '.join(missing_types)}")
                events_to_revert.append((event, missing_types))
            else:
                print(f"   ✅ VALID: Has all required approved documents")
        
        if events_to_revert:
            print(f"\n🔧 Found {len(events_to_revert)} events that should be reverted to 'planned'")
            
            for event, missing_types in events_to_revert:
                print(f"   🔄 Reverting Event {event.id}: {event.title}")
                event.event_status = 'planned'
            
            # Also check and revert workflow statuses that should no longer be 'completed'
            affected_academic_years = set()
            for event, _ in events_to_revert:
                affected_academic_years.add((event.department_id, event.academic_year_id))
            
            print(f"\n🔍 Checking workflow statuses for {len(affected_academic_years)} department/academic year combinations...")
            
            for dept_id, academic_year_id in affected_academic_years:
                print(f"\n   📊 Department {dept_id}, Academic Year {academic_year_id}:")
                
                # Get all events for this department and academic year
                all_events = db.query(Event).filter(
                    Event.department_id == dept_id,
                    Event.academic_year_id == academic_year_id
                ).all()
                
                # After our reversion, check if all events are still completed
                completed_count = sum(1 for e in all_events if e.event_status == 'completed')
                print(f"      Events after reversion: {completed_count}/{len(all_events)} completed")
                
                # Update workflow status if needed
                workflow_status = db.query(WorkflowStatus).filter(
                    WorkflowStatus.department_id == dept_id,
                    WorkflowStatus.academic_year_id == academic_year_id
                ).first()
                
                if workflow_status and workflow_status.status == 'completed' and completed_count < len(all_events):
                    print(f"      🔄 Reverting workflow status from 'completed' to 'events_planned'")
                    workflow_status.status = 'events_planned'
                    workflow_status.updated_at = datetime.now()
                elif workflow_status:
                    print(f"      ✅ Workflow status '{workflow_status.status}' is correct")
            
            # Commit all changes
            db.commit()
            print(f"\n✅ Successfully reverted {len(events_to_revert)} events and updated workflow statuses!")
            
        else:
            print(f"\n✅ All completed events have the required approved documents!")
        
        print("=" * 70)
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    check_and_fix_completed_events()
