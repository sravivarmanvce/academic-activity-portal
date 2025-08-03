-- SQL script to create the events table in PostgreSQL
-- Run this script in your PostgreSQL database

CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    event_time VARCHAR(10) NOT NULL, -- Time as string in HH:MM format
    participant_count INTEGER NOT NULL,
    budget_amount FLOAT NOT NULL,
    venue VARCHAR(200),
    coordinator_name VARCHAR(100),
    coordinator_contact VARCHAR(100),
    
    -- Foreign Keys
    department_id INTEGER NOT NULL REFERENCES departments(id),
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id),
    program_type_id INTEGER NOT NULL REFERENCES program_types(id),
    
    -- Status and Audit Fields
    event_status VARCHAR(20) NOT NULL DEFAULT 'planned', -- 'planned', 'ongoing', 'completed', 'cancelled'
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX idx_events_department_id ON events(department_id);
CREATE INDEX idx_events_academic_year_id ON events(academic_year_id);
CREATE INDEX idx_events_program_type_id ON events(program_type_id);
CREATE INDEX idx_events_event_date ON events(event_date);
CREATE INDEX idx_events_status ON events(event_status);

-- Add comments for documentation
COMMENT ON TABLE events IS 'Stores planned and executed events for approved programs';
COMMENT ON COLUMN events.title IS 'Event title/name';
COMMENT ON COLUMN events.event_date IS 'Date when the event is scheduled';
COMMENT ON COLUMN events.event_time IS 'Time when the event starts (HH:MM format)';
COMMENT ON COLUMN events.participant_count IS 'Expected number of participants';
COMMENT ON COLUMN events.budget_amount IS 'Budget allocated for this event';
COMMENT ON COLUMN events.event_status IS 'Current status: planned, ongoing, completed, cancelled';
