#!/usr/bin/env python3

import requests
import json

print('Testing frontend data flow simulation...')

# Simulate selecting EEE department (ID: 2) and 2025-2026 academic year (ID: 1)
department_id = 2
academic_year_id = 1

print(f'\n=== Step 1: Load Events (department_id={department_id}, academic_year_id={academic_year_id}) ===')
try:
    url = f'http://localhost:8000/events?department_id={department_id}&academic_year_id={academic_year_id}'
    print(f'Frontend would call: {url}')
    response = requests.get(url)
    print(f'Status: {response.status_code}')
    
    if response.status_code == 200:
        events = response.json()
        print(f'Events received: {len(events)}')
        
        for event in events:
            print(f'  Event ID: {event.get("id")}, Title: "{event.get("title")}"')
            
        event_ids = [event['id'] for event in events]
        print(f'Event IDs to look for in documents: {event_ids}')
    else:
        print(f'Error: {response.text}')
        exit(1)
        
except Exception as e:
    print(f'Error: {e}')
    exit(1)

print(f'\n=== Step 2: Load Documents ===')
try:
    url = 'http://localhost:8000/documents/list'
    print(f'Frontend would call: {url}')
    response = requests.get(url)
    print(f'Status: {response.status_code}')
    
    if response.status_code == 200:
        documents = response.json()
        print(f'Documents received: {len(documents)}')
        
        # Simulate the frontend grouping logic
        docs_by_event = {}
        for doc in documents:
            event_id = doc.get('event_id')
            doc_type = doc.get('doc_type')
            status = doc.get('status')
            
            if event_id not in docs_by_event:
                docs_by_event[event_id] = {}
                
            docs_by_event[event_id][doc_type] = doc
            print(f'  Document: Event {event_id}, Type: {doc_type}, Status: {status}')
        
        print(f'\nGrouped documents by event: {list(docs_by_event.keys())}')
        
    else:
        print(f'Error: {response.text}')
        exit(1)
        
except Exception as e:
    print(f'Error: {e}')
    exit(1)

print(f'\n=== Step 3: Check Document Visibility for Each Event ===')
for event_id in event_ids:
    print(f'\nEvent {event_id}:')
    
    if event_id in docs_by_event:
        event_docs = docs_by_event[event_id]
        
        # Check report
        if 'report' in event_docs and event_docs['report']['status'] == 'approved':
            print(f'  ✅ Report: Available (approved)')
            print(f'     - Document ID: {event_docs["report"]["id"]}')
            print(f'     - Filename: {event_docs["report"]["filename"]}')
        else:
            report_status = event_docs.get('report', {}).get('status', 'missing')
            print(f'  ❌ Report: Not available (status: {report_status})')
        
        # Check zipfile
        if 'zipfile' in event_docs and event_docs['zipfile']['status'] == 'approved':
            print(f'  ✅ ZIP: Available (approved)')
            print(f'     - Document ID: {event_docs["zipfile"]["id"]}')
            print(f'     - Filename: {event_docs["zipfile"]["filename"]}')
        else:
            zip_status = event_docs.get('zipfile', {}).get('status', 'missing')
            print(f'  ❌ ZIP: Not available (status: {zip_status})')
    else:
        print(f'  ❌ No documents found for this event')

print(f'\n=== EXPECTED FRONTEND BEHAVIOR ===')
print(f'✅ Events should load successfully')
print(f'✅ Documents should be grouped by event_id') 
print(f'✅ Both events should show "Report: Available (approved)" and "ZIP: Available (approved)"')
print(f'✅ Download buttons should be visible instead of "Not available" text')
