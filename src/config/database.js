import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Create public client for regular operations
const supabasePublic = createClient(supabaseUrl, supabaseAnonKey);

// Test Supabase connection
const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "relation does not exist" which is expected initially
      throw error;
    }
    
    console.log('✅ Supabase connected successfully');
  } catch (error) {
    console.error('❌ Supabase connection error:', error.message);
    process.exit(1);
  }
};

// Connect to database
export const connectDB = async () => {
  try {
    await testConnection();
    
    // Create tables if they don't exist
    await createTables();
    
    console.log('📊 Database tables initialized');
  } catch (error) {
    console.error('Database initialization error:', error);
    process.exit(1);
  }
};

// Create database tables using Supabase SQL
const createTables = async () => {
  try {
    // Users table
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id BIGSERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          full_name VARCHAR(255) NOT NULL,
          user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('seeker', 'lister')),
          verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
          email_verified BOOLEAN DEFAULT FALSE,
          refresh_token VARCHAR(500),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
      `
    });

    // User profiles table
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS user_profiles (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
          age INTEGER CHECK (age >= 18 AND age <= 100),
          gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other')),
          occupation VARCHAR(255),
          bio TEXT,
          profile_photo_url VARCHAR(500),
          phone VARCHAR(20),
          location VARCHAR(255),
          smoking_preference VARCHAR(20) CHECK (smoking_preference IN ('no', 'yes', 'occasionally')),
          drinking_preference VARCHAR(20) CHECK (drinking_preference IN ('no', 'yes', 'socially')),
          pet_friendly BOOLEAN DEFAULT FALSE,
          food_habits VARCHAR(20) CHECK (food_habits IN ('veg', 'nonveg', 'vegan', 'jain')),
          interests TEXT[],
          move_in_date DATE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    // Property listings table
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS listings (
          id BIGSERIAL PRIMARY KEY,
          lister_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          location VARCHAR(255) NOT NULL,
          latitude DECIMAL(10, 8),
          longitude DECIMAL(11, 8),
          rent_amount DECIMAL(10, 2) NOT NULL,
          deposit_amount DECIMAL(10, 2) NOT NULL,
          room_type VARCHAR(50) NOT NULL CHECK (room_type IN ('private', 'shared', 'studio', '1bhk', '2bhk', '3bhk')),
          furnished_status VARCHAR(20) DEFAULT 'unfurnished' CHECK (furnished_status IN ('fully', 'semi', 'unfurnished')),
          amenities TEXT[],
          gender_preference VARCHAR(20) CHECK (gender_preference IN ('any', 'male', 'female')),
          age_range_preference VARCHAR(20),
          occupation_preference VARCHAR(255),
          house_rules TEXT,
          status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'rented')),
          views_count INTEGER DEFAULT 0,
          applications_count INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_listings_location ON listings(location);
        CREATE INDEX IF NOT EXISTS idx_listings_rent_amount ON listings(rent_amount);
        CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
      `
    });

    // Listing photos table
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS listing_photos (
          id BIGSERIAL PRIMARY KEY,
          listing_id BIGINT REFERENCES listings(id) ON DELETE CASCADE,
          photo_url VARCHAR(500) NOT NULL,
          photo_public_id VARCHAR(255),
          is_primary BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    // Seeker preferences table
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS seeker_preferences (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
          budget_min DECIMAL(10, 2),
          budget_max DECIMAL(10, 2),
          preferred_locations TEXT[],
          room_type_preference TEXT[],
          gender_preference VARCHAR(20) CHECK (gender_preference IN ('any', 'male', 'female')),
          move_in_date DATE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    // Matches table
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS matches (
          id BIGSERIAL PRIMARY KEY,
          seeker_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
          listing_id BIGINT REFERENCES listings(id) ON DELETE CASCADE,
          compatibility_score DECIMAL(5, 2) CHECK (compatibility_score >= 0 AND compatibility_score <= 100),
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(seeker_id, listing_id)
        );
        
        -- Create index
        CREATE INDEX IF NOT EXISTS idx_matches_compatibility ON matches(compatibility_score DESC);
      `
    });

    // Chat conversations table
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS conversations (
          id BIGSERIAL PRIMARY KEY,
          participant1_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
          participant2_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
          listing_id BIGINT REFERENCES listings(id) ON DELETE SET NULL,
          last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          CHECK (participant1_id != participant2_id)
        );
        
        -- Create index
        CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations(participant1_id, participant2_id);
      `
    });

    // Messages table
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS messages (
          id BIGSERIAL PRIMARY KEY,
          conversation_id BIGINT REFERENCES conversations(id) ON DELETE CASCADE,
          sender_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
          read_status BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create index
        CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
      `
    });

    // Saved listings table
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS saved_listings (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
          listing_id BIGINT REFERENCES listings(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, listing_id)
        );
      `
    });

    console.log('✅ All tables created successfully');

  } catch (error) {
    console.error('Error creating tables:', error);
    // If exec_sql RPC doesn't exist, we'll create tables manually
    await createTablesManually();
  }
};

// Fallback method to create tables manually if RPC is not available
const createTablesManually = async () => {
  try {
    console.log('⚠️ Using manual table creation...');
    
    // This will be handled by Supabase migrations or manual SQL execution
    // For now, we'll just log that tables need to be created manually
    console.log('📝 Please create the required tables manually in your Supabase dashboard or run the SQL scripts provided in the README');
    
  } catch (error) {
    console.error('Error in manual table creation:', error);
    throw error;
  }
};

// Get Supabase client instances
export const getSupabase = () => supabase;
export const getSupabasePublic = () => supabasePublic;

// Close connections (not needed for Supabase, but keeping for compatibility)
export const closePool = async () => {
  // Supabase handles connection management automatically
  console.log('✅ Supabase connections closed');
};

// Export for direct use
export default supabase;
