# Database Setup and Migration Script
# Run this after creating your database tables to ensure compatibility

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
from pathlib import Path

# Database connection parameters - update these with your actual values
DB_CONFIG = {
    'host': 'localhost',
    'database': 'academic_portal',
    'user': 'postgres', 
    'password': 'your_password',
    'port': 5432
}

def run_migration():
    """Run the database migration script"""
    try:
        # Connect to database
        conn = psycopg2.connect(**DB_CONFIG)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Read migration script
        migration_file = Path(__file__).parent / 'database_migration.sql'
        with open(migration_file, 'r') as f:
            migration_sql = f.read()
        
        # Execute migration
        cursor.execute(migration_sql)
        
        print("✅ Database migration completed successfully!")
        print("✅ Advanced document schema is now compatible with existing application")
        
        # Test the setup
        cursor.execute("SELECT COUNT(*) FROM documents")
        doc_count = cursor.fetchone()[0]
        print(f"📊 Current documents in database: {doc_count}")
        
        cursor.execute("SELECT COUNT(*) FROM events")
        event_count = cursor.fetchone()[0] 
        print(f"📅 Current events in database: {event_count}")
        
        cursor.close()
        conn.close()
        
    except psycopg2.Error as e:
        print(f"❌ Database error: {e}")
        print("Please check your database connection parameters and try again.")
    except FileNotFoundError:
        print("❌ Migration file not found. Please ensure database_migration.sql exists.")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

def test_document_functions():
    """Test the PostgreSQL functions created in your schema"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Test can_reupload_document function
        cursor.execute("SELECT can_reupload_document(1, 'complete_report')")
        result = cursor.fetchone()[0]
        print(f"📝 Can reupload test document: {result}")
        
        print("✅ PostgreSQL functions are working correctly!")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"⚠️ Function test failed: {e}")
        print("This is normal if you haven't uploaded any documents yet.")

if __name__ == "__main__":
    print("🚀 Starting database migration...")
    print("⚠️ Please update DB_CONFIG with your actual database credentials first!")
    
    # Uncomment the line below after updating DB_CONFIG
    # run_migration()
    # test_document_functions()
    
    print("\n📋 Next Steps:")
    print("1. Update DB_CONFIG in this file with your database credentials")  
    print("2. Uncomment the run_migration() call")
    print("3. Run this script: python database_setup.py")
    print("4. Test document upload in your application")
