import requests

print("🧪 Testing Workflow Status API")
print("=" * 40)

department_id = 2
academic_year_id = 1

# Get current status
print("1. Getting current workflow status...")
try:
    response = requests.get(f'http://localhost:8000/workflow-status?department_id={department_id}&academic_year_id={academic_year_id}')
    if response.status_code == 200:
        current_status = response.json().get('status', 'unknown')
        print(f"   Current status: {current_status}")
    else:
        print(f"   Error: {response.status_code}")
        current_status = 'error'
except Exception as e:
    print(f"   Error: {e}")
    current_status = 'error'

# Update to completed
print("\n2. Updating workflow status to 'completed'...")
try:
    response = requests.put('http://localhost:8000/workflow-status', json={
        'department_id': department_id,
        'academic_year_id': academic_year_id,
        'status': 'completed'
    })
    print(f"   Update response: {response.status_code}")
    if response.status_code != 200:
        print(f"   Error details: {response.text}")
except Exception as e:
    print(f"   Error: {e}")

# Check new status
print("\n3. Verifying new workflow status...")
try:
    response = requests.get(f'http://localhost:8000/workflow-status?department_id={department_id}&academic_year_id={academic_year_id}')
    if response.status_code == 200:
        new_status = response.json().get('status', 'unknown')
        print(f"   New status: {new_status}")
        
        if new_status == 'completed':
            print("   ✅ SUCCESS: Workflow status updated to 'completed'!")
        else:
            print("   ❌ Issue: Status was not updated")
    else:
        print(f"   Error: {response.status_code}")
except Exception as e:
    print(f"   Error: {e}")

print("\n" + "=" * 40)
print("✅ Test completed!")
