import { supabase } from './database-supabase.js';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  try {
    console.log('🔌 Testing Supabase connection...');
    
    // Test connection by querying jokes table
    const { data, error } = await supabase
      .from('jokes')
      .select('id')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        console.log('❌ Table "jokes" does not exist yet.');
        console.log('\n💡 Please create the table first:');
        console.log('   1. Go to your Supabase dashboard');
        console.log('   2. Navigate to SQL Editor');
        console.log('   3. Run the SQL from SUPABASE_SETUP.md');
        process.exit(1);
      }
      throw error;
    }
    
    console.log('✅ Successfully connected to Supabase!');
    console.log(`📊 Database: Connected`);
    console.log(`📁 Jokes in database: ${data ? data.length : 0}`);
    
    // Test write
    const testId = 'test-' + Date.now();
    const { error: insertError } = await supabase
      .from('jokes')
      .insert([{
        id: testId,
        header: 'Test',
        sections: [],
        is_draft: true,
        comments: {},
        strikethrough_texts: [],
        replacements: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]);
    
    if (insertError) throw insertError;
    
    // Clean up test
    await supabase.from('jokes').delete().eq('id', testId);
    
    console.log('✅ Read/Write test passed!');
    console.log('\n🎉 Connection test successful! Ready to migrate jokes.');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('\n💡 Check:');
    console.log('   - SUPABASE_URL is correct in .env');
    console.log('   - SUPABASE_KEY is correct in .env');
    console.log('   - Table "jokes" exists in your database');
    process.exit(1);
  }
}

testConnection();
