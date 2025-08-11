import requests

try:
    response = requests.get("http://127.0.0.1:8000/documents/list")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
