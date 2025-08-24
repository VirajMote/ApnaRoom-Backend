import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
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

// Sample data
const sampleUsers = [
  {
    email: 'john.doe@example.com',
    password_hash: bcrypt.hashSync('password123', 10),
    full_name: 'John Doe',
    user_type: 'seeker',
    verification_status: 'verified',
    email_verified: true
  },
  {
    email: 'jane.smith@example.com',
    password_hash: bcrypt.hashSync('password123', 10),
    full_name: 'Jane Smith',
    user_type: 'lister',
    verification_status: 'verified',
    email_verified: true
  },
  {
    email: 'mike.wilson@example.com',
    password_hash: bcrypt.hashSync('password123', 10),
    full_name: 'Mike Wilson',
    user_type: 'seeker',
    verification_status: 'verified',
    email_verified: true
  },
  {
    email: 'sarah.jones@example.com',
    password_hash: bcrypt.hashSync('password123', 10),
    full_name: 'Sarah Jones',
    user_type: 'lister',
    verification_status: 'verified',
    email_verified: true
  }
];

const sampleUserProfiles = [
  {
    age: 25,
    gender: 'male',
    occupation: 'Software Engineer',
    bio: 'Looking for a quiet place to work and live. I\'m clean and organized.',
    phone: '+1234567890',
    location: 'Downtown',
    smoking_preference: 'no',
    drinking_preference: 'socially',
    pet_friendly: true,
    food_habits: 'nonveg',
    interests: ['coding', 'reading', 'hiking'],
    move_in_date: '2024-02-01'
  },
  {
    age: 28,
    gender: 'female',
    occupation: 'Marketing Manager',
    bio: 'Professional and friendly. Looking for responsible roommates.',
    phone: '+1234567891',
    location: 'Midtown',
    smoking_preference: 'no',
    drinking_preference: 'no',
    pet_friendly: false,
    food_habits: 'veg',
    interests: ['yoga', 'cooking', 'travel'],
    move_in_date: '2024-01-15'
  },
  {
    age: 23,
    gender: 'male',
    occupation: 'Graduate Student',
    bio: 'Student looking for affordable housing near campus.',
    phone: '+1234567892',
    location: 'University Area',
    smoking_preference: 'no',
    drinking_preference: 'no',
    pet_friendly: true,
    food_habits: 'vegan',
    interests: ['studying', 'music', 'sports'],
    move_in_date: '2024-02-15'
  },
  {
    age: 30,
    gender: 'female',
    occupation: 'Architect',
    bio: 'Creative professional seeking like-minded roommates.',
    phone: '+1234567893',
    location: 'Arts District',
    smoking_preference: 'occasionally',
    drinking_preference: 'socially',
    pet_friendly: true,
    food_habits: 'jain',
    interests: ['art', 'design', 'photography'],
    move_in_date: '2024-01-01'
  }
];

const sampleListings = [
  {
    title: 'Cozy 2BR Apartment in Downtown',
    description: 'Beautiful 2-bedroom apartment with modern amenities, located in the heart of downtown. Walking distance to restaurants, shops, and public transport.',
    location: 'Downtown',
    latitude: 40.7128,
    longitude: -74.0060,
    rent_amount: 2500.00,
    deposit_amount: 2500.00,
    room_type: '2bhk',
    furnished_status: 'fully',
    amenities: ['WiFi', 'AC', 'Dishwasher', 'Gym', 'Parking'],
    gender_preference: 'any',
    age_range_preference: '20-35',
    occupation_preference: 'Professionals',
    house_rules: 'No smoking, quiet hours 10 PM - 7 AM',
    status: 'active'
  },
  {
    title: 'Private Room in Shared House',
    description: 'Large private room in a 4-bedroom house. Shared kitchen, living room, and backyard. Perfect for students or young professionals.',
    location: 'University Area',
    latitude: 40.7589,
    longitude: -73.9851,
    rent_amount: 1200.00,
    deposit_amount: 1200.00,
    room_type: 'private',
    furnished_status: 'semi',
    amenities: ['WiFi', 'AC', 'Backyard', 'Laundry', 'Kitchen'],
    gender_preference: 'any',
    age_range_preference: '18-30',
    occupation_preference: 'Students/Professionals',
    house_rules: 'Respect shared spaces, clean up after yourself',
    status: 'active'
  },
  {
    title: 'Studio Apartment Near Subway',
    description: 'Compact studio apartment perfect for one person. Close to subway station and shopping center. Includes basic furniture.',
    location: 'Midtown',
    latitude: 40.7505,
    longitude: -73.9934,
    rent_amount: 1800.00,
    deposit_amount: 1800.00,
    room_type: 'studio',
    furnished_status: 'semi',
    amenities: ['WiFi', 'AC', 'Furnished', 'Subway Access', 'Shopping Nearby'],
    gender_preference: 'any',
    age_range_preference: '18+',
    occupation_preference: 'Any',
    house_rules: 'No pets, no smoking',
    status: 'active'
  }
];

const sampleSeekerPreferences = [
  {
    budget_min: 1000.00,
    budget_max: 2000.00,
    preferred_locations: ['Downtown', 'Midtown', 'University Area'],
    room_type_preference: ['private', 'shared', 'studio'],
    gender_preference: 'any',
    move_in_date: '2024-02-01'
  },
  {
    budget_min: 800.00,
    budget_max: 1500.00,
    preferred_locations: ['University Area', 'Downtown'],
    room_type_preference: ['private', 'shared'],
    gender_preference: 'any',
    move_in_date: '2024-02-15'
  }
];

// Seed database
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🧹 Clearing existing data...');
    await clearExistingData();

    // Insert users
    console.log('👥 Inserting users...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .insert(sampleUsers)
      .select('id, email');

    if (usersError) {
      console.error('❌ Error inserting users:', usersError);
      throw usersError;
    }

    console.log(`✅ Inserted ${users.length} users`);

    // Insert user profiles
    console.log('👤 Inserting user profiles...');
    const userProfilesWithIds = sampleUserProfiles.map((profile, index) => ({
      ...profile,
      user_id: users[index].id
    }));

    const { error: profilesError } = await supabase
      .from('user_profiles')
      .insert(userProfilesWithIds);

    if (profilesError) {
      console.error('❌ Error inserting user profiles:', profilesError);
      throw profilesError;
    }

    console.log(`✅ Inserted ${userProfilesWithIds.length} user profiles`);

    // Insert listings (only for lister users)
    console.log('🏠 Inserting listings...');
    const listerUsers = users.filter(user => 
      sampleUsers.find(sampleUser => sampleUser.email === user.email)?.user_type === 'lister'
    );

    const listingsWithIds = sampleListings.map((listing, index) => ({
      ...listing,
      lister_id: listerUsers[index]?.id || listerUsers[0]?.id
    }));

    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .insert(listingsWithIds)
      .select('id, title');

    if (listingsError) {
      console.error('❌ Error inserting listings:', listingsError);
      throw listingsError;
    }

    console.log(`✅ Inserted ${listings.length} listings`);

    // Insert seeker preferences
    console.log('🎯 Inserting seeker preferences...');
    const seekerUsers = users.filter(user => 
      sampleUsers.find(sampleUser => sampleUser.email === user.email)?.user_type === 'seeker'
    );

    const preferencesWithIds = sampleSeekerPreferences.map((preference, index) => ({
      ...preference,
      user_id: seekerUsers[index]?.id || seekerUsers[0]?.id
    }));

    const { error: preferencesError } = await supabase
      .from('seeker_preferences')
      .insert(preferencesWithIds);

    if (preferencesError) {
      console.error('❌ Error inserting seeker preferences:', preferencesError);
      throw preferencesError;
    }

    console.log(`✅ Inserted ${preferencesWithIds.length} seeker preferences`);

    // Insert sample matches
    console.log('💕 Inserting sample matches...');
    const seekerUser = seekerUsers[0];
    const sampleListing = listings[0];

    if (seekerUser && sampleListing) {
      const { error: matchesError } = await supabase
        .from('matches')
        .insert({
          seeker_id: seekerUser.id,
          listing_id: sampleListing.id,
          compatibility_score: 85.5,
          status: 'pending'
        });

      if (matchesError) {
        console.error('❌ Error inserting matches:', matchesError);
      } else {
        console.log('✅ Inserted sample match');
      }
    }

    // Insert sample conversation
    console.log('💬 Inserting sample conversation...');
    const participant1 = users[0];
    const participant2 = users[1];

    if (participant1 && participant2) {
      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({
          participant1_id: participant1.id,
          participant2_id: participant2.id,
          listing_id: listings[0]?.id || null
        })
        .select('id')
        .single();

      if (conversationError) {
        console.error('❌ Error inserting conversation:', conversationError);
      } else {
        // Insert sample message
        const { error: messageError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversation.id,
            sender_id: participant1.id,
            content: 'Hi! I\'m interested in your listing. Is it still available?',
            message_type: 'text',
            read_status: false
          });

        if (messageError) {
          console.error('❌ Error inserting message:', messageError);
        } else {
          console.log('✅ Inserted sample conversation and message');
        }
      }
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log(`📊 Sample data summary:`);
    console.log(`   - Users: ${users.length}`);
    console.log(`   - User Profiles: ${userProfilesWithIds.length}`);
    console.log(`   - Listings: ${listings.length}`);
    console.log(`   - Seeker Preferences: ${preferencesWithIds.length}`);

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
};

// Clear existing data
const clearExistingData = async () => {
  try {
    // Clear in reverse order due to foreign key constraints
    const tables = [
      'messages',
      'conversations', 
      'matches',
      'saved_listings',
      'listing_photos',
      'seeker_preferences',
      'listings',
      'user_profiles',
      'users'
    ];

    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', 0); // Delete all records

      if (error) {
        console.log(`⚠️ Could not clear table ${table}:`, error.message);
      } else {
        console.log(`🧹 Cleared table: ${table}`);
      }
    }
  } catch (error) {
    console.log('⚠️ Error clearing existing data:', error.message);
  }
};

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase();
}

export { seedDatabase };
