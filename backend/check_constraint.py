#!/usr/bin/env python3
"""
Check Database Constraint Script
This script checks what status values are currently allowed in the database.
"""

import os
import psycopg2
from dotenv import load_dotenv
from pathlib import Path

def check_constraint():
    """Check the current document status constraint"""
    
    # Load environment variables
    backend_dir = Path(__file__).parent
    env_path = backend_dir / '.env'
    load_dotenv(env_path)
    
    database_url = os.getenv("DATABASE_URL")
    
    if not database_url:
        print("❌ DATABASE_URL not found in environment variables")
        return
    
    try:
        # Connect to database
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        print("🔗 Connected to database")
        
        # Check existing constraint
        cursor.execute("""
            SELECT constraint_name, check_clause 
            FROM information_schema.check_constraints 
            WHERE constraint_name = 'check_document_status'
        """)
        constraint = cursor.fetchone()
        
        if constraint:
            print(f"🔍 Found constraint: {constraint[0]}")
            print(f"📋 Constraint clause: {constraint[1]}")
        else:
            print("ℹ️ No check_document_status constraint found")
        
        # Check all constraints on documents table
        cursor.execute("""
            SELECT tc.constraint_name, cc.check_clause
            FROM information_schema.table_constraints tc
            JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
            WHERE tc.table_name = 'documents' AND tc.constraint_type = 'CHECK'
        """)
        all_constraints = cursor.fetchall()
        
        print("\n📊 All CHECK constraints on documents table:")
        for constraint_name, check_clause in all_constraints:
            print(f"  - {constraint_name}: {check_clause}")
        
        # Check current document statuses in use
        cursor.execute("SELECT DISTINCT status FROM documents ORDER BY status")
        current_statuses = cursor.fetchall()
        
        print("\n📈 Current document statuses in database:")
        for status in current_statuses:
            print(f"  - {status[0]}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("🔍 Checking database constraints...")
    check_constraint()
