"""
Fix script to update workflow statuses that should be 'completed' but aren't
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.database import SessionLocal
from app.models import WorkflowStatus, Event, Document, AcademicYear
from datetime import datetime

def fix_workflow_statuses():
    db = SessionLocal()
    
    try:
        print("🔧 Fixing Workflow Status Mismatches...")
        print("=" * 60)
        
        # Get all workflow statuses
        workflow_statuses = db.query(WorkflowStatus).all()
        
        fixed_count = 0
        
        for status in workflow_statuses:
            print(f"\n🏢 Department {status.department_id}, Academic Year {status.academic_year_id}: {status.status}")
            
            # Get all events for this department and academic year
            events = db.query(Event).filter(
                Event.academic_year_id == status.academic_year_id,
                Event.department_id == status.department_id
            ).all()
            
            if not events:
                print("   ❌ No events found - skipping")
                continue
            
            print(f"   📊 Found {len(events)} events")
            
            # Check if all events are completed
            completed_events = [e for e in events if e.event_status == 'completed']
            all_events_completed = len(completed_events) == len(events) and len(events) > 0
            
            print(f"   ✅ {len(completed_events)}/{len(events)} events completed")
            
            # If all events are completed but workflow isn't 'completed', fix it
            if all_events_completed and status.status != 'completed':
                print(f"   🔧 FIXING: Updating workflow from '{status.status}' to 'completed'")
                
                status.status = 'completed'
                status.updated_at = datetime.now()
                fixed_count += 1
                
                # Verify that events actually have approved documents
                for event in events[:3]:  # Check first few events
                    docs = db.query(Document).filter(
                        Document.event_id == event.id,
                        Document.is_latest_version == True,
                        Document.status != 'deleted'
                    ).all()
                    
                    approved_docs = [d for d in docs if d.status == 'approved']
                    print(f"      📄 Event {event.id}: {len(approved_docs)}/{len(docs)} docs approved")
            
            elif not all_events_completed and status.status == 'completed':
                print(f"   ⚠️ WARNING: Workflow is 'completed' but not all events are done - leaving as is")
                
            else:
                print(f"   ✅ OK: Status '{status.status}' matches event completion")
        
        if fixed_count > 0:
            db.commit()
            print(f"\n🎉 Fixed {fixed_count} workflow status mismatches!")
        else:
            print(f"\n✅ No fixes needed - all workflow statuses are correct!")
        
        print(f"=" * 60)
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    fix_workflow_statuses()
