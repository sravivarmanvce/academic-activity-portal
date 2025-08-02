# Database Migration: Add Time Limits to Deadline Overrides
# Run this if you already have the deadline_overrides table

-- Add new columns for time limits
ALTER TABLE deadline_overrides 
ADD COLUMN expires_at TIMESTAMP,
ADD COLUMN duration_hours INTEGER DEFAULT 24;

-- Update existing overrides to expire in 24 hours from creation
UPDATE deadline_overrides 
SET expires_at = created_at + INTERVAL '24 hours',
    duration_hours = 24
WHERE expires_at IS NULL;

-- Add index for performance on expiration queries
CREATE INDEX idx_deadline_overrides_expires_at ON deadline_overrides(expires_at);
