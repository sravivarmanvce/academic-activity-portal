-- Database Migration Script for Advanced Document Management
-- This script helps migrate from simple event_documents to advanced documents schema
-- Run this after your existing document table creation scripts

-- 1. Insert default data required for the advanced schema to work

-- Insert default department if not exists
INSERT INTO departments (id, name, code, head_id, created_at, updated_at) 
SELECT 1, 'Default Department', 'DEFAULT', NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE id = 1);

-- Insert default academic year if not exists  
INSERT INTO academic_years (id, year, start_date, end_date, is_current, created_at, updated_at)
SELECT 1, '2024-25', '2024-07-01', '2025-06-30', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM academic_years WHERE id = 1);

-- Insert default admin user if not exists (for uploaded_by field)
INSERT INTO users (id, name, email, role, password_hash, created_at, updated_at)
SELECT 1, 'System Admin', 'admin@system.com', 'admin', 'system_generated', NOW(), NOW()  
WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 1);

-- 2. Update events table to include required foreign keys if they don't exist
-- (Add these columns to events table if they don't exist)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'department_id') THEN
        ALTER TABLE events ADD COLUMN department_id INTEGER DEFAULT 1 REFERENCES departments(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'academic_year_id') THEN  
        ALTER TABLE events ADD COLUMN academic_year_id INTEGER DEFAULT 1 REFERENCES academic_years(id);
    END IF;
END $$;

-- 3. Create a view to make the frontend compatible (maps new schema to old field names)
CREATE OR REPLACE VIEW event_documents_view AS
SELECT 
    d.id,
    d.event_id,
    CASE 
        WHEN d.document_type = 'complete_report' THEN 'report'
        WHEN d.document_type = 'supporting_documents' THEN 'zip'
        ELSE d.document_type 
    END as doc_type,
    d.filename,
    d.file_path,
    d.uploaded_at,
    d.status,
    d.approved_by,
    d.approved_at,
    d.rejection_reason,
    d.version,
    d.is_latest_version
FROM documents d
WHERE d.event_id IS NOT NULL 
  AND d.is_latest_version = true
  AND d.document_type IN ('complete_report', 'supporting_documents');

-- 4. Grant permissions on the view
-- GRANT SELECT ON event_documents_view TO your_app_user;

-- 5. Create function to ensure department and academic year exist for events
CREATE OR REPLACE FUNCTION ensure_event_references()
RETURNS TRIGGER AS $$
BEGIN
    -- Set default department and academic year if not specified
    IF NEW.department_id IS NULL THEN
        NEW.department_id = 1;
    END IF;
    
    IF NEW.academic_year_id IS NULL THEN
        NEW.academic_year_id = 1;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set references
DROP TRIGGER IF EXISTS ensure_event_references_trigger ON events;
CREATE TRIGGER ensure_event_references_trigger
    BEFORE INSERT OR UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION ensure_event_references();

-- Success message
SELECT 'Database migration completed! Advanced document schema is now compatible with existing application.' AS message;

-- Additional constraint for document format validation
ALTER TABLE documents ADD CONSTRAINT IF NOT EXISTS check_report_mime_types
    CHECK (
        (document_type != 'complete_report') OR
        (document_type = 'complete_report' AND (
            mime_type IN (
                'application/pdf',
                'application/msword', 
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/octet-stream'
            ) OR
            filename ~* '\.(pdf|doc|docx)$'
        ))
    );

-- Instructions for testing:
/*
After running this script:

1. Test document upload:
   - Frontend should work without changes
   - Documents will be stored with versioning support
   
2. Test approval/rejection workflow:
   - Principal can approve/reject documents
   - HoD can re-upload rejected documents
   
3. Check document history (optional):
   SELECT * FROM get_document_history(event_id, 'complete_report');
   
4. Verify latest documents view:
   SELECT * FROM event_documents_view WHERE event_id = your_event_id;
*/
