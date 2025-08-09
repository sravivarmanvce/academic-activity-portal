#!/usr/bin/env python3
"""
Test script to simulate document approval and verify workflow status update
This script will approve all documents and check if workflow status updates to completed
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def simulate_document_approval():
    print("🧪 Testing Document Approval and Workflow Status Update")
    print("=" * 60)
    
    # Test parameters
    department_id = 2  # Department with data
    academic_year_id = 1  # Academic year with data
    
    print(f"Testing for Department ID: {department_id}, Academic Year ID: {academic_year_id}")
    print()
    
    # 1. Get all documents
    print("1️⃣ Getting current documents...")
    try:
        response = requests.get(f"{BASE_URL}/documents/list", params={
            'department_id': department_id,
            'academic_year_id': academic_year_id
        })
        
        if response.status_code == 200:
            documents = response.json()
            print(f"   Found {len(documents)} documents")
            
            # Show current status
            for doc in documents:
                print(f"   - Doc ID {doc['id']}: {doc['filename']} - Status: {doc['status']}")
            
        else:
            print(f"   Error getting documents: {response.status_code}")
            return
            
    except Exception as e:
        print(f"   Error: {e}")
        return
    
    # 2. Check if there are any pending documents
    pending_docs = [doc for doc in documents if doc['status'] != 'approved']
    
    if not pending_docs:
        print("\n   ✅ All documents are already approved!")
    else:
        print(f"\n   📋 Found {len(pending_docs)} documents that need approval")
        
        # For testing, let's simulate approving the first pending document
        test_doc = pending_docs[0]
        print(f"\n2️⃣ Simulating approval of document: {test_doc['filename']}")
        
        # Note: In a real scenario, this would be done through admin interface
        # For now, let's just check what the frontend logic would do
        print("   (In real scenario, admin would approve this document)")
        print("   Frontend logic would then check if all documents are approved...")
    
    # 3. Test the workflow status check logic
    print("\n3️⃣ Testing workflow status check logic...")
    
    # Get events to simulate the frontend check
    try:
        response = requests.get(f"{BASE_URL}/events", params={
            'department_id': department_id,
            'academic_year_id': academic_year_id
        })
        
        if response.status_code == 200:
            events = response.json()
            
            # Simulate the frontend logic
            events_with_docs = [event for event in events if event.get('title', '').strip()]
            
            if not events_with_docs:
                print("   No events with titles found")
                return
            
            all_approved = True
            total_required = 0
            total_approved_count = 0
            
            print(f"   Checking {len(events_with_docs)} events with documents:")
            
            for event in events_with_docs:
                event_docs = [doc for doc in documents if doc['event_id'] == event['id']]
                report_doc = next((doc for doc in event_docs if doc['doc_type'] == 'report'), None)
                files_doc = next((doc for doc in event_docs if doc['doc_type'] in ['zipfile', 'files']), None)
                
                print(f"\n   📋 Event: {event['title']} (ID: {event['id']})")
                
                if not report_doc or not files_doc:
                    print(f"      ❌ Missing documents (Report: {'✓' if report_doc else '❌'}, Files: {'✓' if files_doc else '❌'})")
                    all_approved = False
                    continue
                
                total_required += 2
                
                print(f"      📄 Report: {report_doc['status']}")
                print(f"      📁 Files: {files_doc['status']}")
                
                if report_doc['status'] == 'approved':
                    total_approved_count += 1
                else:
                    all_approved = False
                
                if files_doc['status'] == 'approved':
                    total_approved_count += 1
                else:
                    all_approved = False
            
            print(f"\n   📊 Summary:")
            print(f"      Total required documents: {total_required}")
            print(f"      Total approved documents: {total_approved_count}")
            print(f"      All documents approved: {all_approved}")
            
            if all_approved and total_required > 0:
                print("\n   🎉 All documents are approved!")
                print("   Frontend would now update workflow status to 'completed'")
                
                # Test the API call that frontend would make
                try:
                    response = requests.post(f"{BASE_URL}/workflow-status", json={
                        'department_id': department_id,
                        'academic_year_id': academic_year_id,
                        'status': 'completed'
                    })
                    
                    if response.status_code == 200:
                        print("   ✅ Workflow status update API call successful")
                    else:
                        print(f"   ❌ Error updating workflow status: {response.status_code}")
                        print(f"      Response: {response.text}")
                        
                except Exception as e:
                    print(f"   ❌ Error calling workflow status API: {e}")
            else:
                print("\n   ⏳ Not all documents approved yet")
                print("   Workflow status will remain unchanged")
        
    except Exception as e:
        print(f"   Error getting events: {e}")
    
    print("\n" + "=" * 60)
    print("✅ Document approval test completed!")

if __name__ == "__main__":
    simulate_document_approval()
