const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const UserProfile = require('../models/userProfile');
const personalizationRoutes = require('../routes/personalization');
require('dotenv').config();

describe('Integration Tests', () => {
  let app;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/personalization', personalizationRoutes);

    // Connect to a test database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    // Clean up the database and close the connection
    await UserProfile.deleteMany({});
    await mongoose.connection.close();
  });

  describe('POST /api/personalization/profile', () => {
    it('should create a new user profile', async () => {
      const validProfileData = {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        completedAt: '2024-01-15T10:30:00Z',
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
              { dataType: 'personal_communications', priorityLevel: 2 }
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
              contractLaw: 'basic',
              privacyLaw: 'intermediate',
              consumerRights: 'basic'
            },
            previousIssues: 'minor_problems'
          }
        },
        contextualFactors: {
          dependentStatus: 'spouse_partner',
          specialCircumstances: ['handles_sensitive_data'],
          decisionMakingPriorities: [
            { factor: 'privacy_protection', priority: 1 },
            { factor: 'features_functionality', priority: 2 },
            { factor: 'cost_value', priority: 3 },
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

      const res = await request(app)
        .post('/api/personalization/profile')
        .send(validProfileData);

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.profile.userId).toBe(validProfileData.userId);
      expect(res.body.profile.computedProfile).toBeDefined();

      // Verify that the profile was saved to the database
      const savedProfile = await UserProfile.findOne({ userId: validProfileData.userId });
      expect(savedProfile).toBeDefined();
      expect(savedProfile.demographics.occupation).toBe('technology');
    });
  });

  describe('GET /api/personalization/profile/:userId', () => {
    it('should retrieve an existing user profile', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174001';
      const res = await request(app).get(`/api/personalization/profile/${userId}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.profile.userId).toBe(userId);
    });

    it('should return 404 for a non-existent user profile', async () => {
      const userId = 'non-existent-user';
      const res = await request(app).get(`/api/personalization/profile/${userId}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.success).toBe(false);
    });
  });
});