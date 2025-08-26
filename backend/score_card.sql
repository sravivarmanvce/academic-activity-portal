-- Department Score Card Module - Complete PostgreSQL Script
-- Uses existing tables: users(id, name, department_id), departments(id, name), academic_years(id, year)

-- =====================================================
-- Department Score Card Module - Database Tables
-- =====================================================

-- =====================================================
-- 1. Score Card Templates Table
-- =====================================================
CREATE TABLE IF NOT EXISTS score_card_templates (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    max_score DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scorecard_templates_academic_year ON score_card_templates(academic_year_id);
CREATE INDEX idx_scorecard_templates_active ON score_card_templates(is_active);

-- =====================================================
-- 2. Score Card Questions Table
-- =====================================================
CREATE TABLE IF NOT EXISTS score_card_questions (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES score_card_templates(id) ON DELETE CASCADE,
    section_name VARCHAR(100) NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) NOT NULL,
    max_score DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    order_index INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT TRUE,
    
    -- Document submission options
    require_file_upload BOOLEAN DEFAULT FALSE,
    require_onedrive_link BOOLEAN DEFAULT FALSE,
    require_physical_submission BOOLEAN DEFAULT FALSE,
    require_any_supporting_document BOOLEAN DEFAULT FALSE,
    
    -- Validation rules
    min_value INTEGER,
    max_value INTEGER,
    allowed_file_types VARCHAR(200) DEFAULT 'pdf,doc,docx,xls,xlsx,zip',
    max_file_size_mb INTEGER DEFAULT 50,
    
    -- Instructions
    help_text TEXT,
    placeholder_text VARCHAR(255),
    validation_message TEXT,
    physical_submission_instructions TEXT,
    onedrive_instructions TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scorecard_questions_template ON score_card_questions(template_id);
CREATE INDEX idx_scorecard_questions_section ON score_card_questions(section_name);
CREATE INDEX idx_scorecard_questions_order ON score_card_questions(template_id, order_index);

-- =====================================================
-- 3. Score Card Submissions Table
-- =====================================================
CREATE TABLE IF NOT EXISTS score_card_submissions (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES score_card_templates(id) ON DELETE CASCADE,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    
    submitted_by_user_id INTEGER NOT NULL REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'draft',
    
    -- Scoring
    total_score DECIMAL(10,2) DEFAULT 0.00,
    max_possible_score DECIMAL(10,2) DEFAULT 0.00,
    score_percentage DECIMAL(5,2) DEFAULT 0.00,
    
    -- Timestamps
    submitted_at TIMESTAMP WITH TIME ZONE,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by_user_id INTEGER REFERENCES users(id),
    
    -- Comments
    hod_comments TEXT,
    dean_comments TEXT,
    admin_comments TEXT,
    
    -- Deadlines
    submission_deadline TIMESTAMP WITH TIME ZONE,
    is_deadline_extended BOOLEAN DEFAULT FALSE,
    extension_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scorecard_submissions_dept ON score_card_submissions(department_id);
CREATE INDEX idx_scorecard_submissions_template ON score_card_submissions(template_id);
CREATE INDEX idx_scorecard_submissions_status ON score_card_submissions(status);
CREATE INDEX idx_scorecard_submissions_academic_year ON score_card_submissions(academic_year_id);

-- =====================================================
-- 4. Score Card Responses Table
-- =====================================================
CREATE TABLE IF NOT EXISTS score_card_responses (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER NOT NULL REFERENCES score_card_submissions(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES score_card_questions(id) ON DELETE CASCADE,
    
    -- Response data
    text_response TEXT,
    count_response INTEGER,
    decimal_response DECIMAL(12,2),
    
    -- OneDrive links
    onedrive_link_1 TEXT,
    onedrive_link_2 TEXT,
    onedrive_link_3 TEXT,
    onedrive_description TEXT,
    
    -- Physical documents
    has_physical_documents BOOLEAN DEFAULT FALSE,
    physical_document_description TEXT,
    physical_document_location VARCHAR(255),
    physical_document_count INTEGER,
    physical_submission_notes TEXT,
    
    -- Scoring
    calculated_score DECIMAL(8,2) DEFAULT 0.00,
    max_question_score DECIMAL(8,2) DEFAULT 0.00,
    scoring_notes TEXT,
    
    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by_user_id INTEGER REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    verification_comments TEXT,
    verification_status VARCHAR(20) DEFAULT 'pending',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scorecard_responses_submission ON score_card_responses(submission_id);
CREATE INDEX idx_scorecard_responses_question ON score_card_responses(question_id);
CREATE INDEX idx_scorecard_responses_verified ON score_card_responses(is_verified);

-- =====================================================
-- 5. Score Card Documents Table
-- =====================================================
CREATE TABLE IF NOT EXISTS score_card_documents (
    id SERIAL PRIMARY KEY,
    response_id INTEGER NOT NULL REFERENCES score_card_responses(id) ON DELETE CASCADE,
    submission_id INTEGER NOT NULL REFERENCES score_card_submissions(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES score_card_questions(id) ON DELETE CASCADE,
    
    -- File information
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    mime_type VARCHAR(100),
    
    -- Source and metadata
    upload_source VARCHAR(20) DEFAULT 'direct',
    onedrive_url TEXT,
    document_description TEXT,
    upload_order INTEGER DEFAULT 1,
    
    -- Physical document reference
    is_physical_reference BOOLEAN DEFAULT FALSE,
    physical_location VARCHAR(255),
    physical_handover_date DATE,
    physical_received_by_name VARCHAR(200),
    
    uploaded_by INTEGER NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by INTEGER REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    
    -- File integrity
    checksum VARCHAR(64)
);

CREATE INDEX idx_scorecard_documents_response ON score_card_documents(response_id);
CREATE INDEX idx_scorecard_documents_submission ON score_card_documents(submission_id);
CREATE INDEX idx_scorecard_documents_question ON score_card_documents(question_id);

-- =====================================================
-- 6. Score Card Audit Log Table
-- =====================================================
CREATE TABLE IF NOT EXISTS score_card_audit_log (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER REFERENCES score_card_submissions(id) ON DELETE CASCADE,
    response_id INTEGER REFERENCES score_card_responses(id) ON DELETE CASCADE,
    
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER NOT NULL,
    
    old_values TEXT,
    new_values TEXT,
    changes_summary TEXT,
    
    performed_by INTEGER NOT NULL REFERENCES users(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX idx_scorecard_audit_submission ON score_card_audit_log(submission_id);
CREATE INDEX idx_scorecard_audit_performed_by ON score_card_audit_log(performed_by);
CREATE INDEX idx_scorecard_audit_date ON score_card_audit_log(performed_at);

-- =====================================================
-- 7. Useful Functions
-- =====================================================

-- Function to recalculate submission total score
CREATE OR REPLACE FUNCTION recalculate_submission_score(submission_id_param INTEGER)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    total_score DECIMAL(10,2) := 0.00;
    max_score DECIMAL(10,2) := 0.00;
BEGIN
    SELECT 
        COALESCE(SUM(sr.calculated_score), 0.00),
        COALESCE(SUM(sr.max_question_score), 0.00)
    INTO total_score, max_score
    FROM score_card_responses sr
    WHERE sr.submission_id = submission_id_param;
    
    UPDATE score_card_submissions 
    SET 
        total_score = total_score,
        max_possible_score = max_score,
        score_percentage = CASE WHEN max_score > 0 THEN (total_score / max_score) * 100 ELSE 0 END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = submission_id_param;
    
    RETURN total_score;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update submission scores
CREATE OR REPLACE FUNCTION update_submission_score_trigger()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM recalculate_submission_score(COALESCE(NEW.submission_id, OLD.submission_id));
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_submission_score ON score_card_responses;
CREATE TRIGGER trg_update_submission_score
    AFTER INSERT OR UPDATE OR DELETE ON score_card_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_submission_score_trigger();

-- =====================================================
-- 8. Analytics View
-- =====================================================
CREATE OR REPLACE VIEW score_card_analytics AS
SELECT 
    s.id as submission_id,
    s.academic_year_id,
    ay.year,
    s.department_id,
    d.name as department_name,
    st.title as template_title,
    s.status,
    s.total_score,
    s.max_possible_score,
    s.score_percentage,
    s.submitted_at,
    s.verified_at,
    u_submit.name as submitted_by_name,
    u_verify.name as verified_by_name,
    
    (SELECT COUNT(*) FROM score_card_responses sr WHERE sr.submission_id = s.id) as total_questions_answered,
    (SELECT COUNT(*) FROM score_card_responses sr WHERE sr.submission_id = s.id AND sr.is_verified = TRUE) as questions_verified,
    (SELECT COUNT(*) FROM score_card_documents sd WHERE sd.submission_id = s.id) as total_documents_uploaded,
    (SELECT COUNT(*) FROM score_card_responses sr WHERE sr.submission_id = s.id AND sr.has_physical_documents = TRUE) as questions_with_physical_docs

FROM score_card_submissions s
JOIN score_card_templates st ON s.template_id = st.id
JOIN academic_years ay ON s.academic_year_id = ay.id
JOIN departments d ON s.department_id = d.id
JOIN users u_submit ON s.submitted_by_user_id = u_submit.id
LEFT JOIN users u_verify ON s.verified_by_user_id = u_verify.id;

-- =====================================================
-- 9. Sample Data Insertion (Optional - for testing)
-- =====================================================

/*
-- Uncomment to insert sample data for testing

-- Sample template
INSERT INTO score_card_templates (title, description, academic_year_id, max_score, created_by) 
VALUES (
    'Department Assessment 2024-25',
    'Annual department quality assessment form',
    (SELECT id FROM academic_years WHERE year = '2024-25' LIMIT 1),
    500.00,
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
);

-- Sample questions
INSERT INTO score_card_questions (
    template_id, section_name, question_text, question_type, max_score, 
    order_index, require_any_supporting_document, help_text
) VALUES
    -- Count question with required supporting documents
    ((SELECT id FROM score_card_templates WHERE title LIKE 'Department Assessment%' LIMIT 1), 
     'Academic Performance', 
     'Number of research papers published in peer-reviewed journals', 
     'count', 
     25.00, 
     1, 
     TRUE,
     'Enter the count and provide supporting documents (publication list, certificates, etc.)'),
     
    -- Text question with optional documents
    ((SELECT id FROM score_card_templates WHERE title LIKE 'Department Assessment%' LIMIT 1),
     'Infrastructure', 
     'Describe your department infrastructure and facilities', 
     'text', 
     20.00, 
     2, 
     FALSE,
     'Provide detailed description. Documents optional.'),
     
    -- Upload question (documents required)
    ((SELECT id FROM score_card_templates WHERE title LIKE 'Department Assessment%' LIMIT 1),
     'Documentation', 
     'Submit department annual report', 
     'upload', 
     15.00, 
     3, 
     TRUE,
     'Provide the annual report via any submission method');
*/

-- =====================================================
-- 10. Verification Queries
-- =====================================================

-- Verify table creation
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name LIKE 'score_card%' 
ORDER BY table_name;

-- Check foreign key constraints
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints tc 
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name LIKE 'score_card%'
ORDER BY tc.table_name;

-- Check indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename LIKE 'score_card%'
ORDER BY tablename, indexname;

-- =====================================================
-- 11. Grant Permissions (Uncomment and modify as needed)
-- =====================================================

-- Grant permissions to application user (replace 'your_app_user' with actual username)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_app_user;

-- =====================================================
-- 12. Success Message
-- =====================================================
DO $$ 
BEGIN 
    RAISE NOTICE '🎉 Department Score Card tables created successfully!';
    RAISE NOTICE '📊 Tables Created:';
    RAISE NOTICE '   - score_card_templates';
    RAISE NOTICE '   - score_card_questions';  
    RAISE NOTICE '   - score_card_submissions';
    RAISE NOTICE '   - score_card_responses';
    RAISE NOTICE '   - score_card_documents';
    RAISE NOTICE '   - score_card_audit_log';
    RAISE NOTICE '📈 Views: score_card_analytics';
    RAISE NOTICE '⚡ Functions: recalculate_submission_score + trigger';
    RAISE NOTICE '🔗 Integrated with existing: users, departments, academic_years';
    RAISE NOTICE '✅ Ready for Score Card module implementation!';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Next Steps:';
    RAISE NOTICE '   1. Test with sample data (uncomment section 9)';
    RAISE NOTICE '   2. Grant permissions to application user (section 11)';
    RAISE NOTICE '   3. Start building your Score Card frontend!';
END $$;