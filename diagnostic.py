import requests
import json

def check_backend_status():
    BASE_URL = "http://localhost:8000"
    
    print("=== BACKEND DIAGNOSTIC ===")
    
    # Test 1: Check if backend is running
    try:
        response = requests.get(f"{BASE_URL}/", timeout=5)
        print("✅ Backend server is running")
    except requests.exceptions.ConnectionError:
        print("❌ Backend server is NOT running")
        print("   → Run: cd backend && python -m uvicorn app.main:app --reload")
        return False
    except Exception as e:
        print(f"❌ Backend error: {e}")
        return False
    
    # Test 2: Check documents endpoint with filtering
    print("\n=== TESTING DOCUMENTS ENDPOINT ===")
    try:
        # Test with EEE (dept 2), 2025-2026 (year 1) 
        response = requests.get(f"{BASE_URL}/documents/list", params={
            'department_id': 2,
            'academic_year_id': 1
        }, timeout=10)
        
        if response.status_code == 200:
            docs = response.json()
            print(f"✅ Documents API working: {len(docs)} documents found")
            
            if len(docs) > 0:
                print("📄 Documents found:")
                for doc in docs:
                    print(f"   - Event {doc['event_id']}: {doc['doc_type']} ({doc.get('filename', 'N/A')})")
            else:
                print("⚠️  No documents found for EEE, 2025-2026")
                print("   → Check if you have uploaded documents for this department/year")
        else:
            print(f"❌ Documents API error: {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Documents API error: {e}")
    
    # Test 3: Check events endpoint
    print("\n=== TESTING EVENTS ENDPOINT ===")
    try:
        response = requests.get(f"{BASE_URL}/events", params={
            'department_id': 2,
            'academic_year_id': 1
        }, timeout=10)
        
        if response.status_code == 200:
            events = response.json()
            print(f"✅ Events API working: {len(events)} events found")
            
            if len(events) > 0:
                print("📅 Events found:")
                for event in events:
                    print(f"   - Event {event['id']}: '{event['title']}'")
            else:
                print("⚠️  No events found for EEE, 2025-2026")
        else:
            print(f"❌ Events API error: {response.status_code}")
    except Exception as e:
        print(f"❌ Events API error: {e}")
    
    print("\n=== NEXT STEPS ===")
    print("1. If backend is not running → Start it: cd backend && python -m uvicorn app.main:app --reload")
    print("2. If APIs are working → Restart frontend: cd frontend && npm start")
    print("3. If no data found → You might be looking at the wrong department/year combination")
    print("4. Open browser to http://localhost:3000 and test Document Management page")

if __name__ == "__main__":
    check_backend_status()
