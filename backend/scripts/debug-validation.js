/**
 * DEBUG VALIDATION ERRORS
 *
 * Shows the exact Joi validation errors for profile creation
 */

const axios = require('axios');
const { userPersonalizationSchema } = require('./schemas/personalizationSchemas');

// Test data that should be valid
const testProfile = {
  userId: "550e8400-e29b-41d4-a716-446655440000",
  version: "1.0",
  completedAt: new Date().toISOString(),

  demographics: {
    ageRange: "26_40",
    jurisdiction: {
      primaryCountry: "US",
      primaryState: "CA",
      frequentTravel: false,
      isExpatriate: false,
      multipleJurisdictions: []
    },
    occupation: "technology"
  },

  digitalBehavior: {
    techSophistication: {
      readingFrequency: "read_thoroughly",
      comfortLevel: "advanced",
      preferredExplanationStyle: "technical_detailed"
    },
    usagePatterns: {
      primaryActivities: ["work_productivity"],
      signupFrequency: "monthly",
      deviceUsage: "desktop_primary"
    }
  },

  riskPreferences: {
    privacy: {
      overallImportance: "very_important",
      sensitiveDataTypes: [
        { dataType: "financial_information", priorityLevel: 1 }
      ],
      dataProcessingComfort: {
        domesticProcessing: "comfortable",
        internationalTransfers: "cautious",
        thirdPartySharing: "uncomfortable",
        aiProcessing: "cautious",
        longTermStorage: "uncomfortable"
      }
    },
    financial: {
      paymentApproach: "cautious",
      feeImpact: "moderate",
      financialSituation: "stable_employment",
      subscriptionTolerance: {
        autoRenewal: "cautious",
        freeTrialToSubscription: "cautious",
        priceChanges: "reasonable_notice"
      }
    },
    legal: {
      arbitrationComfort: "prefer_courts",
      liabilityTolerance: "reasonable_limitations",
      legalKnowledge: {
        contractLaw: "intermediate",
        privacyLaw: "intermediate",
        consumerRights: "basic"
      },
      previousIssues: "no_issues"
    }
  },

  contextualFactors: {
    dependentStatus: "just_myself",
    specialCircumstances: ["handles_sensitive_data"],
    decisionMakingPriorities: [
      { factor: "privacy_protection", priority: 1 },
      { factor: "security_safety", priority: 2 },
      { factor: "cost_value", priority: 3 },
      { factor: "features_functionality", priority: 4 },
      { factor: "ease_of_use", priority: 5 },
      { factor: "customer_support", priority: 6 },
      { factor: "terms_fairness", priority: 7 },
      { factor: "reputation_reviews", priority: 8 },
      { factor: "compliance_legal", priority: 9 }
    ],
    alertPreferences: {
      interruptionTiming: "moderate_and_high",
      educationalContent: "occasionally_important",
      alertFrequencyLimit: 10,
      learningMode: true
    }
  }
};

console.log('🔍 DEBUGGING PROFILE VALIDATION ERRORS');
console.log('=====================================');

// Test Joi validation locally
console.log('\n📋 LOCAL JOI VALIDATION:');
const { error, value } = userPersonalizationSchema.validate(testProfile, { abortEarly: false });

if (error) {
  console.log('❌ Validation Errors:');
  error.details.forEach((detail, index) => {
    console.log(`   ${index + 1}. ${detail.message}`);
    console.log(`      Path: ${detail.path.join('.')}`);
    console.log(`      Value: ${JSON.stringify(detail.context?.value)}`);
    console.log('');
  });
} else {
  console.log('✅ Local validation passed!');
  console.log('Validated profile:', JSON.stringify(value, null, 2));
}

console.log('\n🌐 TESTING API ENDPOINT:');
const BASE_URL = 'http://localhost:3002';

(async () => {
  try {
    const response = await axios.post(`${BASE_URL}/api/personalization/profile`, testProfile);
    console.log('✅ API validation passed!');
    console.log('Profile created:', response.data.profile.userId);
  } catch (error) {
    console.log('❌ API validation failed:');
    console.log('   Error:', error.response?.data?.error || error.message);

    if (error.response?.data?.metadata) {
      console.log('   Metadata:', error.response.data.metadata);
    }
  }
})();
