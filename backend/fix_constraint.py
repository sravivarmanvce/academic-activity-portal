#!/usr/bin/env python3
"""
Fix Document Status Constraint
This script updates the database constraint to allow 'archived' status for documents.
"""

import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from dotenv import load_dotenv
from pathlib import Path

def fix_constraint():
    """Fix the document status constraint to allow 'archived' status"""
    
    # Load environment variables
    backend_dir = Path(__file__).parent
    env_path = backend_dir / '.env'
    load_dotenv(env_path)
    
    database_url = os.getenv("DATABASE_URL")
    
    if not database_url:
        print("❌ DATABASE_URL not found in environment variables")
        return False
    
    try:
        # Connect to database
        conn = psycopg2.connect(database_url)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        print("🔗 Connected to database")
        
        # Check current constraint
        cursor.execute("""
            SELECT constraint_name, check_clause 
            FROM information_schema.check_constraints 
            WHERE constraint_name = 'check_document_status'
        """)
        existing_constraint = cursor.fetchone()
        
        if existing_constraint:
            print(f"🔍 Found existing constraint: {existing_constraint[1]}")
            
            # Drop the existing constraint
            cursor.execute("ALTER TABLE documents DROP CONSTRAINT check_document_status")
            print("🗑️ Dropped existing constraint")
        else:
            print("ℹ️ No existing constraint found")
        
        # Add the updated constraint that includes 'deleted'
        cursor.execute("""
            ALTER TABLE documents ADD CONSTRAINT check_document_status 
            CHECK (status IN ('pending', 'approved', 'rejected', 'deleted'))
        """)
        print("✅ Added updated constraint allowing 'deleted' status")
        
        # Verify the new constraint
        cursor.execute("""
            SELECT constraint_name, check_clause 
            FROM information_schema.check_constraints 
            WHERE constraint_name = 'check_document_status'
        """)
        new_constraint = cursor.fetchone()
        
        if new_constraint:
            print(f"✅ Verified new constraint: {new_constraint[1]}")
        
        cursor.close()
        conn.close()
        
        print("🎉 Document status constraint fix completed successfully!")
        print("📋 Now the following statuses are allowed: pending, approved, rejected, deleted")
        return True
        
    except psycopg2.Error as e:
        print(f"❌ Database error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Fixing document status constraint...")
    print("This will allow documents to have 'deleted' status")
    
    success = fix_constraint()
    
    if success:
        print("\n📋 Next Steps:")
        print("1. The database constraint is now fixed")  
        print("2. Document deletion should now work properly")
        print("3. Test document deletion in your application")
    else:
        print("\n❌ Fix failed - please check the error messages above")
