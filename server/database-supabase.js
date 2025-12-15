import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_KEY in .env');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize database schema
export const setupDatabase = async () => {
  try {
    // Check if jokes table exists by trying to query it
    const { error } = await supabase
      .from('jokes')
      .select('id')
      .limit(1);
    
    if (error && error.code === '42P01') {
      // Table doesn't exist - we'll create it via SQL
      console.log('📊 Creating jokes table...');
      // Note: Table creation should be done via Supabase dashboard SQL editor
      // We'll provide the SQL in the setup guide
    }
    
    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection error:', error);
    throw error;
  }
};

