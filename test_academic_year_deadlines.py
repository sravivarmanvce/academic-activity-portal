"""
Test script to verify academic year deadline initialization
"""
import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"

def test_academic_year_deadline_creation():
    print("🧪 Testing Academic Year & Deadline Creation...")
    print("=" * 60)
    
    # Create a test academic year
    test_year = f"Test-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    
    print(f"📅 Creating test academic year: {test_year}")
    
    try:
        # Create academic year
        response = requests.post(f"{BASE_URL}/api/academic-years", json={
            "year": test_year,
            "is_enabled": True
        })
        
        if response.status_code == 200:
            year_data = response.json()
            year_id = year_data["id"]
            print(f"✅ Created academic year with ID: {year_id}")
            
            # Check if deadlines exist
            print(f"🔍 Checking deadlines for year ID: {year_id}")
            deadlines_response = requests.get(f"{BASE_URL}/api/module-deadlines/{year_id}")
            
            if deadlines_response.status_code == 200:
                deadlines = deadlines_response.json()
                print(f"📋 Found {len(deadlines)} existing deadlines")
                
                if len(deadlines) == 0:
                    print("⚠️ No deadlines found - this is what we're fixing!")
                    
                    # Create default deadline
                    default_deadline = (datetime.now() + timedelta(days=180)).isoformat()
                    print(f"📅 Creating default 'program_entry' deadline: {default_deadline}")
                    
                    deadline_response = requests.post(f"{BASE_URL}/api/module-deadlines", json={
                        "academic_year_id": year_id,
                        "module": "program_entry",
                        "deadline": default_deadline
                    })
                    
                    if deadline_response.status_code == 200:
                        print("✅ Successfully created default deadline!")
                    else:
                        print(f"❌ Failed to create deadline: {deadline_response.status_code}")
                        print(deadline_response.text)
                else:
                    print(f"✅ Deadlines already exist:")
                    for dl in deadlines:
                        print(f"   • {dl['module']}: {dl['deadline']}")
            
            # Clean up - delete test academic year
            print(f"🧹 Cleaning up test academic year...")
            delete_response = requests.delete(f"{BASE_URL}/api/academic-years/{year_id}")
            if delete_response.status_code == 200:
                print("✅ Test academic year deleted successfully")
            else:
                print(f"⚠️ Could not delete test year: {delete_response.status_code}")
                
        else:
            print(f"❌ Failed to create academic year: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print("=" * 60)

if __name__ == "__main__":
    test_academic_year_deadline_creation()
