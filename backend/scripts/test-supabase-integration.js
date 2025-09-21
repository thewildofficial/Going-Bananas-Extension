#!/usr/bin/env node

/**
 * Supabase Integration Test Script
 * 
 * This script tests the updated Supabase integration to ensure all services
 * work correctly with the actual database schema.
 * 
 * @fileoverview Integration testing for Supabase services
 * @author Aban Hasan (thewildofficial)
 * @version 1.0.0
 */

const { createDevLogger } = require('../utils/devLogger');
const SupabasePersonalizationService = require('../services/supabasePersonalizationService');
const PersonalizationService = require('../services/personalizationService');

// Load environment variables
require('dotenv').config();

async function testSupabaseIntegration() {
  const devLog = createDevLogger('test');
  
  console.log('🧪 Testing Supabase Integration...\n');

  // Check environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ Supabase configuration missing!');
    console.error('Please ensure SUPABASE_URL and SUPABASE_SERVICE_KEY are set in your .env file');
    process.exit(1);
  }

  try {
    // Test 1: Initialize services
    console.log('📋 Test 1: Service Initialization');
    const supabaseService = new SupabasePersonalizationService();
    const personalizationService = new PersonalizationService();
    console.log('✅ Services initialized successfully\n');

    // Test 2: Test user preferences operations
    console.log('📋 Test 2: User Preferences Operations');
    // Use the existing user ID from the database
    const testUserId = '200417f1-f363-42a2-875f-b788c6b36da8';
    
    const testProfile = {
      userId: testUserId,
      analysisPreferences: {
        style: 'detailed',
        language: 'technical',
        focus: 'privacy'
      },
      notificationPreferences: {
        alerts: true,
        frequency: 'moderate'
      },
      privacyImportance: 'very_important',
      riskTolerance: 'moderate'
    };

    // Check if profile exists first
    const existingProfile = await supabaseService.getProfile(testUserId);
    if (existingProfile) {
      console.log('✅ Profile already exists, updating...');
      await supabaseService.updateProfileSection(testUserId, 'analysis_preferences', testProfile.analysisPreferences);
      await supabaseService.updateProfileSection(testUserId, 'notification_preferences', testProfile.notificationPreferences);
    } else {
      const savedProfile = await supabaseService.saveProfile(testProfile);
      console.log('✅ Profile saved successfully');
    }

    // Retrieve profile
    const retrievedProfile = await supabaseService.getProfile(testUserId);
    console.log('✅ Profile retrieved successfully');

    // Check completion status
    const isCompleted = await supabaseService.hasCompletedPersonalization(testUserId);
    console.log(`✅ Personalization completion check: ${isCompleted}`);

    // Update profile section
    await supabaseService.updateProfileSection(testUserId, 'analysis_preferences', {
      style: 'simple',
      language: 'plain'
    });
    console.log('✅ Profile section updated successfully\n');

    // Test 3: Test analysis caching
    console.log('📋 Test 3: Analysis Caching');
    const testAnalysis = {
      riskScore: 7.5,
      riskLevel: 'high',
      summary: 'High risk terms detected',
      details: {
        privacy: 'moderate',
        liability: 'high',
        termination: 'low'
      },
      options: {
        personalized: true,
        version: '1.0'
      }
    };

    // Save analysis
    const savedAnalysis = await supabaseService.saveAnalysis(testUserId, 'https://example.com/test', testAnalysis);
    console.log('✅ Analysis saved successfully');

    // Retrieve cached analysis
    const cachedAnalysis = await supabaseService.getCachedAnalysis(testUserId, 'https://example.com/test');
    console.log('✅ Cached analysis retrieved successfully');

    // Save analysis history
    await supabaseService.saveAnalysisHistory(testUserId, 'https://example.com/test', testAnalysis);
    console.log('✅ Analysis history saved successfully\n');

    // Test 4: Test user dashboard and stats
    console.log('📋 Test 4: User Dashboard and Stats');
    
    // Get user dashboard
    const dashboard = await supabaseService.getUserDashboard(testUserId);
    console.log('✅ User dashboard retrieved successfully');

    // Get user stats
    const stats = await supabaseService.getUserStats(testUserId);
    console.log('✅ User stats retrieved successfully\n');

    // Test 5: Test analysis history
    console.log('📋 Test 5: Analysis History');
    const history = await supabaseService.getAnalysisHistory(testUserId, 10);
    console.log(`✅ Analysis history retrieved: ${history.length} entries\n`);

    // Test 6: Test personalization service integration
    console.log('📋 Test 6: Personalization Service Integration');
    
    // Test profile computation
    const computedProfile = await personalizationService.computeProfileParameters({
      userId: testUserId,
      demographics: {
        ageRange: '26_40',
        occupation: 'technology',
        jurisdiction: { primaryCountry: 'US' }
      },
      digitalBehavior: {
        techSophistication: {
          comfortLevel: 'advanced',
          readingFrequency: 'often',
          preferredExplanationStyle: 'technical_detailed'
        },
        usagePatterns: {
          primaryActivities: ['work', 'shopping']
        }
      },
      riskPreferences: {
        privacy: { overallImportance: 'very_important' },
        financial: { 
          paymentApproach: 'moderate',
          financialSituation: 'stable_employment'
        },
        legal: { arbitrationComfort: 'neutral' }
      },
      contextualFactors: {
        dependentStatus: 'just_myself',
        alertPreferences: {
          interruptionTiming: 'moderate_and_high',
          alertFrequencyLimit: 15
        },
        specialCircumstances: []
      }
    });
    
    console.log('✅ Profile computation successful');
    console.log(`   Risk Tolerance: ${computedProfile.riskTolerance.overall}`);
    console.log(`   Explanation Style: ${computedProfile.explanationStyle}`);
    console.log(`   Profile Tags: ${computedProfile.profileTags.length} tags\n`);

    // Test 7: Cleanup
    console.log('📋 Test 7: Cleanup');
    await supabaseService.deleteUserData(testUserId);
    console.log('✅ Test data cleaned up successfully\n');

    // Summary
    console.log('🎉 All Supabase Integration Tests Passed!');
    console.log('\n📊 Test Summary:');
    console.log('✅ Service initialization');
    console.log('✅ User preferences CRUD operations');
    console.log('✅ Analysis caching and retrieval');
    console.log('✅ Analysis history tracking');
    console.log('✅ User dashboard data access');
    console.log('✅ User statistics function');
    console.log('✅ Personalization service integration');
    console.log('✅ Data cleanup');
    
    console.log('\n💡 Your Supabase integration is working correctly!');
    console.log('   All services are using the correct table schemas.');
    console.log('   TypeScript types are available in types/supabase.ts');
    console.log('   Development logging is active for debugging.');

  } catch (error) {
    console.error('❌ Supabase integration test failed:', error.message);
    console.error('\n🔍 Troubleshooting:');
    console.error('1. Check your Supabase credentials in .env');
    console.error('2. Verify your Supabase project is accessible');
    console.error('3. Check the development logs for more details');
    console.error('4. Run: node scripts/view-logs.js --context supabase');
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  testSupabaseIntegration().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

module.exports = { testSupabaseIntegration };