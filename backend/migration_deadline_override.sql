# Database Migration: Add Deadline Override Table
# Run this in your PostgreSQL database

CREATE TABLE deadline_overrides (
    id SERIAL PRIMARY KEY,
    department_id INTEGER NOT NULL,
    academic_year_id INTEGER NOT NULL,
    module_name VARCHAR(50) NOT NULL,
    enabled_by_principal BOOLEAN DEFAULT TRUE,
    reason TEXT,
    expires_at TIMESTAMP,
    duration_hours INTEGER DEFAULT 24,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (department_id) REFERENCES departments (id),
    FOREIGN KEY (academic_year_id) REFERENCES academic_years (id),
    UNIQUE(department_id, academic_year_id, module_name)
);

-- Add indexes for performance
CREATE INDEX idx_deadline_overrides_dept_year_module ON deadline_overrides(department_id, academic_year_id, module_name);
