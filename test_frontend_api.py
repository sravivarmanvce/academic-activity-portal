import requests

BASE_URL = "http://localhost:8000"

def test_frontend_documents():
    print("=== Testing Frontend Document Access ===")
    
    # Test the specific department/year combo that has data
    dept_id = 2
    year_id = 1
    
    print(f"\nTesting Department {dept_id}, Academic Year {year_id}")
    
    # Test documents endpoint (how frontend calls it)
    try:
        docs_response = requests.get(f"{BASE_URL}/documents/list", params={
            'department_id': dept_id,
            'academic_year_id': year_id
        })
        if docs_response.status_code == 200:
            documents = docs_response.json()
            print(f"Documents API: {len(documents)} documents found")
            
            if documents:
                # Group by event
                events_with_docs = {}
                for doc in documents:
                    event_id = doc['event_id']
                    if event_id not in events_with_docs:
                        events_with_docs[event_id] = {'report': False, 'files': False}
                    
                    if doc['doc_type'] == 'report':
                        events_with_docs[event_id]['report'] = True
                    elif doc['doc_type'] == 'zipfile':
                        events_with_docs[event_id]['files'] = True
                
                print("\nDocument Status by Event:")
                for event_id, status in events_with_docs.items():
                    print(f"  Event {event_id}:")
                    print(f"    Report: {'Available' if status['report'] else 'Not available'}")
                    print(f"    ZIP: {'Available' if status['files'] else 'Not available'}")
        else:
            print(f"Documents API: Error {docs_response.status_code}")
    except Exception as e:
        print(f"Documents API: Connection error - {e}")

    # Test events endpoint 
    try:
        events_response = requests.get(f"{BASE_URL}/events", params={
            'department_id': dept_id,
            'academic_year_id': year_id
        })
        if events_response.status_code == 200:
            events = events_response.json()
            print(f"\nEvents API: {len(events)} events found")
            for event in events:
                print(f"  Event {event['id']}: '{event['title']}'")
        else:
            print(f"\nEvents API: Error {events_response.status_code}")
    except Exception as e:
        print(f"\nEvents API: Connection error - {e}")

if __name__ == "__main__":
    test_frontend_documents()
