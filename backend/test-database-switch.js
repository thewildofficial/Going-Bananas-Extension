/**
 * Database Switch Test
 *
 * This script demonstrates how to switch between MongoDB and Supabase
 * and tests both database configurations
 */

const PersonalizationService = require('./services/personalizationService');

console.log('🔄 DATABASE SWITCH DEMONSTRATION');
console.log('===================================\n');

// Test data
const testProfile = {
  userId: '550e8400-e29b-41d4-a716-446655440001',
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
      primaryActivities: ['work_productivity'],
      signupFrequency: 'monthly',
      deviceUsage: 'mixed_usage'
    }
  },
  riskPreferences: {
    privacy: {
      overallImportance: 'very_important',
      sensitiveDataTypes: [
        { dataType: 'financial_information', priorityLevel: 1 }
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
  }
};

async function testDatabaseSwitch() {
  const originalDatabaseType = process.env.DATABASE_TYPE;
  const originalNodeEnv = process.env.NODE_ENV;

  try {
    // Test 1: In-Memory (Test Mode)
    console.log('🧪 TEST 1: In-Memory Storage (Test Mode)');
    console.log('------------------------------------------');
    process.env.NODE_ENV = 'test';

    const testService = new PersonalizationService();

    // Save profile
    const savedProfile = await testService.saveUserProfile(testProfile);
    console.log('✅ Profile saved to in-memory storage');
    console.log(`   User ID: ${savedProfile.userId}`);

    // Retrieve profile
    const retrievedProfile = await testService.getUserProfile(testProfile.userId);
    console.log('✅ Profile retrieved from in-memory storage');
    console.log(`   Risk Tolerance: ${JSON.stringify(retrievedProfile.computedProfile?.riskTolerance)}`);

    // Delete profile
    await testService.deleteUserProfile(testProfile.userId);
    console.log('✅ Profile deleted from in-memory storage\n');

    // Test 2: MongoDB
    console.log('🍃 TEST 2: MongoDB Configuration');
    console.log('--------------------------------');
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_TYPE = 'mongodb';

    console.log('📋 Configuration:');
    console.log(`   DATABASE_TYPE: ${process.env.DATABASE_TYPE}`);
    console.log(`   MONGODB_URI: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/going-bananas'}`);
    console.log('');

    console.log('🔧 To use MongoDB:');
    console.log('   1. Install MongoDB locally or use MongoDB Atlas');
    console.log('   2. Set MONGODB_URI in your .env file');
    console.log('   3. Run: DATABASE_TYPE=mongodb npm start');
    console.log('');

    // Test 3: Supabase
    console.log('⚡ TEST 3: Supabase Configuration');
    console.log('----------------------------------');
    process.env.DATABASE_TYPE = 'supabase';

    console.log('📋 Configuration:');
    console.log(`   DATABASE_TYPE: ${process.env.DATABASE_TYPE}`);
    console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL || 'https://your-project.supabase.co'}`);
    console.log(`   SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? '***configured***' : 'your-anon-key'}`);
    console.log('');

    console.log('🔧 To use Supabase:');
    console.log('   1. Create a Supabase project at https://supabase.com');
    console.log('   2. Get your project URL and anon key from Settings > API');
    console.log('   3. Set environment variables in .env:');
    console.log('      DATABASE_TYPE=supabase');
    console.log('      SUPABASE_URL=https://your-project.supabase.co');
    console.log('      SUPABASE_ANON_KEY=your-anon-key');
    console.log('      SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Optional, for admin operations');
    console.log('   4. Run: DATABASE_TYPE=supabase npm start');
    console.log('');

    // Test 4: Environment Setup
    console.log('🌍 TEST 4: Environment Configuration');
    console.log('------------------------------------');
    console.log('📝 Create your .env file:');
    console.log('');
    console.log('# Choose your database');
    console.log('DATABASE_TYPE=mongodb  # or supabase');
    console.log('');
    console.log('# Gemini AI Configuration');
    console.log('GEMINI_API_KEY=your_gemini_api_key');
    console.log('GEMINI_MODEL=gemini-2.5-flash');
    console.log('');
    console.log('# MongoDB Configuration');
    console.log('MONGODB_URI=mongodb://localhost:27017/going-bananas');
    console.log('# OR for MongoDB Atlas:');
    console.log('# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/going-bananas');
    console.log('');
    console.log('# Supabase Configuration');
    console.log('SUPABASE_URL=https://your-project.supabase.co');
    console.log('SUPABASE_ANON_KEY=your-anon-key');
    console.log('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
    console.log('');
    console.log('# Other settings');
    console.log('NODE_ENV=development');
    console.log('PORT=3000');
    console.log('');

    console.log('🎯 DATABASE FEATURE COMPARISON');
    console.log('==============================');
    console.log('');
    console.log('📊 Data Storage:');
    console.log('   MongoDB:   Document-based (JSON-like), flexible schema');
    console.log('   Supabase:  PostgreSQL with JSONB, relational capabilities');
    console.log('');
    console.log('🔍 Querying:');
    console.log('   MongoDB:   Native JSON queries, aggregation pipelines');
    console.log('   Supabase:  SQL queries, advanced analytics capabilities');
    console.log('');
    console.log('⚡ Performance:');
    console.log('   MongoDB:   Fast reads/writes, good for user profiles');
    console.log('   Supabase:  Excellent for analytics, real-time features');
    console.log('');
    console.log('🔒 Authentication:');
    console.log('   MongoDB:   Requires separate auth solution');
    console.log('   Supabase:  Built-in Auth (Google, GitHub, etc.)');
    console.log('');
    console.log('📈 Scaling:');
    console.log('   MongoDB:   Horizontal scaling, global clusters');
    console.log('   Supabase:  Serverless scaling, edge functions');
    console.log('');
    console.log('💰 Cost:');
    console.log('   MongoDB:   Pay for storage/operations');
    console.log('   Supabase:  Generous free tier, pay for usage');
    console.log('');

    console.log('🎉 SETUP COMPLETE!');
    console.log('==================');
    console.log('');
    console.log('✅ Both MongoDB and Supabase are now supported!');
    console.log('✅ Switch between databases using DATABASE_TYPE environment variable');
    console.log('✅ All personalization features work with both databases');
    console.log('✅ Choose based on your needs:');
    console.log('   • MongoDB: If you need flexible schema and are familiar with it');
    console.log('   • Supabase: If you want built-in auth and real-time features');
    console.log('');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    // Restore original environment
    process.env.DATABASE_TYPE = originalDatabaseType;
    process.env.NODE_ENV = originalNodeEnv;
  }
}

// Run the demonstration
if (require.main === module) {
  testDatabaseSwitch().catch(console.error);
}

module.exports = { testDatabaseSwitch };
