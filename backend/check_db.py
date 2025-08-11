from app.database import engine
from sqlalchemy import text

print('Testing database connection...')
try:
    with engine.connect() as conn:
        # Check if documents table exists
        result = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_name = 'documents';"))
        tables = result.fetchall()
        print(f'Documents table exists: {len(tables) > 0}')
        print(f'Tables found: {tables}')
        
        # Check all tables
        result = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"))
        all_tables = result.fetchall()
        print(f'All tables in database:')
        for table in all_tables:
            print(f'  - {table[0]}')
            
except Exception as e:
    print(f'Database error: {e}')
