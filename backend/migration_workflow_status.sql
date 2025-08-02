# Database Migration: Add Workflow Status Table
# Run this in your PostgreSQL database to create the workflow_status table

CREATE TABLE workflow_status (
    id SERIAL PRIMARY KEY,
    department_id INTEGER NOT NULL,
    academic_year_id INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    updated_at TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments (id),
    FOREIGN KEY (academic_year_id) REFERENCES academic_years (id),
    UNIQUE(department_id, academic_year_id)
);

-- Add indexes for performance
CREATE INDEX idx_workflow_status_dept_year ON workflow_status(department_id, academic_year_id);
