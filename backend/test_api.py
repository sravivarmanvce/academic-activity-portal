#!/usr/bin/env python3

import requests
import json

print('Testing API endpoints...')

# Test events endpoint
print('\n=== Testing /events endpoint ===')
try:
    response = requests.get('http://localhost:8000/events?department_id=2&academic_year_id=1')
    print(f'Status: {response.status_code}')
    if response.status_code == 200:
        events = response.json()
        print(f'Number of events: {len(events)}')
        for event in events:
            print(f'  Event ID: {event.get("id")}, Title: {event.get("title")}')
    else:
        print(f'Error: {response.text}')
except Exception as e:
    print(f'Error: {e}')

# Test documents endpoint  
print('\n=== Testing /documents/list endpoint ===')
try:
    response = requests.get('http://localhost:8000/documents/list')
    print(f'Status: {response.status_code}')
    if response.status_code == 200:
        documents = response.json()
        print(f'Number of documents: {len(documents)}')
        for doc in documents:
            print(f'  Doc ID: {doc.get("id")}, Event ID: {doc.get("event_id")}, Type: {doc.get("document_type")}, Status: {doc.get("status")}')
    else:
        print(f'Error: {response.text}')
except Exception as e:
    print(f'Error: {e}')

print('\n=== Testing /documents/list with filters ===')
try:
    response = requests.get('http://localhost:8000/documents/list?department_id=2&academic_year_id=1')
    print(f'Status: {response.status_code}')
    if response.status_code == 200:
        documents = response.json()
        print(f'Number of documents (filtered): {len(documents)}')
        for doc in documents:
            print(f'  Doc ID: {doc.get("id")}, Event ID: {doc.get("event_id")}, Type: {doc.get("document_type")}, Status: {doc.get("status")}')
    else:
        print(f'Error: {response.text}')
except Exception as e:
    print(f'Error: {e}')
