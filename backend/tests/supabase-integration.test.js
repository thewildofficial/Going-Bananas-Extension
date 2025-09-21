/**
 * Supabase Integration Tests for Going Bananas Extension
 * 
 * Tests the complete Supabase integration for personalization data,
 * analysis caching, and user profile management.
 */

const { createClient } = require('@supabase/supabase-js');
const SupabasePersonalizationService = require('../services/supabasePersonalizationService');
const logger = require('../utils/logger');

// Test configuration
const TEST_USER_ID = 'test-user-' + Date.now();
const TEST_URL = 'https://example.com/terms';
const TEST_ANALYSIS = {
  risk_score: 7.5,
  risk_level: 'high',
  summary: 'Test analysis with significant risks',
  key_points: ['High liability exposure', 'Complex termination clauses'],
  categories: {
    privacy: { score: 8, issues: ['Data sharing', 'Third-party access'] },
    liability: { score: 9, issues: ['Broad disclaimers', 'Limited recourse'] }
  }
};

describe('Supabase Integration Tests', () => {
  let supabaseService;
  let supabaseClient;

  beforeAll(async () => {
    // Initialize Supabase service
    supabaseService = new SupabasePersonalizationService();
    
    // Initialize direct Supabase client for verification
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY');
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('🧪 Supabase Integration Tests Starting...');
    console.log('📊 Test User ID:', TEST_USER_ID);
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await supabaseService.deleteUserData(TEST_USER_ID);
      console.log('🧹 Test data cleaned up');
    } catch (error) {
      console.log('⚠️ Cleanup warning:', error.message);
    }
  });

  describe('Personalization Profile Management', () => {
    test('should save personalization profile to Supabase', async () => {
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

      const result = await supabaseService.saveProfile(testProfile);
      
      expect(result.success).toBe(true);
      expect(result.profile.user_id).toBe(TEST_USER_ID);
      expect(result.profile.demographics).toEqual(testProfile.demographics);
      expect(result.profile.computed_profile).toEqual(testProfile.computedProfile);
      
      console.log('✅ Profile saved successfully');
    });

    test('should retrieve personalization profile from Supabase', async () => {
      const profile = await supabaseService.getProfile(TEST_USER_ID);
      
      expect(profile).not.toBeNull();
      expect(profile.user_id).toBe(TEST_USER_ID);
      expect(profile.demographics.ageRange).toBe('26_40');
      expect(profile.demographics.occupation).toBe('technology');
      expect(profile.computed_profile.profileTags).toContain('balanced');
      
      console.log('✅ Profile retrieved successfully');
    });

    test('should check personalization completion status', async () => {
      const hasCompleted = await supabaseService.hasCompletedPersonalization(TEST_USER_ID);
      
      expect(hasCompleted).toBe(true);
      
      // Test with non-existent user
      const nonExistentUser = 'non-existent-user-' + Date.now();
      const hasNotCompleted = await supabaseService.hasCompletedPersonalization(nonExistentUser);
      
      expect(hasNotCompleted).toBe(false);
      
      console.log('✅ Completion status check working');
    });

    test('should update profile section', async () => {
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

      const result = await supabaseService.updateProfileSection(
        TEST_USER_ID, 
        'demographics', 
        updatedDemographics
      );
      
      expect(result.demographics.ageRange).toBe('41_55');
      expect(result.demographics.occupation).toBe('legal_compliance');
      expect(result.demographics.jurisdiction.primaryState).toBe('NY');
      
      console.log('✅ Profile section updated successfully');
    });
  });

  describe('Analysis Caching', () => {
    test('should save analysis to Supabase cache', async () => {
      const result = await supabaseService.saveAnalysis(TEST_USER_ID, TEST_URL, TEST_ANALYSIS);
      
      expect(result.user_id).toBe(TEST_USER_ID);
      expect(result.url).toBe(TEST_URL);
      expect(result.analysis_data.risk_score).toBe(7.5);
      expect(result.analysis_data.risk_level).toBe('high');
      
      console.log('✅ Analysis cached successfully');
    });

    test('should retrieve cached analysis from Supabase', async () => {
      const cachedAnalysis = await supabaseService.getCachedAnalysis(TEST_USER_ID, TEST_URL);
      
      expect(cachedAnalysis).not.toBeNull();
      expect(cachedAnalysis.user_id).toBe(TEST_USER_ID);
      expect(cachedAnalysis.url).toBe(TEST_URL);
      expect(cachedAnalysis.analysis_data.risk_score).toBe(7.5);
      expect(cachedAnalysis.analysis_data.summary).toBe('Test analysis with significant risks');
      
      console.log('✅ Cached analysis retrieved successfully');
    });

    test('should return null for non-existent cached analysis', async () => {
      const nonExistentUrl = 'https://nonexistent.com/terms';
      const cachedAnalysis = await supabaseService.getCachedAnalysis(TEST_USER_ID, nonExistentUrl);
      
      expect(cachedAnalysis).toBeNull();
      
      console.log('✅ Non-existent analysis handled correctly');
    });

    test('should handle multiple cached analyses', async () => {
      const testUrl2 = 'https://example2.com/terms';
      const testAnalysis2 = {
        ...TEST_ANALYSIS,
        risk_score: 4.2,
        risk_level: 'low',
        summary: 'Low risk terms and conditions'
      };

      await supabaseService.saveAnalysis(TEST_USER_ID, testUrl2, testAnalysis2);
      
      const cached1 = await supabaseService.getCachedAnalysis(TEST_USER_ID, TEST_URL);
      const cached2 = await supabaseService.getCachedAnalysis(TEST_USER_ID, testUrl2);
      
      expect(cached1.analysis_data.risk_score).toBe(7.5);
      expect(cached2.analysis_data.risk_score).toBe(4.2);
      
      console.log('✅ Multiple cached analyses working');
    });
  });

  describe('Data Integrity and Security', () => {
    test('should handle concurrent profile updates', async () => {
      const update1 = supabaseService.updateProfileSection(TEST_USER_ID, 'riskPreferences', {
        riskTolerance: 'conservative',
        priorityAreas: ['privacy', 'liability']
      });
      
      const update2 = supabaseService.updateProfileSection(TEST_USER_ID, 'contextualFactors', {
        timeConstraints: 'high',
        legalSophistication: 'high'
      });
      
      const [result1, result2] = await Promise.all([update1, update2]);
      
      expect(result1.risk_preferences.riskTolerance).toBe('conservative');
      expect(result2.contextual_factors.timeConstraints).toBe('high');
      
      console.log('✅ Concurrent updates handled correctly');
    });

    test('should validate data types and structure', async () => {
      const profile = await supabaseService.getProfile(TEST_USER_ID);
      
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
      
      console.log('✅ Data validation passed');
    });

    test('should handle large analysis data', async () => {
      const largeAnalysis = {
        ...TEST_ANALYSIS,
        detailed_analysis: {
          privacy_policy: {
            data_collection: 'Extensive data collection including personal information, browsing history, and device information',
            data_sharing: 'Data shared with third parties including advertisers, analytics providers, and business partners',
            data_retention: 'Data retained indefinitely with no clear deletion policy',
            user_rights: 'Limited user rights with complex opt-out procedures'
          },
          terms_of_service: {
            liability_limitations: 'Broad liability limitations with significant exclusions',
            dispute_resolution: 'Mandatory arbitration with class action waiver',
            termination_rights: 'Company can terminate accounts without notice',
            user_obligations: 'Extensive user obligations with potential penalties'
          }
        },
        recommendations: [
          'Consider data minimization practices',
          'Review third-party data sharing agreements',
          'Implement clear data deletion policies',
          'Provide user-friendly privacy controls'
        ]
      };

      const result = await supabaseService.saveAnalysis(TEST_USER_ID, 'https://large-test.com/terms', largeAnalysis);
      
      expect(result.analysis_data.detailed_analysis).toBeDefined();
      expect(result.analysis_data.recommendations).toHaveLength(4);
      
      console.log('✅ Large analysis data handled correctly');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid user ID gracefully', async () => {
      const invalidUserId = null;
      
      await expect(supabaseService.getProfile(invalidUserId)).rejects.toThrow();
      await expect(supabaseService.hasCompletedPersonalization(invalidUserId)).resolves.toBe(false);
      
      console.log('✅ Invalid user ID handled gracefully');
    });

    test('should handle malformed data gracefully', async () => {
      const malformedProfile = {
        userId: TEST_USER_ID,
        // Missing required fields
        demographics: null,
        digitalBehavior: undefined
      };
      
      await expect(supabaseService.saveProfile(malformedProfile)).rejects.toThrow();
      
      console.log('✅ Malformed data handled gracefully');
    });

    test('should handle network errors gracefully', async () => {
      // This test would require mocking network failures
      // For now, we'll test that the service handles missing config
      const originalUrl = process.env.SUPABASE_URL;
      delete process.env.SUPABASE_URL;
      
      expect(() => new SupabasePersonalizationService()).toThrow('Supabase configuration is required');
      
      process.env.SUPABASE_URL = originalUrl;
      
      console.log('✅ Configuration errors handled gracefully');
    });
  });

  describe('Performance Tests', () => {
    test('should handle multiple rapid requests', async () => {
      const startTime = Date.now();
      
      const promises = Array.from({ length: 10 }, (_, i) => 
        supabaseService.getProfile(TEST_USER_ID)
      );
      
      const results = await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(results).toHaveLength(10);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      
      console.log(`✅ 10 concurrent requests completed in ${duration}ms`);
    });

    test('should handle large batch operations', async () => {
      const startTime = Date.now();
      
      const batchPromises = Array.from({ length: 5 }, (_, i) => 
        supabaseService.saveAnalysis(
          TEST_USER_ID, 
          `https://batch-test-${i}.com/terms`, 
          { ...TEST_ANALYSIS, batch_id: i }
        )
      );
      
      const results = await Promise.all(batchPromises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(results).toHaveLength(5);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      
      console.log(`✅ Batch operation completed in ${duration}ms`);
    });
  });
});

// Helper function to run tests
async function runSupabaseTests() {
  console.log('🚀 Starting Supabase Integration Tests...');
  
  try {
    // Check if Supabase is configured
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      console.log('❌ Supabase not configured. Please set environment variables:');
      console.log('   SUPABASE_URL=your_supabase_url');
      console.log('   SUPABASE_SERVICE_KEY=your_service_key');
      return;
    }
    
    console.log('✅ Supabase configuration found');
    console.log('🔗 URL:', process.env.SUPABASE_URL);
    console.log('🔑 Service Key:', process.env.SUPABASE_SERVICE_KEY.substring(0, 20) + '...');
    
    // Run the tests
    await runTests();
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  }
}

// Export for use in other test files
module.exports = {
  runSupabaseTests,
  TEST_USER_ID,
  TEST_URL,
  TEST_ANALYSIS
};