from app.database import engine
from sqlalchemy import text

# Check document types in use
with engine.connect() as conn:
    result = conn.execute(text('SELECT DISTINCT document_type FROM documents ORDER BY document_type'))
    types = [row[0] for row in result]
    print('Document types in database:', types)
    
    # Check a few sample documents
    result = conn.execute(text('SELECT id, document_type, status, event_id, original_filename FROM documents LIMIT 10'))
    docs = result.fetchall()
    print('\nSample documents:')
    for doc in docs:
        print(f'ID: {doc[0]}, Type: {doc[1]}, Status: {doc[2]}, Event: {doc[3]}, File: {doc[4]}')
