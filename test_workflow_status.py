"""
Test script to verify workflow status updates when documents are approved/rejected/deleted
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.database import SessionLocal
from app.models import WorkflowStatus, Event, Document, AcademicYear

def test_workflow_status():
    db = SessionLocal()
    
    try:
        print("🔍 Testing Workflow Status Updates...")
        print("=" * 60)
        
        # Check all academic years and their workflow status
        academic_years = db.query(AcademicYear).all()
        
        for academic_year in academic_years:
            print(f"\n📅 Academic Year: {academic_year.year}")
            
            # Get workflow status for each department in this academic year
            workflow_statuses = db.query(WorkflowStatus).filter(
                WorkflowStatus.academic_year_id == academic_year.id
            ).all()
            
            if not workflow_statuses:
                print("   ❌ No workflow status records found")
                continue
            
            for status in workflow_statuses:
                print(f"   🏢 Department {status.department_id}: {status.status}")
                
                # Get events for this department and academic year
                events = db.query(Event).filter(
                    Event.academic_year_id == academic_year.id,
                    Event.department_id == status.department_id
                ).all()
                
                if not events:
                    print(f"      ❌ No events found")
                    continue
                
                print(f"      📊 Events: {len(events)} total")
                
                # Check event statuses
                completed_events = [e for e in events if e.event_status == 'completed']
                planned_events = [e for e in events if e.event_status == 'planned']
                
                print(f"      ✅ Completed: {len(completed_events)}")
                print(f"      📋 Planned: {len(planned_events)}")
                
                # Check if workflow status matches event completion
                all_events_completed = len(events) > 0 and len(completed_events) == len(events)
                
                if all_events_completed and status.status != 'completed':
                    print(f"      ⚠️ MISMATCH: All events completed but workflow is '{status.status}'")
                elif not all_events_completed and status.status == 'completed':
                    print(f"      ⚠️ MISMATCH: Workflow is 'completed' but not all events are done")
                else:
                    print(f"      ✅ MATCH: Workflow status '{status.status}' matches event completion")
                
                # Show document status for completed events
                for event in completed_events[:3]:  # Show first 3 completed events
                    docs = db.query(Document).filter(
                        Document.event_id == event.id,
                        Document.is_latest_version == True,
                        Document.status != 'deleted'
                    ).all()
                    
                    approved_docs = [d for d in docs if d.status == 'approved']
                    print(f"         📄 Event {event.id}: {len(approved_docs)}/{len(docs)} docs approved")
        
        print(f"\n" + "=" * 60)
        print("🏁 Workflow status test completed!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_workflow_status()
