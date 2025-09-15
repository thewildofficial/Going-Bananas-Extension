/**
 * Firebase Service for Going Bananas T&C Analyzer
 *
 * Handles Firebase Authentication, user management, and token verification
 * Integrates with MongoDB for storing rich user profiles
 *
 * @fileoverview Firebase authentication and user management service
 * @author Aban Hasan (thewildofficial)
 * @version 1.0.0
 */

const admin = require('firebase-admin');
const logger = require('../utils/logger');

class FirebaseService {
  constructor() {
    this.initialized = false;
    this.initializeFirebase();
  }

  /**
   * Initialize Firebase Admin SDK
   */
  initializeFirebase() {
    try {
      if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
        logger.warn('Firebase credentials not provided, authentication will not work');
        return;
      }

      // Check if Firebase is already initialized
      if (admin.apps.length > 0) {
        this.app = admin.apps[0];
      } else {
        // Initialize Firebase Admin SDK
        this.app = admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          }),
          databaseURL: process.env.FIREBASE_DATABASE_URL
        });
      }

      this.auth = admin.auth();
      this.firestore = admin.firestore();
      this.initialized = true;

      logger.info('Firebase service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Firebase:', error.message);
      this.initialized = false;
    }
  }

  /**
   * Verify Firebase ID token
   * @param {string} idToken - Firebase ID token from client
   * @returns {Promise<Object>} Decoded token with user information
   */
  async verifyToken(idToken) {
    try {
      if (!this.initialized) {
        throw new Error('Firebase service not initialized');
      }

      const decodedToken = await this.auth.verifyIdToken(idToken);
      logger.debug('Token verified for user:', decodedToken.uid);

      return {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        displayName: decodedToken.name,
        photoURL: decodedToken.picture,
        provider: decodedToken.firebase.sign_in_provider,
        issuedAt: new Date(decodedToken.iat * 1000),
        expiresAt: new Date(decodedToken.exp * 1000)
      };
    } catch (error) {
      logger.error('Token verification failed:', error.message);
      throw new Error(`Invalid token: ${error.message}`);
    }
  }

  /**
   * Get user record from Firebase
   * @param {string} uid - Firebase user ID
   * @returns {Promise<Object>} Firebase user record
   */
  async getUser(uid) {
    try {
      if (!this.initialized) {
        throw new Error('Firebase service not initialized');
      }

      const userRecord = await this.auth.getUser(uid);
      return {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
        emailVerified: userRecord.emailVerified,
        disabled: userRecord.disabled,
        metadata: {
          creationTime: userRecord.metadata.creationTime,
          lastSignInTime: userRecord.metadata.lastSignInTime
        },
        providerData: userRecord.providerData
      };
    } catch (error) {
      logger.error('Failed to get user:', error.message);
      throw error;
    }
  }

  /**
   * Create or update user in Firebase
   * @param {string} uid - User ID
   * @param {Object} userData - User data to set
   * @returns {Promise<Object>} Updated user record
   */
  async createOrUpdateUser(uid, userData) {
    try {
      if (!this.initialized) {
        throw new Error('Firebase service not initialized');
      }

      const userRecord = await this.auth.updateUser(uid, userData);
      logger.info('User updated in Firebase:', uid);
      return userRecord;
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // User doesn't exist, create them
        const userRecord = await this.auth.createUser({
          uid: uid,
          ...userData
        });
        logger.info('User created in Firebase:', uid);
        return userRecord;
      }
      throw error;
    }
  }

  /**
   * Delete user from Firebase
   * @param {string} uid - User ID to delete
   * @returns {Promise<void>}
   */
  async deleteUser(uid) {
    try {
      if (!this.initialized) {
        throw new Error('Firebase service not initialized');
      }

      await this.auth.deleteUser(uid);
      logger.info('User deleted from Firebase:', uid);
    } catch (error) {
      logger.error('Failed to delete user from Firebase:', error.message);
      throw error;
    }
  }

  /**
   * Generate custom token for client-side authentication
   * @param {string} uid - User ID
   * @param {Object} additionalClaims - Additional claims to include
   * @returns {Promise<string>} Custom token
   */
  async createCustomToken(uid, additionalClaims = {}) {
    try {
      if (!this.initialized) {
        throw new Error('Firebase service not initialized');
      }

      const customToken = await this.auth.createCustomToken(uid, additionalClaims);
      return customToken;
    } catch (error) {
      logger.error('Failed to create custom token:', error.message);
      throw error;
    }
  }

  /**
   * Set custom user claims (for role-based access)
   * @param {string} uid - User ID
   * @param {Object} claims - Custom claims to set
   * @returns {Promise<void>}
   */
  async setCustomUserClaims(uid, claims) {
    try {
      if (!this.initialized) {
        throw new Error('Firebase service not initialized');
      }

      await this.auth.setCustomUserClaims(uid, claims);
      logger.info('Custom claims set for user:', uid);
    } catch (error) {
      logger.error('Failed to set custom claims:', error.message);
      throw error;
    }
  }

  /**
   * Revoke all refresh tokens for a user
   * @param {string} uid - User ID
   * @returns {Promise<void>}
   */
  async revokeRefreshTokens(uid) {
    try {
      if (!this.initialized) {
        throw new Error('Firebase service not initialized');
      }

      await this.auth.revokeRefreshTokens(uid);
      logger.info('Refresh tokens revoked for user:', uid);
    } catch (error) {
      logger.error('Failed to revoke refresh tokens:', error.message);
      throw error;
    }
  }

  /**
   * Get MongoDB-compatible user ID from Firebase user
   * @param {Object} firebaseUser - Firebase user object
   * @returns {string} MongoDB-compatible user ID
   */
  getMongoUserId(firebaseUser) {
    // Use Firebase UID as MongoDB userId, but ensure it's UUID format
    // If Firebase UID is not UUID format, we can hash it or use a different strategy
    return firebaseUser.uid;
  }

  /**
   * Create user profile structure for MongoDB storage
   * @param {Object} firebaseUser - Firebase user object
   * @param {Object} additionalData - Additional user data from forms
   * @returns {Object} User profile for MongoDB
   */
  createUserProfile(firebaseUser, additionalData = {}) {
    const mongoUserId = this.getMongoUserId(firebaseUser);

    return {
      userId: mongoUserId,
      firebaseUid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      emailVerified: firebaseUser.emailVerified,
      provider: firebaseUser.provider || 'google',
      version: '1.0',
      completedAt: new Date().toISOString(),
      demographics: {
        ageRange: additionalData.ageRange || '',
        jurisdiction: {
          primaryCountry: additionalData.country || 'US',
          primaryState: additionalData.state || '',
          frequentTravel: additionalData.frequentTravel || false,
          isExpatriate: additionalData.isExpatriate || false
        },
        occupation: additionalData.occupation || ''
      },
      digitalBehavior: {
        techSophistication: {
          readingFrequency: additionalData.readingFrequency || 'read_important',
          comfortLevel: additionalData.techComfortLevel || 'advanced',
          preferredExplanationStyle: additionalData.explanationStyle || 'balanced_educational'
        },
        usagePatterns: {
          primaryActivities: additionalData.primaryActivities || ['work_productivity'],
          signupFrequency: additionalData.signupFrequency || 'monthly',
          deviceUsage: additionalData.deviceUsage || 'mixed_usage'
        }
      },
      riskPreferences: {
        privacy: {
          overallImportance: additionalData.privacyImportance || 'very_important',
          sensitiveDataTypes: additionalData.sensitiveDataTypes || [],
          dataProcessingComfort: {
            domesticProcessing: additionalData.domesticProcessing || 'comfortable',
            internationalTransfers: additionalData.internationalTransfers || 'cautious',
            thirdPartySharing: additionalData.thirdPartySharing || 'uncomfortable',
            aiProcessing: additionalData.aiProcessing || 'cautious',
            longTermStorage: additionalData.longTermStorage || 'cautious'
          }
        },
        financial: {
          paymentApproach: additionalData.paymentApproach || 'cautious',
          feeImpact: additionalData.feeImpact || 'moderate',
          financialSituation: additionalData.financialSituation || 'stable_employment',
          subscriptionTolerance: {
            autoRenewal: additionalData.autoRenewal || 'cautious',
            freeTrialToSubscription: additionalData.freeTrialToSubscription || 'cautious',
            priceChanges: additionalData.priceChanges || 'reasonable_notice'
          }
        },
        legal: {
          arbitrationComfort: additionalData.arbitrationComfort || 'prefer_courts',
          liabilityTolerance: additionalData.liabilityTolerance || 'reasonable_limitations',
          legalKnowledge: {
            contractLaw: additionalData.contractLaw || 'intermediate',
            privacyLaw: additionalData.privacyLaw || 'intermediate',
            consumerRights: additionalData.consumerRights || 'basic'
          },
          previousIssues: additionalData.previousIssues || 'no_issues'
        }
      },
      contextualFactors: {
        dependentStatus: additionalData.dependentStatus || 'just_myself',
        specialCircumstances: additionalData.specialCircumstances || [],
        decisionMakingPriorities: additionalData.decisionMakingPriorities || [
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
          interruptionTiming: additionalData.interruptionTiming || 'moderate_and_high',
          educationalContent: additionalData.educationalContent || 'occasionally_important',
          alertFrequencyLimit: additionalData.alertFrequencyLimit || 10,
          learningMode: additionalData.learningMode || true
        }
      },
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Middleware function for Express to verify Firebase tokens
   * @returns {Function} Express middleware function
   */
  getAuthMiddleware() {
    return async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({
            success: false,
            error: 'No authorization token provided'
          });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await this.verifyToken(idToken);

        // Add user info to request object
        req.user = decodedToken;
        req.firebaseUid = decodedToken.uid;
        req.mongoUserId = this.getMongoUserId(decodedToken);

        next();
      } catch (error) {
        logger.error('Auth middleware error:', error.message);
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token'
        });
      }
    };
  }

  /**
   * Check if Firebase service is properly initialized
   * @returns {boolean} True if initialized
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Get Firebase app instance (for advanced use cases)
   * @returns {admin.app.App} Firebase app instance
   */
  getApp() {
    return this.app;
  }

  /**
   * Get Auth instance (for advanced use cases)
   * @returns {admin.auth.Auth} Firebase Auth instance
   */
  getAuth() {
    return this.auth;
  }

  /**
   * Get Firestore instance (for advanced use cases)
   * @returns {admin.firestore.Firestore} Firestore instance
   */
  getFirestore() {
    return this.firestore;
  }
}

module.exports = FirebaseService;






