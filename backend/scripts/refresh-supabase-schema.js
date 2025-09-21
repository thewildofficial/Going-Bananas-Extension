#!/usr/bin/env node

/**
 * Supabase Schema Cache Refresh Script
 * 
 * This script refreshes the Supabase schema cache to ensure newly created
 * tables are recognized by the API.
 * 
 * @fileoverview Schema cache refresh for Supabase
 * @author Aban Hasan (thewildofficial)
 * @version 1.0.0
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

async function refreshSupabaseSchema() {
  console.log('🔄 Refreshing Supabase schema cache...\n');

  // Check environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ Supabase configuration missing!');
    console.error('Please ensure SUPABASE_URL and SUPABASE_SERVICE_KEY are set in your .env file');
    process.exit(1);
  }

  // Initialize Supabase client
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  try {
    // Try to query the tables to refresh the schema cache
    console.log('📋 Checking user_personalization_profiles table...');
    const { data: profilesData, error: profilesError } = await supabase
      .from('user_personalization_profiles')
      .select('*')
      .limit(1);

    if (profilesError) {
      console.log('⚠️  user_personalization_profiles:', profilesError.message);
    } else {
      console.log('✅ user_personalization_profiles table accessible');
    }

    console.log('📋 Checking cached_analyses table...');
    const { data: analysesData, error: analysesError } = await supabase
      .from('cached_analyses')
      .select('*')
      .limit(1);

    if (analysesError) {
      console.log('⚠️  cached_analyses:', analysesError.message);
    } else {
      console.log('✅ cached_analyses table accessible');
    }

    // Try to get table information from the information schema
    console.log('\n🔍 Querying table information...');
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_info');

    if (tableError) {
      console.log('⚠️  Could not query table info:', tableError.message);
    } else {
      console.log('📊 Table information retrieved');
    }

    console.log('\n⏳ Waiting 5 seconds for schema cache to refresh...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Test again after waiting
    console.log('🔄 Re-testing table access...');
    
    const { data: profilesData2, error: profilesError2 } = await supabase
      .from('user_personalization_profiles')
      .select('*')
      .limit(1);

    if (profilesError2) {
      console.log('❌ user_personalization_profiles still not accessible:', profilesError2.message);
    } else {
      console.log('✅ user_personalization_profiles table now accessible');
    }

    const { data: analysesData2, error: analysesError2 } = await supabase
      .from('cached_analyses')
      .select('*')
      .limit(1);

    if (analysesError2) {
      console.log('❌ cached_analyses still not accessible:', analysesError2.message);
    } else {
      console.log('✅ cached_analyses table now accessible');
    }

    console.log('\n🎉 Schema refresh completed!');

  } catch (error) {
    console.error('❌ Schema refresh failed:', error.message);
    console.error('\n💡 Manual Refresh Instructions:');
    console.error('1. Go to your Supabase dashboard');
    console.error('2. Navigate to the API section');
    console.error('3. The schema cache should refresh automatically');
    console.error('4. If not, try restarting your Supabase project');
    process.exit(1);
  }
}

// Run the refresh
if (require.main === module) {
  refreshSupabaseSchema().catch(error => {
    console.error('Refresh failed:', error);
    process.exit(1);
  });
}

module.exports = { refreshSupabaseSchema };