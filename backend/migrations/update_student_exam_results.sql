-- Add submission_id column to student_exam_results table if it doesn't exist
-- This allows linking exam results to submission records

-- Check if the column exists and add it if needed
ALTER TABLE student_exam_results 
ADD COLUMN IF NOT EXISTS submission_id INT NULL AFTER user_id;

-- Add index for better query performance
ALTER TABLE student_exam_results 
ADD INDEX IF NOT EXISTS idx_submission_id (submission_id);

-- Ensure created_at column exists with default value
ALTER TABLE student_exam_results 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER not_answered;

-- Add unique constraint to prevent duplicate results for same exam and student
-- Remove it first if it exists, then add it
ALTER TABLE student_exam_results 
DROP INDEX IF EXISTS unique_exam_student;

ALTER TABLE student_exam_results 
ADD UNIQUE INDEX unique_exam_student (exam_id, user_id);
