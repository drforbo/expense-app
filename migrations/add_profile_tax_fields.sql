-- Add new profile fields for better tax estimation
-- Run this in Supabase SQL Editor

-- Add employment status fields
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS has_other_employment BOOLEAN DEFAULT FALSE;

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS employment_income INTEGER;

-- Add student loan plan
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS student_loan_plan TEXT DEFAULT 'none';

-- Add profile completion fields (for Profile screen)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS works_from_home BOOLEAN;

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS home_office_percentage INTEGER;

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS uses_vehicle_for_work BOOLEAN;

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS vehicle_business_percentage INTEGER;

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;

-- Comment on columns for documentation
COMMENT ON COLUMN user_profiles.has_other_employment IS 'Whether user has employment income in addition to side hustle';
COMMENT ON COLUMN user_profiles.employment_income IS 'Yearly salary from other employment (before tax)';
COMMENT ON COLUMN user_profiles.student_loan_plan IS 'Student loan plan: none, plan1, plan2, plan4, postgrad';
COMMENT ON COLUMN user_profiles.works_from_home IS 'Whether user works from home for their side hustle';
COMMENT ON COLUMN user_profiles.home_office_percentage IS 'Percentage of home used for work (for expense claims)';
COMMENT ON COLUMN user_profiles.uses_vehicle_for_work IS 'Whether user uses personal vehicle for work';
COMMENT ON COLUMN user_profiles.vehicle_business_percentage IS 'Percentage of vehicle use that is business-related';
COMMENT ON COLUMN user_profiles.profile_completed IS 'Whether user has completed all optional profile questions';
