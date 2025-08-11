import requests

BASE_URL = "http://localhost:8000"

def test_modal_scenario():
    print("=== Testing EventPlanningModal Scenario ===")
    
    dept_id = 2
    year_id = 1
    
    print(f"\nScenario: User views Department {dept_id}, Academic Year {year_id} in EventPlanningModal")
    
    # Step 1: Load actual events (what loadActualEvents() does)
    print("\n1. Loading actual events...")
    try:
        events_response = requests.get(f"{BASE_URL}/events", params={
            'department_id': dept_id,
            'academic_year_id': year_id
        })
        if events_response.status_code == 200:
            actual_events = events_response.json()
            print(f"   Found {len(actual_events)} actual events:")
            for event in actual_events:
                print(f"     - Event {event['id']}: '{event['title']}'")
        else:
            print(f"   Error: {events_response.status_code}")
            return
    except Exception as e:
        print(f"   Error: {e}")
        return
    
    # Step 2: Load documents (what loadDocuments() does)
    print("\n2. Loading documents...")
    try:
        docs_response = requests.get(f"{BASE_URL}/documents/list", params={
            'department_id': dept_id,
            'academic_year_id': year_id
        })
        if docs_response.status_code == 200:
            documents = docs_response.json()
            print(f"   Found {len(documents)} documents:")
            for doc in documents:
                print(f"     - Event {doc['event_id']}: {doc['doc_type']} ({doc.get('filename', 'N/A')})")
        else:
            print(f"   Error: {docs_response.status_code}")
            return
    except Exception as e:
        print(f"   Error: {e}")
        return
    
    # Step 3: Simulate getDocumentStatus() function for each event
    print("\n3. Simulating document status for each event:")
    
    for event in actual_events:
        print(f"\n   Event: '{event['title']}'")
        
        # Filter documents for this event
        event_docs = [doc for doc in documents if doc['event_id'] == event['id']]
        print(f"     Documents for this event: {len(event_docs)}")
        
        # Check document types
        has_report = any(doc['doc_type'] == 'report' for doc in event_docs)
        has_files = any(doc['doc_type'] in ['zipfile', 'files'] for doc in event_docs)
        
        print(f"     Report: {'Available' if has_report else 'Not available'}")
        print(f"     ZIP: {'Available' if has_files else 'Not available'}")
    
    print("\n4. Expected UI result:")
    print("   The EventPlanningModal should show:")
    print("   - Debug section listing available documents")
    print("   - For each event in the table, document status should show 'Available'")
    print("   - But this requires approvedProgramData to generate the event table rows")

if __name__ == "__main__":
    test_modal_scenario()
