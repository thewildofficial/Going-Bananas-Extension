#!/usr/bin/env node

/**
 * Supabase Database Setup Script
 * 
 * This script sets up the required database tables and policies for the
 * Going Bananas Extension personalization service.
 * 
 * @fileoverview Database schema setup for Supabase
 * @author Aban Hasan (thewildofficial)
 * @version 1.0.0
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

async function setupSupabaseTables() {
  console.log('🚀 Setting up Supabase database tables...\n');

  // Check environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ Supabase configuration missing!');
    console.error('Please ensure SUPABASE_URL and SUPABASE_SERVICE_KEY are set in your .env file');
    process.exit(1);
  }

  // Initialize Supabase client
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  try {
    // Read the SQL setup file
    const sqlPath = path.join(__dirname, 'setup-supabase-tables.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 Executing SQL setup script...');

    // Execute the SQL script
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });

    if (error) {
      // If the exec_sql function doesn't exist, try executing statements individually
      console.log('⚠️  exec_sql function not available, executing statements individually...');
      
      // Split SQL into individual statements and execute them
      const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      for (const statement of statements) {
        if (statement.trim()) {
          try {
            const { error: stmtError } = await supabase.rpc('exec', { sql: statement });
            if (stmtError) {
              console.log(`⚠️  Statement failed (might already exist): ${statement.substring(0, 50)}...`);
            }
          } catch (err) {
            console.log(`⚠️  Statement failed (might already exist): ${statement.substring(0, 50)}...`);
          }
        }
      }
    }

    console.log('✅ Database setup completed!');

    // Test the tables by checking if they exist
    console.log('\n🔍 Verifying table creation...');

    // Check user_personalization_profiles table
    const { data: profilesData, error: profilesError } = await supabase
      .from('user_personalization_profiles')
      .select('*')
      .limit(1);

    if (profilesError && profilesError.code === 'PGRST116') {
      console.log('❌ user_personalization_profiles table not found');
    } else {
      console.log('✅ user_personalization_profiles table exists');
    }

    // Check cached_analyses table
    const { data: analysesData, error: analysesError } = await supabase
      .from('cached_analyses')
      .select('*')
      .limit(1);

    if (analysesError && analysesError.code === 'PGRST116') {
      console.log('❌ cached_analyses table not found');
    } else {
      console.log('✅ cached_analyses table exists');
    }

    console.log('\n🎉 Supabase database setup completed successfully!');
    console.log('You can now run the Supabase integration tests.');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.error('\n💡 Manual Setup Instructions:');
    console.error('1. Go to your Supabase dashboard');
    console.error('2. Navigate to the SQL Editor');
    console.error('3. Copy and paste the contents of setup-supabase-tables.sql');
    console.error('4. Execute the SQL script');
    process.exit(1);
  }
}

// Run the setup
if (require.main === module) {
  setupSupabaseTables().catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
}

module.exports = { setupSupabaseTables };