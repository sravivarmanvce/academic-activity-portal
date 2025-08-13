-- Fix Document Status Constraint to Allow 'deleted' Status
-- This script updates the check_document_status constraint to include 'deleted' as a valid status
-- Run this script in your PostgreSQL database

-- Show current constraint before changes
SELECT 
    constraint_name, 
    check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'check_document_status';

-- Drop the existing constraint
ALTER TABLE documents DROP CONSTRAINT IF EXISTS check_document_status;

-- Add the updated constraint that includes 'deleted'
ALTER TABLE documents 
ADD CONSTRAINT check_document_status 
CHECK (status IN ('pending', 'approved', 'rejected', 'deleted'));

-- Verify the new constraint was created
SELECT 
    constraint_name, 
    check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'check_document_status';

-- Show current document statuses in the database
SELECT DISTINCT status, COUNT(*) as count
FROM documents 
GROUP BY status
ORDER BY status;

-- Optional: Show any documents that might have invalid statuses (should be none after this fix)
SELECT id, filename, status 
FROM documents 
WHERE status NOT IN ('pending', 'approved', 'rejected', 'deleted');

COMMIT;
