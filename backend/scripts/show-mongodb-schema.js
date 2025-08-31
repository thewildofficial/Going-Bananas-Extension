/**
 * MONGODB SCHEMA VISUALIZER
 *
 * Shows exactly what data gets stored in MongoDB when a user authenticates with Google OAuth
 * and completes the personalization survey
 *
 * @author Aban Hasan (thewildofficial)
 * @version 1.0.0
 */

const mongoose = require('mongoose');

// Connect to MongoDB (if available)
const connectToMongoDB = async () => {
  try {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ Connected to MongoDB');
      return true;
    } else {
      console.log('⚠️  No MongoDB URI provided - showing schema only');
      return false;
    }
  } catch (error) {
    console.log('⚠️  MongoDB connection failed - showing schema only');
    return false;
  }
};

class MongoDBSchemaViewer {
  constructor() {
    this.connected = false;
  }

  log(message, type = 'info') {
    const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'data' ? '📊' : '🔄';
    console.log(`${prefix} ${message}`);
  }

  async showCompleteSchema() {
    console.log('\n📋 COMPLETE MONGODB SCHEMA FOR USER PROFILES\n');
    console.log('='.repeat(70));
    console.log('This shows exactly what gets stored when users authenticate with Google');
    console.log('='.repeat(70));

    // Show the complete schema structure
    this.showUserProfileSchema();

    // Show example data
    this.showExampleData();

    // Show how Firebase OAuth data maps to MongoDB
    this.showOAuthMapping();

    // Show personalization flow
    this.showPersonalizationFlow();
  }

  showUserProfileSchema() {
    this.log('MONGODB USER PROFILE SCHEMA STRUCTURE:', 'data');

    const schema = {
      userId: 'String (UUID format - primary identifier)',
      firebaseUid: 'String (Firebase user ID)',
      email: 'String (User email from Google)',
      displayName: 'String (Display name from Google)',
      photoURL: 'String (Profile photo URL from Google)',
      emailVerified: 'Boolean (Email verification status)',
      provider: 'String (Authentication provider)',
      version: 'String (Profile version)',
      completedAt: 'Date (When profile was created)',
      demographics: {
        ageRange: 'String (18_25, 26_40, 41_60, 60_plus)',
        jurisdiction: {
          primaryCountry: 'String (US, CA, UK, etc.)',
          primaryState: 'String (CA, NY, TX, etc.)',
          frequentTravel: 'Boolean',
          isExpatriate: 'Boolean',
          multipleJurisdictions: '[String] (Array of countries)'
        },
        occupation: 'String (technology, legal, business, etc.)'
      },
      digitalBehavior: {
        techSophistication: {
          readingFrequency: 'String (read_most, read_important, skim_only)',
          comfortLevel: 'String (beginner, intermediate, advanced)',
          preferredExplanationStyle: 'String (simple_plain, balanced_educational, technical_detailed)'
        },
        usagePatterns: {
          primaryActivities: '[String] (work_productivity, online_shopping, research, etc.)',
          signupFrequency: 'String (daily, weekly, monthly, rarely)',
          deviceUsage: 'String (mobile_heavy, desktop_heavy, mixed_usage)'
        }
      },
      riskPreferences: {
        privacy: {
          overallImportance: 'String (not_important, somewhat_important, very_important)',
          sensitiveDataTypes: '[Object] ({ dataType: String, priorityLevel: Number })',
          dataProcessingComfort: {
            domesticProcessing: 'String (comfortable, cautious, uncomfortable)',
            internationalTransfers: 'String (comfortable, cautious, uncomfortable, very_uncomfortable)',
            thirdPartySharing: 'String (comfortable, cautious, uncomfortable, very_uncomfortable)',
            aiProcessing: 'String (comfortable, cautious, uncomfortable, very_uncomfortable)',
            longTermStorage: 'String (comfortable, cautious, uncomfortable, very_uncomfortable)'
          }
        },
        financial: {
          paymentApproach: 'String (cautious, moderate, flexible)',
          feeImpact: 'String (very_sensitive, moderate, not_sensitive)',
          financialSituation: 'String (limited_budget, stable_employment, high_income)',
          subscriptionTolerance: {
            autoRenewal: 'String (comfortable, cautious, uncomfortable, very_uncomfortable)',
            freeTrialToSubscription: 'String (comfortable, cautious, uncomfortable)',
            priceChanges: 'String (reasonable_notice, immediate_notification, gradual_changes)'
          }
        },
        legal: {
          arbitrationComfort: 'String (comfortable, prefer_courts, strongly_prefer_courts)',
          liabilityTolerance: 'String (reasonable_limitations, strict_limitations, no_liability)',
          legalKnowledge: {
            contractLaw: 'String (beginner, intermediate, advanced, expert)',
            privacyLaw: 'String (beginner, intermediate, advanced, expert)',
            consumerRights: 'String (beginner, intermediate, advanced, expert)'
          },
          previousIssues: 'String (no_issues, minor_issues, multiple_issues, legal_action)'
        }
      },
      contextualFactors: {
        dependentStatus: 'String (just_myself, partner_spouse, family_household, dependents)',
        specialCircumstances: '[String] (privacy_advocate, handles_sensitive_data, etc.)',
        decisionMakingPriorities: '[Object] ({ factor: String, priority: Number })',
        alertPreferences: {
          interruptionTiming: 'String (all_risks, moderate_and_high, high_risk_only)',
          educationalContent: 'String (never_include, occasionally_important, always_include)',
          alertFrequencyLimit: 'Number (1-20)',
          learningMode: 'Boolean'
        }
      },
      computedProfile: {
        riskTolerance: {
          privacy: 'Number (1-10)',
          financial: 'Number (1-10)',
          legal: 'Number (1-10)',
          overall: 'Number (1-10)'
        },
        alertThresholds: {
          privacy: 'Number (1-10)',
          liability: 'Number (1-10)',
          termination: 'Number (1-10)',
          payment: 'Number (1-10)',
          overall: 'Number (1-10)'
        },
        explanationStyle: 'String (computed from preferences)',
        profileTags: '[String] (privacy_concerned, cost_sensitive, etc.)'
      },
      lastUpdated: 'Date'
    };

    console.log(JSON.stringify(schema, null, 2));
    console.log('');
  }

  showExampleData() {
    this.log('EXAMPLE USER PROFILE DATA IN MONGODB:', 'data');

    const exampleProfile = {
      "_id": "ObjectId('507f1f77bcf86cd799439011')",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "firebaseUid": "firebase-user-1234567890",
      "email": "john.doe@gmail.com",
      "displayName": "John Doe",
      "photoURL": "https://lh3.googleusercontent.com/a-/AOh14Gg...",
      "emailVerified": true,
      "provider": "google",
      "version": "1.0",
      "completedAt": "2024-01-15T10:30:00.000Z",
      "demographics": {
        "ageRange": "26_40",
        "jurisdiction": {
          "primaryCountry": "US",
          "primaryState": "CA",
          "frequentTravel": true,
          "isExpatriate": false,
          "multipleJurisdictions": ["Canada", "Mexico"]
        },
        "occupation": "technology"
      },
      "digitalBehavior": {
        "techSophistication": {
          "readingFrequency": "read_most",
          "comfortLevel": "advanced",
          "preferredExplanationStyle": "technical_detailed"
        },
        "usagePatterns": {
          "primaryActivities": ["work_productivity", "research", "online_shopping"],
          "signupFrequency": "weekly",
          "deviceUsage": "desktop_heavy"
        }
      },
      "riskPreferences": {
        "privacy": {
          "overallImportance": "very_important",
          "sensitiveDataTypes": [
            { "dataType": "financial_information", "priorityLevel": 1 },
            { "dataType": "health_data", "priorityLevel": 1 },
            { "dataType": "location_data", "priorityLevel": 2 }
          ],
          "dataProcessingComfort": {
            "domesticProcessing": "comfortable",
            "internationalTransfers": "uncomfortable",
            "thirdPartySharing": "very_uncomfortable",
            "aiProcessing": "cautious",
            "longTermStorage": "uncomfortable"
          }
        },
        "financial": {
          "paymentApproach": "cautious",
          "feeImpact": "moderate",
          "financialSituation": "stable_employment",
          "subscriptionTolerance": {
            "autoRenewal": "cautious",
            "freeTrialToSubscription": "cautious",
            "priceChanges": "reasonable_notice"
          }
        },
        "legal": {
          "arbitrationComfort": "prefer_courts",
          "liabilityTolerance": "reasonable_limitations",
          "legalKnowledge": {
            "contractLaw": "advanced",
            "privacyLaw": "intermediate",
            "consumerRights": "advanced"
          },
          "previousIssues": "minor_issues"
        }
      },
      "contextualFactors": {
        "dependentStatus": "family_household",
        "specialCircumstances": ["privacy_advocate", "handles_sensitive_business_data"],
        "decisionMakingPriorities": [
          { "factor": "privacy_protection", "priority": 1 },
          { "factor": "security_safety", "priority": 2 },
          { "factor": "data_rights", "priority": 3 },
          { "factor": "cost_value", "priority": 4 }
        ],
        "alertPreferences": {
          "interruptionTiming": "moderate_and_high",
          "educationalContent": "always_include",
          "alertFrequencyLimit": 8,
          "learningMode": true
        }
      },
      "computedProfile": {
        "riskTolerance": {
          "privacy": 8.5,
          "financial": 6.2,
          "legal": 7.1,
          "overall": 7.3
        },
        "alertThresholds": {
          "privacy": 7.0,
          "liability": 6.5,
          "termination": 6.0,
          "payment": 6.8,
          "overall": 6.6
        },
        "explanationStyle": "technical_detailed",
        "profileTags": ["privacy_concerned", "cost_cautious", "legally_savvy", "tech_advanced"]
      },
      "lastUpdated": "2024-01-15T10:30:00.000Z"
    };

    console.log(JSON.stringify(exampleProfile, null, 2));
    console.log('');
  }

  showOAuthMapping() {
    this.log('GOOGLE OAUTH → MONGODB MAPPING:', 'data');

    const mapping = {
      "GOOGLE OAUTH RESPONSE": {
        "user": {
          "uid": "firebase-user-1234567890",
          "email": "john.doe@gmail.com",
          "displayName": "John Doe",
          "photoURL": "https://lh3.googleusercontent.com/a-/AOh14Gg...",
          "emailVerified": true,
          "metadata": {
            "creationTime": "2024-01-15T08:30:00.000Z",
            "lastSignInTime": "2024-01-15T10:30:00.000Z"
          }
        },
        "credential": {
          "provider": "google.com",
          "accessToken": "ya29...",
          "idToken": "eyJhbGciOiJSUzI1NiIs..."
        }
      },

      "MAPPED TO MONGODB": {
        "firebaseUid": "firebase-user-1234567890",
        "email": "john.doe@gmail.com",
        "displayName": "John Doe",
        "photoURL": "https://lh3.googleusercontent.com/a-/AOh14Gg...",
        "emailVerified": true,
        "provider": "google",
        "userId": "550e8400-e29b-41d4-a716-446655440000", // Generated UUID
        "version": "1.0",
        "completedAt": "2024-01-15T10:30:00.000Z"
      }
    };

    console.log(JSON.stringify(mapping, null, 2));
    console.log('');
  }

  showPersonalizationFlow() {
    this.log('PERSONALIZATION DATA FLOW:', 'data');

    const flow = {
      "STEP 1: GOOGLE OAUTH": {
        "Input": "User clicks 'Sign in with Google'",
        "Process": "Firebase SDK handles OAuth flow",
        "Output": "ID Token + User Info from Google"
      },

      "STEP 2: FIREBASE TOKEN VERIFICATION": {
        "Input": "ID Token from Step 1",
        "Process": "Backend verifies token with Firebase Admin SDK",
        "Output": "Decoded user information (uid, email, name, etc.)"
      },

      "STEP 3: USER SURVEY COMPLETION": {
        "Input": "User answers personalization questions",
        "Process": "Frontend collects responses in structured format",
        "Output": "Complete personalization data object"
      },

      "STEP 4: MONGODB PROFILE CREATION": {
        "Input": "Firebase user info + Survey responses",
        "Process": "Backend creates MongoDB document with computed risk scores",
        "Output": "Complete user profile stored in MongoDB"
      },

      "STEP 5: AI ANALYSIS PERSONALIZATION": {
        "Input": "Terms text + User profile from MongoDB",
        "Process": "AI prompt includes user's risk preferences and context",
        "Output": "Personalized analysis results"
      }
    };

    console.log(JSON.stringify(flow, null, 2));
    console.log('');
  }

  async showDatabaseContents() {
    this.connected = await connectToMongoDB();

    if (!this.connected) {
      this.log('MongoDB not connected - cannot show live data');
      return;
    }

    try {
      const db = mongoose.connection.db;
      const collection = db.collection('userprofiles');

      const count = await collection.countDocuments();
      this.log(`Total user profiles in database: ${count}`);

      if (count > 0) {
        const sample = await collection.findOne({}, { projection: { _id: 0 } });
        this.log('Sample profile from database:');
        console.log(JSON.stringify(sample, null, 2));
      }
    } catch (error) {
      this.log(`Error querying database: ${error.message}`, 'error');
    }
  }
}

// Export for use in other files
module.exports = { MongoDBSchemaViewer };

// Run if called directly
if (require.main === module) {
  const viewer = new MongoDBSchemaViewer();
  viewer.showCompleteSchema().then(() => {
    return viewer.showDatabaseContents();
  }).catch(console.error);
}

