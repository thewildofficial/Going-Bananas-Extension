const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userPersonalizationSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  version: { type: String, default: '1.0' },
  completedAt: { type: Date, required: true },
  demographics: {
    ageRange: String,
    jurisdiction: {
      primaryCountry: String,
      primaryState: String,
      frequentTravel: Boolean,
      isExpatriate: Boolean,
      multipleJurisdictions: [String]
    },
    occupation: String
  },
  digitalBehavior: {
    techSophistication: {
      readingFrequency: String,
      comfortLevel: String,
      preferredExplanationStyle: String
    },
    usagePatterns: {
      primaryActivities: [String],
      signupFrequency: String,
      deviceUsage: String
    }
  },
  riskPreferences: {
    privacy: {
        overallImportance: String,
        sensitiveDataTypes: [{ dataType: String, priorityLevel: Number }],
        dataProcessingComfort: {
            domesticProcessing: String,
            internationalTransfers: String,
            thirdPartySharing: String,
            aiProcessing: String,
            longTermStorage: String
        }
    },
    financial: {
        paymentApproach: String,
        feeImpact: String,
        financialSituation: String,
        subscriptionTolerance: {
            autoRenewal: String,
            freeTrialToSubscription: String,
            priceChanges: String
        }
    },
    legal: {
        arbitrationComfort: String,
        liabilityTolerance: String,
        legalKnowledge: {
            contractLaw: String,
            privacyLaw: String,
            consumerRights: String
        },
        previousIssues: String
    }
  },
  contextualFactors: {
      dependentStatus: String,
      specialCircumstances: [String],
      decisionMakingPriorities: [{ factor: String, priority: Number }],
      alertPreferences: {
          interruptionTiming: String,
          educationalContent: String,
          alertFrequencyLimit: Number,
          learningMode: Boolean
      }
  },
  computedProfile: {
    riskTolerance: {
      privacy: Number,
      financial: Number,
      legal: Number,
      overall: Number
    },
    alertThresholds: {
      privacy: Number,
      liability: Number,
      termination: Number,
      payment: Number,
      overall: Number
    },
    explanationStyle: String,
    profileTags: [String]
  },
  lastUpdated: { type: Date, default: Date.now }
});

const UserProfile = mongoose.model('UserProfile', userPersonalizationSchema);

module.exports = UserProfile;