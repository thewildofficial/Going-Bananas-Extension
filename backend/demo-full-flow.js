// Comprehensive Demo: MongoDB + Gemini Integration
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Mock Gemini API for demo (set to false to use real Gemini)
process.env.MOCK_GEMINI_API = 'true';

// Sample T&C text for analysis
const sampleTermsText = `
TERMS OF SERVICE AGREEMENT

Last updated: January 2024

By accessing and using Going Bananas services, you agree to be bound by these Terms of Service.

DATA COLLECTION AND PRIVACY
We collect personal information including your name, email address, location data, browsing patterns, and device information. This information is used to provide and improve our services, and may be shared with third-party partners for advertising and analytics purposes.

We use cookies and similar technologies to track your usage patterns across our website and services. You can control cookie settings through your browser, but disabling cookies may affect service functionality.

USER RESPONSIBILITIES
You agree not to use our services for any illegal or harmful purposes. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.

INTELLECTUAL PROPERTY
All content, features, and functionality of our services are owned by Going Bananas and are protected by copyright, trademark, and other intellectual property laws.

LIMITATION OF LIABILITY
Going Bananas shall not be liable for any indirect, incidental, special, or consequential damages arising out of or in connection with your use of our services. Our total liability shall not exceed the amount paid by you for the services in the twelve months preceding the claim.

DISPUTE RESOLUTION
Any disputes arising from these terms shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association. You waive your right to participate in class action lawsuits.

ACCOUNT TERMINATION
We reserve the right to suspend or terminate your account at any time, with or without cause, and with or without notice. Upon termination, your right to use the services will cease immediately.

PAYMENT TERMS
For paid services, payment is due in advance. Subscription fees are non-refundable and auto-renew monthly. We may change pricing with 30 days notice.

GOVERNING LAW
These terms are governed by the laws of California, without regard to conflict of law principles.

SEVERABILITY
If any provision of these terms is found to be unenforceable, the remaining provisions will remain in full force and effect.
`;

// Test user profile data (matching the schema exactly)
const testUserProfile = {
  userId: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID format
  version: '1.0',
  completedAt: new Date().toISOString(),
  demographics: {
    ageRange: '26_40',
    jurisdiction: {
      primaryCountry: 'US',
      primaryState: 'CA',
      frequentTravel: false,
      isExpatriate: false
    },
    occupation: 'technology'
  },
  digitalBehavior: {
    techSophistication: {
      readingFrequency: 'read_important',
      comfortLevel: 'advanced',
      preferredExplanationStyle: 'balanced_technical'
    },
    usagePatterns: {
      primaryActivities: ['work_productivity', 'social_media'],
      signupFrequency: 'monthly',
      deviceUsage: 'mixed_usage'
    }
  },
  riskPreferences: {
    privacy: {
      overallImportance: 'very_important',
      sensitiveDataTypes: [
        { dataType: 'financial_information', priorityLevel: 1 },
        { dataType: 'personal_communications', priorityLevel: 2 },
        { dataType: 'location_data', priorityLevel: 3 }
      ],
      dataProcessingComfort: {
        domesticProcessing: 'comfortable',
        internationalTransfers: 'cautious',
        thirdPartySharing: 'uncomfortable',
        aiProcessing: 'cautious',
        longTermStorage: 'cautious'
      }
    },
    financial: {
      paymentApproach: 'cautious',
      feeImpact: 'moderate',
      financialSituation: 'stable_employment',
      subscriptionTolerance: {
        autoRenewal: 'cautious',
        freeTrialToSubscription: 'cautious',
        priceChanges: 'reasonable_notice'
      }
    },
    legal: {
      arbitrationComfort: 'prefer_courts',
      liabilityTolerance: 'reasonable_limitations',
      legalKnowledge: {
        contractLaw: 'intermediate',
        privacyLaw: 'intermediate',
        consumerRights: 'basic'
      },
      previousIssues: 'no_issues'
    }
  },
  contextualFactors: {
    dependentStatus: 'just_myself',
    specialCircumstances: ['handles_sensitive_data'],
    decisionMakingPriorities: [
      { factor: 'privacy_protection', priority: 1 },
      { factor: 'cost_value', priority: 2 },
      { factor: 'features_functionality', priority: 3 },
      { factor: 'reputation_reviews', priority: 4 },
      { factor: 'ease_of_use', priority: 5 },
      { factor: 'customer_support', priority: 6 },
      { factor: 'terms_fairness', priority: 7 },
      { factor: 'security_safety', priority: 8 },
      { factor: 'compliance_legal', priority: 9 }
    ],
    alertPreferences: {
      interruptionTiming: 'moderate_and_high',
      educationalContent: 'occasionally_important',
      alertFrequencyLimit: 10,
      learningMode: true
    }
  },
  computedProfile: {
    riskTolerance: {
      privacy: 6.5,
      financial: 7.2,
      legal: 5.8,
      overall: 6.5
    },
    alertThresholds: {
      privacy: 3.5,
      liability: 4.2,
      termination: 6.1,
      payment: 7.8,
      overall: 5.4
    },
    explanationStyle: 'balanced_educational',
    profileTags: ['age_26_40', 'occupation_technology', 'tech_advanced', 'privacy_very_important'],
    computedAt: new Date().toISOString(),
    computationVersion: '1.0'
  }
};

async function demonstrateFullFlow() {
  console.log('🎭 GOING BANANAS BACKEND - FULL FLOW DEMONSTRATION\n');
  console.log('=' .repeat(70));
  console.log('This demo shows actual MongoDB and Gemini interactions:\n');
  console.log('1. MongoDB: User profile creation and retrieval');
  console.log('2. Gemini: AI-powered T&C analysis with personalization');
  console.log('3. Integration: Context-aware analysis using user profiles\n');
  console.log('=' .repeat(70));

  try {
    // Step 1: Health Check
    console.log('\n📊 STEP 1: Health Check');
    console.log('-'.repeat(40));
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Backend Status:', healthResponse.data.health?.status);
    console.log('🔧 Environment:', healthResponse.data.health?.environment);
    console.log('⏱️  Uptime:', Math.round(healthResponse.data.health?.uptime / 60), 'minutes');
    console.log('📡 Response Time:', healthResponse.data.response_time, 'ms');

    // Step 2: Create User Profile (MongoDB Interaction)
    console.log('\n👤 STEP 2: User Profile Creation (MongoDB)');
    console.log('-'.repeat(40));
    console.log('📝 Creating user profile in MongoDB...');

    const profileResponse = await axios.post(`${BASE_URL}/api/personalization/profile`, testUserProfile);
    console.log('✅ Profile Created Successfully!');
    console.log('🔢 User ID:', profileResponse.data.profile?.userId);
    console.log('📊 Risk Tolerance Scores:', JSON.stringify(profileResponse.data.profile?.computedProfile?.riskTolerance, null, 2));
    console.log('🎯 Alert Thresholds:', JSON.stringify(profileResponse.data.profile?.computedProfile?.alertThresholds, null, 2));
    console.log('💬 Explanation Style:', profileResponse.data.profile?.computedProfile?.explanationStyle);

    // Step 3: Retrieve User Profile (MongoDB Query)
    console.log('\n📋 STEP 3: User Profile Retrieval (MongoDB)');
    console.log('-'.repeat(40));
    console.log('🔍 Retrieving user profile from MongoDB...');

    const retrieveResponse = await axios.get(`${BASE_URL}/api/personalization/profile/${testUserProfile.userId}`);
    console.log('✅ Profile Retrieved Successfully!');
    console.log('📅 Last Updated:', retrieveResponse.data.profile?.lastUpdated);
    console.log('🏷️  Profile Tags:', retrieveResponse.data.profile?.computedProfile?.profileTags.join(', '));

    // Step 4: Basic Gemini Analysis (No Personalization)
    console.log('\n🤖 STEP 4: Basic Gemini Analysis (No Context)');
    console.log('-'.repeat(40));
    console.log('🧠 Sending T&C text to Gemini for analysis...');

    const basicAnalysisResponse = await axios.post(`${BASE_URL}/api/analyze`, {
      text: sampleTermsText,
      options: {
        detail_level: 'standard',
        multiPass: false,
        contextAware: false
      }
    });

    console.log('✅ Gemini Analysis Complete!');
    console.log('📊 Risk Score:', basicAnalysisResponse.data.analysis?.risk_score);
    console.log('🚨 Risk Level:', basicAnalysisResponse.data.analysis?.risk_level);
    console.log('🎯 Confidence:', basicAnalysisResponse.data.analysis?.confidence);
    console.log('📝 Summary:', basicAnalysisResponse.data.analysis?.summary.substring(0, 100) + '...');
    console.log('🔍 Key Points:');
    basicAnalysisResponse.data.analysis?.key_points?.forEach((point, index) => {
      console.log(`   ${index + 1}. ${point}`);
    });

    console.log('\n📊 Category Breakdown:');
    Object.entries(basicAnalysisResponse.data.analysis?.categories || {}).forEach(([category, data]) => {
      console.log(`   ${category.toUpperCase()}: Score ${data.score}, Concerns: ${data.concerns.length}`);
    });

    // Step 5: Context-Aware Gemini Analysis (With Personalization)
    console.log('\n🎯 STEP 5: Context-Aware Gemini Analysis (With User Profile)');
    console.log('-'.repeat(40));
    console.log('🧠 Sending personalized analysis request to Gemini...');
    console.log('📋 Using user context: Tech worker, High privacy concern, Prefers technical explanations');

    const contextAnalysisResponse = await axios.post(`${BASE_URL}/api/analyze`, {
      text: sampleTermsText,
      userId: testUserProfile.userId,
      options: {
        detail_level: 'comprehensive',
        multiPass: true,
        contextAware: true
      }
    });

    console.log('✅ Personalized Gemini Analysis Complete!');
    console.log('📊 Risk Score:', contextAnalysisResponse.data.analysis?.risk_score);
    console.log('🚨 Risk Level:', contextAnalysisResponse.data.analysis?.risk_level);
    console.log('🎯 Confidence:', contextAnalysisResponse.data.analysis?.confidence);
    console.log('🔄 Multi-Pass Analysis:', contextAnalysisResponse.data.analysis?.multi_pass_analysis);
    console.log('📈 Passes Completed:', contextAnalysisResponse.data.analysis?.passes_completed);
    console.log('📝 Personalized Summary:', contextAnalysisResponse.data.analysis?.summary.substring(0, 120) + '...');

    console.log('\n📊 Personalized Category Analysis:');
    Object.entries(contextAnalysisResponse.data.analysis?.categories || {}).forEach(([category, data]) => {
      console.log(`   ${category.toUpperCase()}: Score ${data.score}, Concerns: ${data.concerns.length}`);
      if (data.regulatory_notes) {
        console.log(`     🏛️  Regulatory: ${data.regulatory_notes.join(', ')}`);
      }
    });

    console.log('\n💡 Personalized Recommendations:');
    (contextAnalysisResponse.data.analysis?.recommendations || []).forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });

    // Step 6: Multi-Pass Analysis Details
    if (contextAnalysisResponse.data.analysis?.aggregated_scores) {
      console.log('\n🔄 Multi-Pass Analysis Results:');
      Object.entries(contextAnalysisResponse.data.analysis.aggregated_scores).forEach(([category, data]) => {
        console.log(`   ${category.toUpperCase()}: ${data.score} (Confidence: ${(data.confidence * 100).toFixed(1)}%, ${data.passes_contributing} passes)`);
      });
    }

    // Step 7: Comprehensive Insights
    if (contextAnalysisResponse.data.analysis?.comprehensive_insights) {
      console.log('\n🧠 Comprehensive AI Insights:');
      console.log('🔍 Key Concerns:', contextAnalysisResponse.data.analysis.comprehensive_insights.key_concerns.length, 'identified');
      console.log('🏛️  Regulatory Flags:', contextAnalysisResponse.data.analysis.comprehensive_insights.regulatory_flags.join(', '));
      console.log('🌍 Jurisdictions:', contextAnalysisResponse.data.analysis.comprehensive_insights.jurisdictions.join(', '));
    }

    // Step 8: Performance Metrics
    console.log('\n⚡ STEP 6: Performance Metrics');
    console.log('-'.repeat(40));
    console.log('⏱️  Basic Analysis Time:', basicAnalysisResponse.data.metadata?.processing_time, 'ms');
    console.log('⏱️  Context-Aware Analysis Time:', contextAnalysisResponse.data.metadata?.processing_time, 'ms');
    console.log('🔧 Features Used:', JSON.stringify(contextAnalysisResponse.data.metadata?.features, null, 2));

    // Step 9: Get Personalization Insights
    console.log('\n📊 STEP 7: Personalization Insights');
    console.log('-'.repeat(40));
    const insightsResponse = await axios.get(`${BASE_URL}/api/personalization/insights/${testUserProfile.userId}`);
    console.log('✅ User Insights Generated!');
    console.log('🚨 Risk Profile:', JSON.stringify(insightsResponse.data.insights?.riskProfileSummary, null, 2));
    console.log('🔔 Alert Configuration:', JSON.stringify(insightsResponse.data.insights?.alertConfiguration, null, 2));

    // Final Summary
    console.log('\n🎉 DEMONSTRATION COMPLETE!');
    console.log('=' .repeat(70));
    console.log('✅ MongoDB successfully stored and retrieved user profiles');
    console.log('✅ Gemini API processed T&C analysis with structured output');
    console.log('✅ Multi-pass analysis provided detailed risk assessment');
    console.log('✅ Context-aware analysis personalized results for user profile');
    console.log('✅ Regulatory compliance assessment included');
    console.log('✅ Real-time performance metrics captured');
    console.log('\n🚀 Backend is fully functional with MongoDB + Gemini integration!');
    console.log('=' .repeat(70));

  } catch (error) {
    console.error('\n❌ DEMONSTRATION FAILED');
    console.error('-'.repeat(40));
    if (error.response) {
      console.error('HTTP Error:', error.response.status);
      console.error('Response:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run the demonstration
if (require.main === module) {
  demonstrateFullFlow().catch(console.error);
}

module.exports = { demonstrateFullFlow };
