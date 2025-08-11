import requests

BASE_URL = "http://localhost:8000"

def test_final_verification():
    print("=== FINAL VERIFICATION: EEE 2025-2026 Document Status ===")
    
    dept_id = 2  # EEE
    year_id = 1  # 2025-2026
    
    print(f"\nTesting EEE (Department {dept_id}), 2025-2026 (Academic Year {year_id})")
    
    # Test events
    try:
        events_response = requests.get(f"{BASE_URL}/events", params={
            'department_id': dept_id,
            'academic_year_id': year_id
        })
        if events_response.status_code == 200:
            events = events_response.json()
            print(f"\n✅ Events: {len(events)} found")
            for event in events:
                print(f"   - Event {event['id']}: '{event['title']}'")
        else:
            print(f"\n❌ Events: Error {events_response.status_code}")
            return
    except Exception as e:
        print(f"\n❌ Events: Error - {e}")
        return

    # Test documents
    try:
        docs_response = requests.get(f"{BASE_URL}/documents/list", params={
            'department_id': dept_id,
            'academic_year_id': year_id
        })
        if docs_response.status_code == 200:
            documents = docs_response.json()
            print(f"\n✅ Documents: {len(documents)} found")
            for doc in documents:
                print(f"   - Event {doc['event_id']}: {doc['doc_type']} ({doc.get('filename', 'N/A')})")
        else:
            print(f"\n❌ Documents: Error {docs_response.status_code}")
            return
    except Exception as e:
        print(f"\n❌ Documents: Error - {e}")
        return

    # Show expected UI behavior
    print(f"\n=== EXPECTED UI BEHAVIOR ===")
    print(f"When you navigate to:")
    print(f"1. DocumentManagement page and select 'EEE' department + '2025-2026' academic year")
    print(f"2. OR open EventPlanningModal for EEE department, 2025-2026 academic year")
    print(f"\nYou should see:")
    
    # Group documents by event
    events_with_docs = {}
    for doc in documents:
        event_id = doc['event_id']
        if event_id not in events_with_docs:
            events_with_docs[event_id] = {'report': False, 'files': False, 'event_name': ''}
        
        if doc['doc_type'] == 'report':
            events_with_docs[event_id]['report'] = True
        elif doc['doc_type'] in ['zipfile', 'files']:
            events_with_docs[event_id]['files'] = True
    
    # Add event names
    for event in events:
        if event['id'] in events_with_docs:
            events_with_docs[event['id']]['event_name'] = event['title']
    
    for event_id, info in events_with_docs.items():
        event_name = info['event_name']
        print(f"\n📄 Event: '{event_name}'")
        print(f"   Report: {'✅ Available' if info['report'] else '❌ Not available'}")  
        print(f"   ZIP: {'✅ Available' if info['files'] else '❌ Not available'}")

    print(f"\n=== TROUBLESHOOTING ===")
    print(f"If documents still show 'Not available':")
    print(f"1. Restart the backend server: cd backend && python -m uvicorn app.main:app --reload")
    print(f"2. Refresh the frontend browser page")
    print(f"3. Select the correct department (EEE) and academic year (2025-2026)")
    print(f"4. Check browser console for any API errors")

if __name__ == "__main__":
    test_final_verification()
