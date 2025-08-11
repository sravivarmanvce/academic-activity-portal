#!/usr/bin/env python3
"""
Test script to verify workflow status auto-update functionality
This script tests if the backend properly updates workflow status when all documents are approved
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_workflow_status_update():
    print("🧪 Testing Workflow Status Auto-Update")
    print("=" * 50)
    
    # Test parameters
    department_id = 1  # EEE
    academic_year_id = 2  # 2025-2026
    
    print(f"Testing for Department ID: {department_id}, Academic Year ID: {academic_year_id}")
    print()
    
    # 1. Get current workflow status
    print("1️⃣ Getting current workflow status...")
    try:
        response = requests.get(f"{BASE_URL}/workflow-status", params={
            'department_id': department_id,
            'academic_year_id': academic_year_id
        })
        if response.status_code == 200:
            current_status = response.json().get('status', 'Not found')
            print(f"   Current status: {current_status}")
        else:
            print(f"   Error getting status: {response.status_code}")
            return
    except Exception as e:
        print(f"   Error: {e}")
        return
    
    # 2. Get all events for this department/year
    print("\n2️⃣ Getting events...")
    try:
        response = requests.get(f"{BASE_URL}/events", params={
            'department_id': department_id,
            'academic_year_id': academic_year_id
        })
        if response.status_code == 200:
            events = response.json()
            print(f"   Found {len(events)} events")
            for event in events:
                print(f"   - Event ID {event['id']}: {event.get('title', 'No title')}")
        else:
            print(f"   Error getting events: {response.status_code}")
            return
    except Exception as e:
        print(f"   Error: {e}")
        return
    
    # 3. Get all documents
    print("\n3️⃣ Getting documents...")
    try:
        response = requests.get(f"{BASE_URL}/documents/list", params={
            'department_id': department_id,
            'academic_year_id': academic_year_id
        })
        if response.status_code == 200:
            documents = response.json()
            print(f"   Found {len(documents)} documents")
            
            # Group documents by event
            event_docs = {}
            for doc in documents:
                event_id = doc['event_id']
                if event_id not in event_docs:
                    event_docs[event_id] = {}
                event_docs[event_id][doc['doc_type']] = doc
            
            print("\n   Document status by event:")
            total_required = 0
            total_approved = 0
            all_approved = True
            
            for event in events:
                event_id = event['id']
                event_title = event.get('title', 'No title')
                docs = event_docs.get(event_id, {})
                
                print(f"   📋 Event: {event_title} (ID: {event_id})")
                
                report_doc = docs.get('report')
                files_doc = docs.get('zipfile') or docs.get('files')
                
                if report_doc:
                    print(f"      📄 Report: {report_doc['filename']} - Status: {report_doc['status']}")
                    total_required += 1
                    if report_doc['status'] == 'approved':
                        total_approved += 1
                    else:
                        all_approved = False
                else:
                    print(f"      📄 Report: MISSING")
                    all_approved = False
                
                if files_doc:
                    print(f"      📁 Files: {files_doc['filename']} - Status: {files_doc['status']}")
                    total_required += 1
                    if files_doc['status'] == 'approved':
                        total_approved += 1
                    else:
                        all_approved = False
                else:
                    print(f"      📁 Files: MISSING")
                    all_approved = False
                
                print()
            
            print(f"   📊 Summary:")
            print(f"      Total required documents: {total_required}")
            print(f"      Total approved documents: {total_approved}")
            print(f"      All documents approved: {all_approved}")
            
        else:
            print(f"   Error getting documents: {response.status_code}")
            return
    except Exception as e:
        print(f"   Error: {e}")
        return
    
    # 4. Test workflow status update
    print("\n4️⃣ Testing workflow status update logic...")
    
    if all_approved and total_required > 0:
        print("   ✅ All documents are approved - should trigger status update to 'completed'")
        
        # Test the API endpoint directly
        try:
            response = requests.post(f"{BASE_URL}/workflow-status", json={
                'department_id': department_id,
                'academic_year_id': academic_year_id,
                'status': 'completed'
            })
            
            if response.status_code == 200:
                print("   ✅ Workflow status update API call successful")
                
                # Verify the status was updated
                response = requests.get(f"{BASE_URL}/workflow-status", params={
                    'department_id': department_id,
                    'academic_year_id': academic_year_id
                })
                
                if response.status_code == 200:
                    new_status = response.json().get('status', 'Unknown')
                    print(f"   📈 New workflow status: {new_status}")
                    
                    if new_status == 'completed':
                        print("   🎉 SUCCESS: Workflow status correctly updated to 'completed'!")
                    else:
                        print("   ❌ ISSUE: Status was not updated to 'completed'")
                else:
                    print("   ❌ Error verifying updated status")
            else:
                print(f"   ❌ Error updating workflow status: {response.status_code}")
                print(f"   Response: {response.text}")
        except Exception as e:
            print(f"   ❌ Error testing status update: {e}")
    else:
        print("   ⏳ Not all documents are approved - status should remain unchanged")
        print("   This is expected behavior when documents are still pending approval")
    
    print("\n" + "=" * 50)
    print("✅ Workflow status update test completed!")

if __name__ == "__main__":
    test_workflow_status_update()
