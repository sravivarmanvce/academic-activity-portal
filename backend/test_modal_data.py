import requests
import json

# Test the API endpoints to see what data we have
BASE_URL = "http://localhost:8000"

def test_events():
    print("=== Testing Events API ===")
    response = requests.get(f"{BASE_URL}/events", params={
        'department_id': 1,  # EEE department
        'academic_year_id': 3  # 2025-2026
    })
    
    if response.status_code == 200:
        events = response.json()
        print(f"Found {len(events)} events:")
        for event in events:
            print(f"  Event ID: {event['id']}, Title: '{event['title']}'")
        return events
    else:
        print(f"Error: {response.status_code} - {response.text}")
        return []

def test_documents():
    print("\n=== Testing Documents API ===")
    response = requests.get(f"{BASE_URL}/documents/list", params={
        'department_id': 1,  # EEE department
        'academic_year_id': 3  # 2025-2026
    })
    
    if response.status_code == 200:
        documents = response.json()
        print(f"Found {len(documents)} documents:")
        for doc in documents:
            print(f"  Event ID: {doc['event_id']}, Type: '{doc['doc_type']}'")
        return documents
    else:
        print(f"Error: {response.status_code} - {response.text}")
        return []

if __name__ == "__main__":
    events = test_events()
    documents = test_documents()
    
    if events and documents:
        print("\n=== Event-Document Mapping ===")
        for event in events:
            event_docs = [doc for doc in documents if doc['event_id'] == event['id']]
            has_report = any(doc['doc_type'] == 'report' for doc in event_docs)
            has_files = any(doc['doc_type'] == 'files' for doc in event_docs)
            print(f"Event '{event['title']}' (ID: {event['id']}): Report={has_report}, Files={has_files}")
