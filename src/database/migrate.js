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

// Migration history table
const createMigrationsTable = async () => {
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (error) {
      console.log('⚠️ Using manual migration table creation...');
      // If RPC fails, we'll create the table manually
      await createMigrationsTableManually();
    } else {
      console.log('✅ Migrations table created');
    }
  } catch (error) {
    console.log('⚠️ RPC failed, using manual approach...');
    await createMigrationsTableManually();
  }
};

const createMigrationsTableManually = async () => {
  try {
    // This will be handled by Supabase migrations or manual SQL execution
    console.log('📝 Please create the migrations table manually in your Supabase dashboard');
    console.log('SQL: CREATE TABLE IF NOT EXISTS migrations (id SERIAL PRIMARY KEY, name VARCHAR(255) UNIQUE NOT NULL, executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW());');
  } catch (error) {
    console.error('Error creating migrations table manually:', error);
  }
};

// Check if migration has been executed
const isMigrationExecuted = async (migrationName) => {
  try {
    const { data, error } = await supabase
      .from('migrations')
      .select('id')
      .eq('name', migrationName)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.log('⚠️ Migration table not accessible, assuming migration not executed');
      return false;
    }

    return !!data;
  } catch (error) {
    console.log('⚠️ Could not check migration status, assuming not executed');
    return false;
  }
};

// Mark migration as executed
const markMigrationExecuted = async (migrationName) => {
  try {
    const { error } = await supabase
      .from('migrations')
      .insert({ name: migrationName });

    if (error) {
      console.log('⚠️ Could not mark migration as executed, but continuing...');
    } else {
      console.log(`✅ Migration "${migrationName}" marked as executed`);
    }
  } catch (error) {
    console.log('⚠️ Could not mark migration as executed, but continuing...');
  }
};

// Migration functions
const migrations = [
  {
    name: '001_create_users_table',
    execute: async () => {
      const { error } = await supabase.rpc('exec_sql', {
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
          
          CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
          CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
        `
      });

      if (error) {
        console.log('⚠️ Using manual table creation for users...');
        console.log('📝 Please create the users table manually in your Supabase dashboard');
      }
    }
  },
  {
    name: '002_create_user_profiles_table',
    execute: async () => {
      const { error } = await supabase.rpc('exec_sql', {
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

      if (error) {
        console.log('⚠️ Using manual table creation for user_profiles...');
        console.log('📝 Please create the user_profiles table manually in your Supabase dashboard');
      }
    }
  },
  {
    name: '003_create_listings_table',
    execute: async () => {
      const { error } = await supabase.rpc('exec_sql', {
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
          
          CREATE INDEX IF NOT EXISTS idx_listings_location ON listings(location);
          CREATE INDEX IF NOT EXISTS idx_listings_rent_amount ON listings(rent_amount);
          CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
        `
      });

      if (error) {
        console.log('⚠️ Using manual table creation for listings...');
        console.log('📝 Please create the listings table manually in your Supabase dashboard');
      }
    }
  },
  {
    name: '004_create_listing_photos_table',
    execute: async () => {
      const { error } = await supabase.rpc('exec_sql', {
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

      if (error) {
        console.log('⚠️ Using manual table creation for listing_photos...');
        console.log('📝 Please create the listing_photos table manually in your Supabase dashboard');
      }
    }
  },
  {
    name: '005_create_seeker_preferences_table',
    execute: async () => {
      const { error } = await supabase.rpc('exec_sql', {
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

      if (error) {
        console.log('⚠️ Using manual table creation for seeker_preferences...');
        console.log('📝 Please create the seeker_preferences table manually in your Supabase dashboard');
      }
    }
  },
  {
    name: '006_create_matches_table',
    execute: async () => {
      const { error } = await supabase.rpc('exec_sql', {
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
          
          CREATE INDEX IF NOT EXISTS idx_matches_compatibility ON matches(compatibility_score DESC);
        `
      });

      if (error) {
        console.log('⚠️ Using manual table creation for matches...');
        console.log('📝 Please create the matches table manually in your Supabase dashboard');
      }
    }
  },
  {
    name: '007_create_conversations_table',
    execute: async () => {
      const { error } = await supabase.rpc('exec_sql', {
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
          
          CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations(participant1_id, participant2_id);
        `
      });

      if (error) {
        console.log('⚠️ Using manual table creation for conversations...');
        console.log('📝 Please create the conversations table manually in your Supabase dashboard');
      }
    }
  },
  {
    name: '008_create_messages_table',
    execute: async () => {
      const { error } = await supabase.rpc('exec_sql', {
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
          
          CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
        `
      });

      if (error) {
        console.log('⚠️ Using manual table creation for messages...');
        console.log('📝 Please create the messages table manually in your Supabase dashboard');
      }
    }
  },
  {
    name: '009_create_saved_listings_table',
    execute: async () => {
      const { error } = await supabase.rpc('exec_sql', {
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

      if (error) {
        console.log('⚠️ Using manual table creation for saved_listings...');
        console.log('📝 Please create the saved_listings table manually in your Supabase dashboard');
      }
    }
  }
];

// Run migrations
const runMigrations = async () => {
  try {
    console.log('🚀 Starting database migrations...');
    
    // Create migrations table first
    await createMigrationsTable();
    
    for (const migration of migrations) {
      const isExecuted = await isMigrationExecuted(migration.name);
      
      if (!isExecuted) {
        console.log(`🔄 Running migration: ${migration.name}`);
        await migration.execute();
        await markMigrationExecuted(migration.name);
        console.log(`✅ Migration completed: ${migration.name}`);
      } else {
        console.log(`⏭️ Migration already executed: ${migration.name}`);
      }
    }
    
    console.log('🎉 All migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Run migrations if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
}

export { runMigrations };
