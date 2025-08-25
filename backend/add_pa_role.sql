-- PostgreSQL Script to Add PA to Principal Role Support
-- File: add_pa_role.sql
-- Execute this script in your PostgreSQL database (pgAdmin, psql, or any PostgreSQL client)

-- =====================================================
-- Step 1: Verify current database structure
-- =====================================================

-- Check current users table structure
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Check current users and their roles
SELECT 
    id, 
    name, 
    email, 
    role, 
    department_id,
    CASE 
        WHEN role = 'admin' THEN '🔧 Administrator'
        WHEN role = 'principal' THEN '👤 Principal'
        WHEN role = 'pa_principal' THEN '✅ PA to Principal'
        WHEN role = 'hod' THEN '🏢 Head of Department'
        WHEN role = 'faculty' THEN '🎓 Faculty'
        WHEN role = 'dean' THEN '🎯 Dean'
        ELSE '❓ Other: ' || role
    END as role_description
FROM users 
ORDER BY 
    CASE role
        WHEN 'admin' THEN 1
        WHEN 'principal' THEN 2
        WHEN 'pa_principal' THEN 3
        WHEN 'dean' THEN 4
        WHEN 'hod' THEN 5
        WHEN 'faculty' THEN 6
        ELSE 7
    END, name;

-- Count users by role
SELECT 
    role,
    COUNT(*) as user_count,
    CASE 
        WHEN role = 'admin' THEN '🔧 Administrator'
        WHEN role = 'principal' THEN '👤 Principal'
        WHEN role = 'pa_principal' THEN '✅ PA to Principal (NEW)'
        WHEN role = 'hod' THEN '🏢 Head of Department'
        WHEN role = 'faculty' THEN '🎓 Faculty'
        WHEN role = 'dean' THEN '🎯 Dean'
        ELSE '❓ Other'
    END as description
FROM users 
GROUP BY role 
ORDER BY 
    CASE role
        WHEN 'admin' THEN 1
        WHEN 'principal' THEN 2
        WHEN 'pa_principal' THEN 3
        WHEN 'dean' THEN 4
        WHEN 'hod' THEN 5
        WHEN 'faculty' THEN 6
        ELSE 7
    END;

-- =====================================================
-- Step 2: Verify role column can handle 'pa_principal' (12 characters)
-- =====================================================

-- Check if role column is sufficient
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    CASE 
        WHEN character_maximum_length >= 12 THEN '✅ Column is sufficient for pa_principal'
        WHEN character_maximum_length < 12 THEN '❌ Column too short - needs to be extended'
        ELSE '⚠️ Check column definition'
    END as pa_role_compatibility
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'role';

-- =====================================================
-- Step 3: Fix existing role constraint to include PA role
-- =====================================================

-- First, check what constraints exist on the users table
SELECT 
    tc.constraint_name, 
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'users' 
    AND tc.constraint_type = 'CHECK'
    AND tc.constraint_name LIKE '%role%';

-- Drop the existing role constraint that's blocking pa_principal
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_valid_roles;

-- Add new constraint that includes pa_principal role
ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role IN (
        'admin', 
        'principal', 
        'pa_principal',  -- New PA role - this was missing!
        'hod', 
        'faculty', 
        'dean'
    ));

-- Verify the new constraint was added correctly
SELECT 
    constraint_name, 
    check_clause,
    '✅ Constraint updated to include pa_principal' as status
FROM information_schema.check_constraints 
WHERE constraint_name = 'users_role_check';

-- =====================================================
-- Step 4: Fix sequence and create PA user
-- =====================================================

-- First, check if the PA user already exists
SELECT 
    id, name, email, role, department_id,
    'User already exists!' as status
FROM users 
WHERE email = 'principaloffice@vardhaman.org'
UNION ALL
SELECT 
    NULL, 'No existing user found', '', '', NULL,
    'Ready to create new user' as status
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'principaloffice@vardhaman.org'
);

-- Fix the sequence to prevent ID conflicts
-- Get the current max ID and reset the sequence
SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE(MAX(id), 1), true) FROM users;

-- Now create or update the PA user safely
DO $$
BEGIN
    -- Try to insert the new user
    INSERT INTO users (name, email, role, department_id) 
    VALUES (
        'Principal Office',                -- PA user name
        'principaloffice@vardhaman.org',   -- PA user email
        'pa_principal',                    -- PA to Principal role
        NULL                               -- PA role doesn't belong to a specific department
    );
    RAISE NOTICE 'PA user created successfully!';
EXCEPTION 
    WHEN unique_violation THEN
        -- If email already exists, update the role
        UPDATE users 
        SET name = 'Principal Office',
            role = 'pa_principal',
            department_id = NULL
        WHERE email = 'principaloffice@vardhaman.org';
        RAISE NOTICE 'Existing user updated to PA role!';
END $$;

-- Verify the PA user was created/updated successfully
SELECT 
    id, name, email, role, department_id,
    '✅ PA user ready!' as status
FROM users 
WHERE email = 'principaloffice@vardhaman.org';

-- =====================================================
-- Step 5: Verification and Summary
-- =====================================================

-- Final verification - show all users with their roles
SELECT 
    'Database Setup Complete!' as status,
    COUNT(*) as total_users,
    COUNT(CASE WHEN role = 'pa_principal' THEN 1 END) as pa_users
FROM users;

-- Show role distribution
SELECT 
    '📊 Role Distribution:' as summary,
    STRING_AGG(
        role_summary, 
        ', ' ORDER BY sort_order
    ) as role_counts
FROM (
    SELECT 
        role || ': ' || COUNT(*)::text as role_summary,
        CASE role
            WHEN 'admin' THEN 1
            WHEN 'principal' THEN 2
            WHEN 'pa_principal' THEN 3
            WHEN 'dean' THEN 4
            WHEN 'hod' THEN 5
            WHEN 'faculty' THEN 6
            ELSE 7
        END as sort_order
    FROM users 
    GROUP BY role
) role_stats;

-- =====================================================
-- Step 6: Success confirmation
-- =====================================================

SELECT 
    '🎉 PA to Principal Role Setup Complete!' as message,
    'Frontend has been updated to support the new role.' as frontend_status,
    'Use the Manage Users interface to create PA users.' as next_step,
    'PA users will have read-only access with reporting capabilities.' as permissions;
