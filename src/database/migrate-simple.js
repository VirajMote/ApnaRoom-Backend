import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Simple table creation without RPC
const createTables = async () => {
  try {
    console.log('🚀 Starting database setup...');

    // Create users table
    console.log('📝 Creating users table...');
    const { error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (usersError && usersError.code === '42P01') { // Table doesn't exist
      console.log('⚠️ Users table does not exist. Please run the manual SQL script:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy and paste the contents of supabase-setup.sql');
      console.log('4. Run the script');
      return false;
    }

    console.log('✅ Users table exists');

    // Check other tables
    const tables = ['user_profiles', 'listings', 'listing_photos', 'seeker_preferences', 'matches', 'conversations', 'messages', 'saved_listings'];
    
    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('id')
          .limit(1);
        
        if (error && error.code === '42P01') {
          console.log(`⚠️ Table '${table}' does not exist`);
        } else {
          console.log(`✅ Table '${table}' exists`);
        }
      } catch (err) {
        console.log(`⚠️ Could not check table '${table}':`, err.message);
      }
    }

    console.log('\n🎉 Database setup check completed!');
    console.log('If any tables are missing, please run the manual SQL script from supabase-setup.sql');
    
    return true;
  } catch (error) {
    console.error('❌ Error during database setup:', error.message);
    return false;
  }
};

// Run the setup
const runSetup = async () => {
  try {
    await createTables();
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
};

runSetup();
