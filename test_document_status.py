import requests

BASE_URL = "http://localhost:8000"

def test_document_status():
    print("=== Testing Document Status Values ===")
    
    # Test with EEE (dept 2), 2025-2026 (year 1) 
    try:
        response = requests.get(f"{BASE_URL}/documents/list", params={
            'department_id': 2,
            'academic_year_id': 1
        })
        
        if response.status_code == 200:
            docs = response.json()
            print(f"Found {len(docs)} documents:")
            
            for doc in docs:
                print(f"  📄 Document ID: {doc['id']}")
                print(f"     Event ID: {doc['event_id']}")
                print(f"     Type: {doc['doc_type']} ({doc.get('document_type', 'N/A')})")
                print(f"     Filename: {doc['filename']}")
                print(f"     Status: {doc['status']}")
                print(f"     Approved By: {doc.get('approved_by', 'N/A')}")
                print(f"     Approved At: {doc.get('approved_at', 'N/A')}")
                print()
                
            print("=== Expected UI Behavior ===")
            print("After the frontend changes:")
            print("- Approved documents: Green download button + 'Approved' text")
            print("- Pending documents: Yellow download button + 'Approval Pending' text")
            print("- Not uploaded: 'Not uploaded' text")
            
        else:
            print(f"API Error: {response.status_code}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_document_status()
