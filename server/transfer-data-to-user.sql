-- Transfer all existing data (user_id = NULL) to a specific user
-- Replace 'YOUR_USER_ID' with your actual user ID from Supabase

-- Step 1: Find your user ID
-- Go to Supabase Dashboard → Authentication → Users
-- Click on your user and copy the UUID (e.g., 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')

-- Step 2: Run these queries with your user ID

-- Transfer all jokes without a user_id to your account
UPDATE jokes 
SET user_id = 'YOUR_USER_ID'
WHERE user_id IS NULL;

-- Transfer all sets without a user_id to your account
UPDATE sets 
SET user_id = 'YOUR_USER_ID'
WHERE user_id IS NULL;

-- Transfer all analysis results without a user_id to your account
UPDATE analysis_results 
SET user_id = 'YOUR_USER_ID'
WHERE user_id IS NULL;

-- Verify the transfer
SELECT 'jokes' as table_name, COUNT(*) as count FROM jokes WHERE user_id = 'YOUR_USER_ID'
UNION ALL
SELECT 'sets' as table_name, COUNT(*) as count FROM sets WHERE user_id = 'YOUR_USER_ID'
UNION ALL
SELECT 'analysis_results' as table_name, COUNT(*) as count FROM analysis_results WHERE user_id = 'YOUR_USER_ID';

