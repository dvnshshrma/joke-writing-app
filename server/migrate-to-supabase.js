import { supabase } from './database-supabase.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const exportPath = join(__dirname, 'localStorage-export.json');

async function migrateToSupabase() {
  try {
    console.log('☁️  Connecting to Supabase...');
    
    // Test connection
    const { error: testError } = await supabase.from('jokes').select('id').limit(1);
    if (testError) {
      console.error('❌ Connection failed:', testError.message);
      console.log('\n💡 Make sure:');
      console.log('   1. You have created the jokes table in Supabase');
      console.log('   2. Your SUPABASE_URL and SUPABASE_KEY are correct in .env');
      process.exit(1);
    }
    
    if (!fs.existsSync(exportPath)) {
      console.log(`
❌ File not found: ${exportPath}

Please:
1. Export your jokes using export-now.html
2. Save the JSON file as localStorage-export.json in the server folder
3. Run this script again
      `);
      process.exit(1);
    }
    
    console.log('\n📥 Reading jokes from localStorage-export.json...');
    const jokesJson = fs.readFileSync(exportPath, 'utf-8');
    const jokes = JSON.parse(jokesJson);
    
    if (!Array.isArray(jokes)) {
      throw new Error('Expected an array of jokes');
    }
    
    console.log(`\n📋 Found ${jokes.length} joke(s) to migrate\n`);
    
    let migrated = 0;
    let skipped = 0;
    
    for (const joke of jokes) {
      // Migrate old format to new format
      let sections = [];
      
      if (joke.sections && Array.isArray(joke.sections)) {
        // Already in new format
        sections = joke.sections;
      } else if (joke.contexts || joke.punchlines) {
        // Intermediate format
        if (joke.contexts) {
          joke.contexts.forEach(ctx => {
            sections.push({ ...ctx, type: 'context' });
          });
        }
        if (joke.punchlines) {
          joke.punchlines.forEach(pl => {
            sections.push({ ...pl, type: 'punchline' });
          });
        }
      } else if (joke.context || joke.punchline) {
        // Old format (single strings)
        if (joke.context) {
          sections.push({ 
            id: Date.now().toString(), 
            type: 'context', 
            text: joke.context 
          });
        }
        if (joke.punchline) {
          sections.push({ 
            id: (Date.now() + 1).toString(), 
            type: 'punchline', 
            text: joke.punchline 
          });
        }
      }
      
      const jokeDoc = {
        id: joke.id,
        header: joke.header || '',
        sections: sections,
        is_draft: joke.isDraft !== false,
        comments: joke.comments || {},
        strikethrough_texts: joke.strikethroughTexts || [],
        replacements: joke.replacements || {},
        created_at: joke.createdAt || new Date().toISOString(),
        updated_at: joke.updatedAt || new Date().toISOString()
      };
      
      // Use upsert to avoid duplicates
      const { error } = await supabase
        .from('jokes')
        .upsert(jokeDoc, { onConflict: 'id' });
      
      if (error) {
        console.error(`❌ Error migrating ${joke.header || 'Untitled'}:`, error.message);
        skipped++;
      } else {
        console.log(`✅ Migrated: ${joke.header || 'Untitled'} (ID: ${joke.id})`);
        migrated++;
      }
    }
    
    console.log(`\n🎉 Migration complete!`);
    console.log(`   ✅ Migrated: ${migrated} joke(s)`);
    console.log(`   ⏭️  Skipped: ${skipped} joke(s)`);
    console.log(`\n☁️  Your jokes are now in the cloud!\n`);
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  }
}

migrateToSupabase();

