#!/usr/bin/env node

/**
 * Check Existing User Script
 * 
 * This script checks what users exist in the database to understand
 * the correct user ID format.
 * 
 * @fileoverview Check existing users in Supabase
 * @author Aban Hasan (thewildofficial)
 * @version 1.0.0
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

async function checkExistingUser() {
  console.log('🔍 Checking existing users in Supabase...\n');

  // Check environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ Supabase configuration missing!');
    process.exit(1);
  }

  // Initialize Supabase client
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  try {
    // Get user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(5);

    if (profilesError) {
      console.error('❌ Error fetching user profiles:', profilesError.message);
      return;
    }

    console.log('📋 User Profiles:');
    profiles.forEach(profile => {
      console.log(`  ID: ${profile.id}`);
      console.log(`  Email: ${profile.email}`);
      console.log(`  Display Name: ${profile.display_name}`);
      console.log(`  Provider: ${profile.provider}`);
      console.log('  ---');
    });

    // Get user preferences
    const { data: preferences, error: preferencesError } = await supabase
      .from('user_preferences')
      .select('*')
      .limit(5);

    if (preferencesError) {
      console.log('⚠️  Error fetching user preferences:', preferencesError.message);
    } else {
      console.log('\n📋 User Preferences:');
      preferences.forEach(pref => {
        console.log(`  User ID: ${pref.user_id}`);
        console.log(`  Privacy Importance: ${pref.privacy_importance}`);
        console.log(`  Risk Tolerance: ${pref.risk_tolerance}`);
        console.log('  ---');
      });
    }

    // Get analysis history
    const { data: history, error: historyError } = await supabase
      .from('analysis_history')
      .select('*')
      .limit(5);

    if (historyError) {
      console.log('⚠️  Error fetching analysis history:', historyError.message);
    } else {
      console.log('\n📋 Analysis History:');
      history.forEach(entry => {
        console.log(`  User ID: ${entry.user_id}`);
        console.log(`  URL: ${entry.url}`);
        console.log(`  Risk Score: ${entry.risk_score}`);
        console.log('  ---');
      });
    }

    console.log('\n💡 Use one of the existing user IDs for testing!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the check
if (require.main === module) {
  checkExistingUser().catch(error => {
    console.error('Check failed:', error);
    process.exit(1);
  });
}

module.exports = { checkExistingUser };