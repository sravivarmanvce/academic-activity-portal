from app.database import get_db
from app.services.document_service import get_event_documents

print('Testing get_event_documents function...')
try:
    db = next(get_db())
    documents = get_event_documents(db)
    print(f'Found {len(documents)} documents')
    print('Function executed successfully!')
    db.close()
except Exception as e:
    print(f'Error in get_event_documents: {e}')
    import traceback
    traceback.print_exc()
