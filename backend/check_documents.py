from app.database import engine
from sqlalchemy import text

print('Checking documents table...')
try:
    with engine.connect() as conn:
        # Get table schema
        result = conn.execute(text("""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'documents' 
            ORDER BY ordinal_position;
        """))
        columns = result.fetchall()
        print('Documents table structure:')
        for col in columns:
            print(f'  - {col[0]}: {col[1]} (nullable: {col[2]})')
        
        # Count documents
        result = conn.execute(text("SELECT COUNT(*) FROM documents;"))
        count = result.fetchone()[0]
        print(f'\nNumber of documents: {count}')
        
        if count > 0:
            # Show some sample data
            result = conn.execute(text("SELECT id, event_id, document_type, filename, status FROM documents LIMIT 5;"))
            docs = result.fetchall()
            print('Sample documents:')
            for doc in docs:
                print(f'  - ID: {doc[0]}, Event: {doc[1]}, Type: {doc[2]}, File: {doc[3]}, Status: {doc[4]}')
                
except Exception as e:
    print(f'Database error: {e}')
    import traceback
    traceback.print_exc()
