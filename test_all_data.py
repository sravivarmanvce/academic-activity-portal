import requests

BASE_URL = "http://localhost:8000"

def test_data():
    print("=== Testing Data Availability ===")
    
    # Test all departments and academic years
    for dept_id in [1, 2, 3]:
        for year_id in [1, 2, 3]:
            print(f"\n--- Department {dept_id}, Academic Year {year_id} ---")
            
            # Test events
            try:
                events_response = requests.get(f"{BASE_URL}/events", params={
                    'department_id': dept_id,
                    'academic_year_id': year_id
                })
                if events_response.status_code == 200:
                    events = events_response.json()
                    print(f"Events: {len(events)} found")
                    if events:
                        for event in events[:3]:  # Show first 3
                            print(f"  - Event {event['id']}: '{event['title']}'")
                else:
                    print(f"Events: Error {events_response.status_code}")
            except:
                print("Events: Connection error")
            
            # Test documents
            try:
                docs_response = requests.get(f"{BASE_URL}/documents/list", params={
                    'department_id': dept_id,
                    'academic_year_id': year_id
                })
                if docs_response.status_code == 200:
                    documents = docs_response.json()
                    print(f"Documents: {len(documents)} found")
                    if documents:
                        for doc in documents[:5]:  # Show first 5
                            print(f"  - Event {doc['event_id']}: {doc['doc_type']} (filename: {doc.get('filename', 'N/A')})")
                        if len(documents) > 5:
                            print(f"  ... and {len(documents) - 5} more documents")
                else:
                    print(f"Documents: Error {docs_response.status_code}")
            except:
                print("Documents: Connection error")

if __name__ == "__main__":
    test_data()
