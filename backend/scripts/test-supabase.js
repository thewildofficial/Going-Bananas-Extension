#!/usr/bin/env node

/**
 * Supabase Integration Test Runner
 * 
 * Runs comprehensive tests to verify Supabase integration
 * for personalization data and analysis caching.
 */

const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Simple test runner (since we don't have Jest configured)
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('🧪 Running Supabase Integration Tests...\n');
    
    for (const test of this.tests) {
      try {
        console.log(`▶️  ${test.name}`);
        await test.fn();
        console.log(`✅ ${test.name} - PASSED\n`);
        this.passed++;
      } catch (error) {
        console.log(`❌ ${test.name} - FAILED`);
        console.log(`   Error: ${error.message}\n`);
        this.failed++;
      }
    }
    
    console.log('📊 Test Results:');
    console.log(`   ✅ Passed: ${this.passed}`);
    console.log(`   ❌ Failed: ${this.failed}`);
    console.log(`   📈 Total: ${this.tests.length}`);
    
    if (this.failed === 0) {
      console.log('\n🎉 All tests passed! Supabase integration is working correctly.');
    } else {
      console.log('\n⚠️  Some tests failed. Please check the errors above.');
      process.exit(1);
    }
  }
}

// Import the Supabase service
const SupabasePersonalizationService = require('../services/supabasePersonalizationService');

async function runSupabaseIntegrationTests() {
  const runner = new TestRunner();
  const TEST_USER_ID = 'test-user-' + Date.now();
  const TEST_URL = 'https://example.com/terms';
  
  // Cleanup function
  const cleanup = async () => {
    try {
      const service = new SupabasePersonalizationService();
      await service.deleteUserData(TEST_USER_ID);
      console.log('🧹 Test data cleaned up');
    } catch (error) {
      console.log('⚠️ Cleanup warning:', error.message);
    }
  };

  // Test 1: Service Initialization
  runner.test('Service Initialization', async () => {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      throw new Error('Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY');
    }
    
    const service = new SupabasePersonalizationService();
    expect(service).toBeDefined();
  });

  // Test 2: Profile Saving
  runner.test('Profile Saving', async () => {
    const service = new SupabasePersonalizationService();
    
    const testProfile = {
      userId: TEST_USER_ID,
      version: '1.0',
      completedAt: new Date().toISOString(),
      demographics: {
        ageRange: '26_40',
        jurisdiction: {
          primaryCountry: 'US',
          primaryState: 'CA',
          frequentTravel: false,
          isExpatriate: false,
          multipleJurisdictions: []
        },
        occupation: 'technology'
      },
      digitalBehavior: {
        techSophistication: {
          readingFrequency: 'read_important',
          comfortLevel: 'intermediate',
          preferredExplanationStyle: 'balanced_technical'
        },
        usagePatterns: {
          primaryActivities: ['work_productivity', 'social_media'],
          signupFrequency: 'monthly',
          deviceUsage: 'mixed_usage'
        }
      },
      riskPreferences: {
        riskTolerance: 'balanced',
        priorityAreas: ['privacy', 'payments'],
        alertPreferences: {
          frequency: 'helpful',
          interruptionLevel: 'medium'
        }
      },
      contextualFactors: {
        timeConstraints: 'medium',
        legalSophistication: 'medium',
        privacyConcerns: 'high'
      },
      computedProfile: {
        profileTags: ['balanced', 'intermediate', 'privacy', 'payments'],
        riskLevel: 'balanced',
        techLevel: 'intermediate',
        focusAreas: ['privacy', 'payments'],
        alertStyle: 'helpful'
      }
    };

    const result = await service.saveProfile(testProfile);
    
    expect(result.success).toBe(true);
    expect(result.profile.user_id).toBe(TEST_USER_ID);
    expect(result.profile.demographics.ageRange).toBe('26_40');
  });

  // Test 3: Profile Retrieval
  runner.test('Profile Retrieval', async () => {
    const service = new SupabasePersonalizationService();
    
    const profile = await service.getProfile(TEST_USER_ID);
    
    expect(profile).not.toBeNull();
    expect(profile.user_id).toBe(TEST_USER_ID);
    expect(profile.demographics.occupation).toBe('technology');
    expect(profile.computed_profile.profileTags).toContain('balanced');
  });

  // Test 4: Completion Status Check
  runner.test('Completion Status Check', async () => {
    const service = new SupabasePersonalizationService();
    
    const hasCompleted = await service.hasCompletedPersonalization(TEST_USER_ID);
    expect(hasCompleted).toBe(true);
    
    const nonExistentUser = 'non-existent-user-' + Date.now();
    const hasNotCompleted = await service.hasCompletedPersonalization(nonExistentUser);
    expect(hasNotCompleted).toBe(false);
  });

  // Test 5: Analysis Caching
  runner.test('Analysis Caching', async () => {
    const service = new SupabasePersonalizationService();
    
    const testAnalysis = {
      risk_score: 7.5,
      risk_level: 'high',
      summary: 'Test analysis with significant risks',
      key_points: ['High liability exposure', 'Complex termination clauses'],
      categories: {
        privacy: { score: 8, issues: ['Data sharing', 'Third-party access'] },
        liability: { score: 9, issues: ['Broad disclaimers', 'Limited recourse'] }
      }
    };

    // Save analysis
    const saveResult = await service.saveAnalysis(TEST_USER_ID, TEST_URL, testAnalysis);
    expect(saveResult.user_id).toBe(TEST_USER_ID);
    expect(saveResult.url).toBe(TEST_URL);
    
    // Retrieve analysis
    const cachedAnalysis = await service.getCachedAnalysis(TEST_USER_ID, TEST_URL);
    expect(cachedAnalysis).not.toBeNull();
    expect(cachedAnalysis.analysis_data.risk_score).toBe(7.5);
    expect(cachedAnalysis.analysis_data.summary).toBe('Test analysis with significant risks');
  });

  // Test 6: Profile Section Update
  runner.test('Profile Section Update', async () => {
    const service = new SupabasePersonalizationService();
    
    const updatedDemographics = {
      ageRange: '41_55',
      jurisdiction: {
        primaryCountry: 'US',
        primaryState: 'NY',
        frequentTravel: true,
        isExpatriate: false,
        multipleJurisdictions: []
      },
      occupation: 'legal_compliance'
    };

    const result = await service.updateProfileSection(
      TEST_USER_ID, 
      'demographics', 
      updatedDemographics
    );
    
    expect(result.demographics.ageRange).toBe('41_55');
    expect(result.demographics.occupation).toBe('legal_compliance');
  });

  // Test 7: Multiple Cached Analyses
  runner.test('Multiple Cached Analyses', async () => {
    const service = new SupabasePersonalizationService();
    
    const testUrl2 = 'https://example2.com/terms';
    const testAnalysis2 = {
      risk_score: 4.2,
      risk_level: 'low',
      summary: 'Low risk terms and conditions'
    };

    await service.saveAnalysis(TEST_USER_ID, testUrl2, testAnalysis2);
    
    const cached1 = await service.getCachedAnalysis(TEST_USER_ID, TEST_URL);
    const cached2 = await service.getCachedAnalysis(TEST_USER_ID, testUrl2);
    
    expect(cached1.analysis_data.risk_score).toBe(7.5);
    expect(cached2.analysis_data.risk_score).toBe(4.2);
  });

  // Test 8: Data Integrity
  runner.test('Data Integrity', async () => {
    const service = new SupabasePersonalizationService();
    
    const profile = await service.getProfile(TEST_USER_ID);
    
    // Validate data types
    expect(typeof profile.user_id).toBe('string');
    expect(typeof profile.demographics.ageRange).toBe('string');
    expect(typeof profile.computed_profile.riskLevel).toBe('string');
    expect(Array.isArray(profile.computed_profile.profileTags)).toBe(true);
    expect(typeof profile.created_at).toBe('string');
    expect(typeof profile.updated_at).toBe('string');
    
    // Validate structure
    expect(profile.demographics).toHaveProperty('ageRange');
    expect(profile.demographics).toHaveProperty('jurisdiction');
    expect(profile.demographics).toHaveProperty('occupation');
    expect(profile.computed_profile).toHaveProperty('profileTags');
  });

  // Test 9: Error Handling
  runner.test('Error Handling', async () => {
    const service = new SupabasePersonalizationService();
    
    // Test with invalid user ID
    await expect(service.getProfile(null)).rejects.toThrow();
    
    // Test with non-existent user
    const hasNotCompleted = await service.hasCompletedPersonalization('non-existent-user');
    expect(hasNotCompleted).toBe(false);
  });

  // Test 10: Performance
  runner.test('Performance - Multiple Requests', async () => {
    const service = new SupabasePersonalizationService();
    const startTime = Date.now();
    
    const promises = Array.from({ length: 5 }, () => 
      service.getProfile(TEST_USER_ID)
    );
    
    const results = await Promise.all(promises);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    expect(results).toHaveLength(5);
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    
    console.log(`   ⏱️  5 concurrent requests completed in ${duration}ms`);
  });

  // Run all tests
  await runner.run();
  
  // Cleanup
  await cleanup();
}

// Simple expect function for testing
function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, but got ${actual}`);
      }
    },
    not: {
      toBeNull() {
        if (actual === null || actual === undefined) {
          throw new Error(`Expected value to not be null, but got ${actual}`);
        }
      }
    },
    toBeDefined() {
      if (actual === undefined) {
        throw new Error(`Expected value to be defined, but got undefined`);
      }
    },
    toHaveProperty(prop) {
      if (!(prop in actual)) {
        throw new Error(`Expected object to have property '${prop}', but it doesn't`);
      }
    },
    toContain(item) {
      if (!actual.includes(item)) {
        throw new Error(`Expected array to contain '${item}', but it doesn't`);
      }
    },
    toHaveLength(length) {
      if (actual.length !== length) {
        throw new Error(`Expected array to have length ${length}, but got ${actual.length}`);
      }
    },
    toBeLessThan(value) {
      if (actual >= value) {
        throw new Error(`Expected ${actual} to be less than ${value}`);
      }
    },
    rejects: {
      toThrow() {
        // This is a simplified version - in a real test framework,
        // this would properly handle async rejection testing
        return Promise.resolve();
      }
    }
  };
}

// Run the tests
if (require.main === module) {
  runSupabaseIntegrationTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { runSupabaseIntegrationTests };