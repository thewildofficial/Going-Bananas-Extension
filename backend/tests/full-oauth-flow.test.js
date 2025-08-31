/**
 * FULL OAUTH FLOW TEST
 *
 * Tests complete Firebase OAuth → MongoDB → AI Personalization flow
 * This script demonstrates how the entire authentication and personalization system works
 *
 * @author Aban Hasan (thewildofficial)
 * @version 1.0.0
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.PORT ? `http://localhost:${process.env.PORT}` : 'http://localhost:3001';

// Mock Firebase ID Token (for testing without real Google OAuth)
const MOCK_FIREBASE_TOKEN = 'eyJhbGciOiJSUzI1NiIsImtpZCI6ImI0ODM4Y2VkNjcwMWJhZGMzNzFkNzA3ZjgwNzM5ZDU4NzEwZmY3ZjYiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vZ29pbmctYmFuYW5hcy10ZXN0IiwiYXVkIjoiZ29pbmctYmFuYW5hcy10ZXN0IiwiYXV0aF90aW1lIjoxNzM1NzY4MDAwLCJ1c2VyX2lkIjoidGVzdC11c2VyLTEyMzQ1Njc4OTAiLCJzdWIiOiJ0ZXN0LXVzZXItMTIzNDU2Nzg5MCIsImlhdCI6MTczNTc2ODAwMCwiZXhwIjoxNzM1NzcxNjAwLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZmlyZWJhc2UiOnsiZXNzZW50aWFscyI6eyJzaWduX2luX3Byb3ZpZGVyIjoiZ29vZ2xlLmNvbSJ9fX0.mock_signature';

// Mock user data simulating what would come from Google OAuth
const MOCK_GOOGLE_USER = {
  uid: 'test-user-1234567890',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: 'https://lh3.googleusercontent.com/photo.jpg',
  emailVerified: true,
  provider: 'google'
};

class FullOAuthFlowTest {
  constructor() {
    this.testResults = {
      auth: false,
      profile: false,
      personalization: false,
      analysis: false
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : '🔄';
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async runTest() {
    console.log('\n🚀 FULL OAUTH FLOW TEST STARTING...\n');
    console.log('='.repeat(60));
    console.log('Testing: Firebase OAuth → MongoDB → AI Personalization');
    console.log('='.repeat(60));

    try {
      // Step 1: Test system health
      await this.testSystemHealth();

      // Step 2: Test Firebase authentication
      await this.testFirebaseAuth();

      // Step 3: Create user profile in MongoDB
      await this.testProfileCreation();

      // Step 4: Test personalization system
      await this.testPersonalization();

      // Step 5: Test personalized AI analysis
      await this.testPersonalizedAnalysis();

      // Step 6: Test user info retrieval
      await this.testUserInfoRetrieval();

      // Summary
      this.printSummary();

    } catch (error) {
      this.log(`Test failed: ${error.message}`, 'error');
      console.error(error);
    }
  }

  async testSystemHealth() {
    this.log('Step 1: Testing system health...');

    try {
      const response = await axios.get(`${BASE_URL}/api/health`);
      const health = response.data.health;

      this.log(`System status: ${health.status}`);
      this.log(`Environment: ${health.environment}`);
      this.log(`Database: ${health.checks.mongodb ? 'Connected' : 'Disconnected'}`);
      this.log(`Firebase: ${health.checks.firebase ? 'Initialized' : 'Not initialized'}`);
      this.log(`AI Service: ${health.checks.gemini ? 'Ready' : 'Not ready'}`);

      if (health.status !== 'healthy') {
        throw new Error('System health check failed');
      }

      this.log('System health check passed!', 'success');
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  }

  async testFirebaseAuth() {
    this.log('Step 2: Testing Firebase authentication...');

    try {
      // Test token verification
      const response = await axios.post(`${BASE_URL}/api/auth/verify`, {
        idToken: MOCK_FIREBASE_TOKEN
      });

      const user = response.data.user;
      this.log(`Token verified for user: ${user.email}`);
      this.log(`Firebase UID: ${user.firebaseUid}`);
      this.log(`MongoDB User ID: ${user.mongoUserId}`);

      // Store user IDs for next steps
      this.firebaseUid = user.firebaseUid;
      this.mongoUserId = user.mongoUserId;

      this.testResults.auth = true;
      this.log('Firebase authentication test passed!', 'success');
    } catch (error) {
      throw new Error(`Firebase auth failed: ${error.response?.data?.error || error.message}`);
    }
  }

  async testProfileCreation() {
    this.log('Step 3: Creating personalized user profile...');

    try {
      // Create comprehensive user profile
      const profileData = {
        userId: this.mongoUserId,
        version: '1.0',
        completedAt: new Date().toISOString(),

        // Demographics (from survey)
        demographics: {
          ageRange: '26_40',
          jurisdiction: {
            primaryCountry: 'US',
            primaryState: 'CA',
            frequentTravel: true,
            isExpatriate: false,
            multipleJurisdictions: []
          },
          occupation: 'technology'
        },

        // Digital behavior preferences
        digitalBehavior: {
          techSophistication: {
            readingFrequency: 'read_most',
            comfortLevel: 'advanced',
            preferredExplanationStyle: 'technical_detailed'
          },
          usagePatterns: {
            primaryActivities: ['work_productivity', 'research', 'online_shopping'],
            signupFrequency: 'weekly',
            deviceUsage: 'desktop_heavy'
          }
        },

        // Risk preferences (detailed survey responses)
        riskPreferences: {
          privacy: {
            overallImportance: 'very_important',
            sensitiveDataTypes: [
              { dataType: 'financial_information', priorityLevel: 1 },
              { dataType: 'health_data', priorityLevel: 1 },
              { dataType: 'location_data', priorityLevel: 2 },
              { dataType: 'communication_data', priorityLevel: 3 }
            ],
            dataProcessingComfort: {
              domesticProcessing: 'comfortable',
              internationalTransfers: 'uncomfortable',
              thirdPartySharing: 'very_uncomfortable',
              aiProcessing: 'cautious',
              longTermStorage: 'uncomfortable'
            }
          },
          financial: {
            paymentApproach: 'very_cautious',
            feeImpact: 'very_sensitive',
            financialSituation: 'high_income',
            subscriptionTolerance: {
              autoRenewal: 'very_uncomfortable',
              freeTrialToSubscription: 'cautious',
              priceChanges: 'immediate_notification'
            }
          },
          legal: {
            arbitrationComfort: 'strongly_prefer_courts',
            liabilityTolerance: 'strict_limitations',
            legalKnowledge: {
              contractLaw: 'expert',
              privacyLaw: 'advanced',
              consumerRights: 'advanced'
            },
            previousIssues: 'multiple_issues'
          }
        },

        // Contextual factors
        contextualFactors: {
          dependentStatus: 'family_household',
          specialCircumstances: [
            'handles_sensitive_business_data',
            'privacy_advocate',
            'frequent_international_travel'
          ],
          decisionMakingPriorities: [
            { factor: 'privacy_protection', priority: 1 },
            { factor: 'security_safety', priority: 2 },
            { factor: 'data_rights', priority: 3 },
            { factor: 'cost_value', priority: 4 },
            { factor: 'terms_fairness', priority: 5 },
            { factor: 'reputation_reviews', priority: 6 },
            { factor: 'customer_support', priority: 7 },
            { factor: 'compliance_legal', priority: 8 },
            { factor: 'ease_of_use', priority: 9 }
          ],
          alertPreferences: {
            interruptionTiming: 'high_risk_only',
            educationalContent: 'always_include',
            alertFrequencyLimit: 5,
            learningMode: true
          }
        },

        lastUpdated: new Date().toISOString()
      };

      // Save profile to MongoDB
      const response = await axios.post(`${BASE_URL}/api/personalization/profile`, profileData);

      const profile = response.data.profile;
      this.log(`Profile created for user: ${profile.userId}`);
      this.log(`Risk Tolerance - Privacy: ${profile.computedProfile.riskTolerance.privacy}`);
      this.log(`Risk Tolerance - Financial: ${profile.computedProfile.riskTolerance.financial}`);
      this.log(`Risk Tolerance - Legal: ${profile.computedProfile.riskTolerance.legal}`);
      this.log(`Overall Risk Tolerance: ${profile.computedProfile.riskTolerance.overall}`);
      this.log(`Profile Tags: ${profile.computedProfile.profileTags.join(', ')}`);

      this.testResults.profile = true;
      this.log('Profile creation test passed!', 'success');
    } catch (error) {
      throw new Error(`Profile creation failed: ${error.response?.data?.error || error.message}`);
    }
  }

  async testPersonalization() {
    this.log('Step 4: Testing personalization system...');

    try {
      // Retrieve the profile we just created
      const response = await axios.get(`${BASE_URL}/api/personalization/profile/${this.mongoUserId}`);

      const profile = response.data.profile;
      this.log(`Retrieved profile for: ${profile.userId}`);
      this.log(`Profile version: ${profile.version}`);
      this.log(`Last updated: ${profile.lastUpdated}`);

      // Test profile update
      const updateData = {
        contextualFactors: {
          ...profile.contextualFactors,
          alertPreferences: {
            ...profile.contextualFactors.alertPreferences,
            alertFrequencyLimit: 8
          }
        }
      };

      await axios.patch(`${BASE_URL}/api/personalization/profile/${this.mongoUserId}`, updateData);
      this.log('Profile updated successfully');

      this.testResults.personalization = true;
      this.log('Personalization system test passed!', 'success');
    } catch (error) {
      throw new Error(`Personalization test failed: ${error.response?.data?.error || error.message}`);
    }
  }

  async testPersonalizedAnalysis() {
    this.log('Step 5: Testing personalized AI analysis...');

    try {
      // Test analysis with personalization
      const analysisData = {
        text: `This service collects personal information including name, email, location data, browsing history, and payment information. The terms allow unlimited data sharing with third parties, automatic subscription renewal with price increases, and arbitration clauses that limit your legal rights. Users have no right to data deletion or portability.`,
        userId: this.mongoUserId,
        options: {
          detail_level: 'comprehensive',
          multiPass: true,
          contextAware: true,
          categories: ['privacy', 'liability', 'termination', 'payment']
        }
      };

      const response = await axios.post(`${BASE_URL}/api/analyze`, analysisData);

      const analysis = response.data.analysis;
      this.log(`Analysis completed for user: ${this.mongoUserId}`);
      this.log(`Risk Score: ${analysis.risk_score}/10`);
      this.log(`Risk Level: ${analysis.risk_level}`);
      this.log(`Multi-pass Analysis: ${analysis.multi_pass_analysis ? 'Enabled' : 'Disabled'}`);
      this.log(`Personalization Applied: ${analysis.personalization_applied ? 'Yes' : 'No'}`);

      if (analysis.major_clauses) {
        this.log(`Major Clauses Identified: ${analysis.major_clauses.clauses.length}`);
        analysis.major_clauses.clauses.forEach((clause, index) => {
          this.log(`  ${index + 1}. ${clause.title} (${clause.importance} risk)`);
        });
      }

      this.testResults.analysis = true;
      this.log('Personalized analysis test passed!', 'success');
    } catch (error) {
      throw new Error(`Analysis test failed: ${error.response?.data?.error || error.message}`);
    }
  }

  async testUserInfoRetrieval() {
    this.log('Step 6: Testing user information retrieval...');

    try {
      // Test authenticated user endpoint
      const response = await axios.post(`${BASE_URL}/api/auth/link-profile`, {
        idToken: MOCK_FIREBASE_TOKEN,
        profileData: {} // Empty since we already created the profile
      });

      const userData = response.data;
      this.log(`User linked successfully: ${userData.user.email}`);
      this.log(`Profile exists: ${userData.user.profileComplete ? 'Yes' : 'No'}`);

      if (userData.user.profileComplete) {
        this.log(`Risk Tolerance: Privacy ${userData.profile.riskTolerance.privacy}, Financial ${userData.profile.riskTolerance.financial}`);
      }

      this.log('User information retrieval test passed!', 'success');
    } catch (error) {
      throw new Error(`User info retrieval failed: ${error.response?.data?.error || error.message}`);
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 TEST SUMMARY');
    console.log('='.repeat(60));

    const tests = [
      { name: 'Firebase Authentication', status: this.testResults.auth },
      { name: 'MongoDB Profile Creation', status: this.testResults.profile },
      { name: 'Personalization System', status: this.testResults.personalization },
      { name: 'AI Analysis with Personalization', status: this.testResults.analysis }
    ];

    tests.forEach(test => {
      const icon = test.status ? '✅' : '❌';
      const status = test.status ? 'PASSED' : 'FAILED';
      console.log(`${icon} ${test.name}: ${status}`);
    });

    const passedTests = Object.values(this.testResults).filter(Boolean).length;
    const totalTests = Object.keys(this.testResults).length;

    console.log('\n📊 RESULTS:');
    console.log(`   Passed: ${passedTests}/${totalTests} tests`);
    console.log(`   Success Rate: ${((passedTests/totalTests) * 100).toFixed(1)}%`);

    if (passedTests === totalTests) {
      console.log('\n🎉 ALL TESTS PASSED! Your OAuth flow is working perfectly!');
      console.log('\n🚀 READY FOR PRODUCTION:');
      console.log('   • Firebase OAuth authentication ✅');
      console.log('   • MongoDB user profiles ✅');
      console.log('   • AI personalization ✅');
      console.log('   • Complete data flow ✅');
    } else {
      console.log('\n⚠️  Some tests failed. Check the logs above for details.');
    }

    console.log('\n🔗 NEXT STEPS:');
    console.log('   1. Replace mock tokens with real Firebase authentication');
    console.log('   2. Configure your Firebase project with real credentials');
    console.log('   3. Build frontend with Google OAuth integration');
    console.log('   4. Deploy to production environment');

    console.log('\n' + '='.repeat(60));
  }
}

// Export for use in other files
module.exports = { FullOAuthFlowTest };

// Run if called directly
if (require.main === module) {
  const test = new FullOAuthFlowTest();
  test.runTest().catch(console.error);
}

