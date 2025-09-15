/**
 * Firebase Authentication Routes
 *
 * Handles Firebase authentication, user management, and profile operations
 * Provides endpoints for login, profile management, and user data
 *
 * @fileoverview Authentication routes for Firebase integration
 * @author Aban Hasan (thewildofficial)
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

/**
 * POST /auth/verify
 * Verify Firebase ID token and return user information
 */
router.post('/verify', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: 'ID token is required',
        code: 'MISSING_TOKEN'
      });
    }

    // Get Firebase service from app locals
    const firebaseService = req.app.locals.firebaseService;

    if (!firebaseService || !firebaseService.isInitialized()) {
      return res.status(500).json({
        success: false,
        error: 'Authentication service not available',
        code: 'SERVICE_UNAVAILABLE'
      });
    }

    // Verify the token
    const decodedToken = await firebaseService.verifyToken(idToken);

    // Get full user record
    const userRecord = await firebaseService.getUser(decodedToken.uid);

    // Return user information
    res.json({
      success: true,
      user: {
        firebaseUid: decodedToken.uid,
        mongoUserId: firebaseService.getMongoUserId(decodedToken),
        email: decodedToken.email,
        displayName: decodedToken.displayName,
        photoURL: decodedToken.photoURL,
        emailVerified: decodedToken.emailVerified,
        provider: decodedToken.firebase.sign_in_provider,
        metadata: userRecord.metadata
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Token verification failed:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN'
    });
  }
});

/**
 * POST /auth/create-user
 * Create a new Firebase user (admin only)
 */
router.post('/create-user', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    const firebaseService = req.app.locals.firebaseService;

    if (!firebaseService || !firebaseService.isInitialized()) {
      return res.status(500).json({
        success: false,
        error: 'Authentication service not available',
        code: 'SERVICE_UNAVAILABLE'
      });
    }

    // Create user in Firebase
    const userRecord = await firebaseService.getAuth().createUser({
      email: email,
      password: password,
      displayName: displayName || '',
      emailVerified: false
    });

    // Return user information (without sensitive data)
    res.json({
      success: true,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        emailVerified: userRecord.emailVerified,
        disabled: userRecord.disabled,
        metadata: userRecord.metadata
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('User creation failed:', error.message);

    let errorCode = 'USER_CREATION_FAILED';
    let errorMessage = 'Failed to create user';

    if (error.code === 'auth/email-already-exists') {
      errorCode = 'EMAIL_EXISTS';
      errorMessage = 'User with this email already exists';
    } else if (error.code === 'auth/invalid-email') {
      errorCode = 'INVALID_EMAIL';
      errorMessage = 'Invalid email format';
    } else if (error.code === 'auth/weak-password') {
      errorCode = 'WEAK_PASSWORD';
      errorMessage = 'Password is too weak';
    }

    return res.status(400).json({
      success: false,
      error: errorMessage,
      code: errorCode
    });
  }
});

/**
 * POST /auth/link-profile
 * Link Firebase user with MongoDB personalization profile
 */
router.post('/link-profile', async (req, res) => {
  try {
    const firebaseService = req.app.locals.firebaseService;
    const personalizationService = req.app.locals.personalizationService;

    if (!firebaseService || !firebaseService.isInitialized()) {
      return res.status(500).json({
        success: false,
        error: 'Authentication service not available',
        code: 'SERVICE_UNAVAILABLE'
      });
    }

    // Extract Firebase user info from request (would come from middleware in production)
    const { idToken, profileData } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: 'ID token is required',
        code: 'MISSING_TOKEN'
      });
    }

    // Verify Firebase token
    const decodedToken = await firebaseService.verifyToken(idToken);

    // Create user profile for MongoDB
    const userProfile = firebaseService.createUserProfile(decodedToken, profileData);

    // Save to MongoDB
    const savedProfile = await personalizationService.saveUserProfile(userProfile);

    // Return success with profile info
    res.json({
      success: true,
      message: 'User profile linked successfully',
      user: {
        firebaseUid: decodedToken.uid,
        mongoUserId: userProfile.userId,
        email: decodedToken.email,
        profileComplete: true
      },
      profile: {
        id: savedProfile._id,
        userId: savedProfile.userId,
        completedAt: savedProfile.completedAt,
        riskTolerance: savedProfile.computedProfile?.riskTolerance
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Profile linking failed:', error.message);

    let statusCode = 500;
    let errorCode = 'PROFILE_LINK_FAILED';
    let errorMessage = 'Failed to link user profile';

    if (error.message.includes('validation failed')) {
      statusCode = 400;
      errorCode = 'VALIDATION_FAILED';
      errorMessage = 'Profile data validation failed';
    } else if (error.message.includes('not found')) {
      statusCode = 404;
      errorCode = 'USER_NOT_FOUND';
      errorMessage = 'User not found';
    }

    return res.status(statusCode).json({
      success: false,
      error: errorMessage,
      code: errorCode
    });
  }
});

/**
 * GET /auth/me
 * Get current user information (requires authentication)
 */
router.get('/me', async (req, res) => {
  try {
    const firebaseService = req.app.locals.firebaseService;
    const personalizationService = req.app.locals.personalizationService;

    // User info should be set by authentication middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Get Firebase user record
    const firebaseUser = await firebaseService.getUser(req.firebaseUid);

    // Try to get personalization profile
    let userProfile = null;
    try {
      userProfile = await personalizationService.getUserProfile(req.mongoUserId);
    } catch (error) {
      logger.debug('No personalization profile found for user:', req.mongoUserId);
    }

    // Return comprehensive user information
    res.json({
      success: true,
      user: {
        firebaseUid: req.firebaseUid,
        mongoUserId: req.mongoUserId,
        email: req.user.email,
        displayName: req.user.displayName,
        photoURL: req.user.photoURL,
        emailVerified: req.user.emailVerified,
        provider: req.user.provider,
        metadata: firebaseUser.metadata
      },
      profile: userProfile ? {
        exists: true,
        completedAt: userProfile.completedAt,
        riskTolerance: userProfile.computedProfile?.riskTolerance,
        profileTags: userProfile.computedProfile?.profileTags
      } : {
        exists: false,
        message: 'Personalization profile not created yet'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get user info:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve user information',
      code: 'USER_INFO_FAILED'
    });
  }
});

/**
 * POST /auth/logout
 * Logout user (client-side token management, server acknowledges)
 */
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully',
    note: 'Token management is handled client-side',
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /auth/refresh-token
 * Refresh Firebase token (client handles this, server acknowledges)
 */
router.post('/refresh-token', (req, res) => {
  res.json({
    success: true,
    message: 'Token refresh should be handled client-side with Firebase SDK',
    note: 'This endpoint is for compatibility - use Firebase SDK for token refresh',
    timestamp: new Date().toISOString()
  });
});

/**
 * DELETE /auth/delete
 * Delete user account (requires authentication)
 */
router.delete('/delete', async (req, res) => {
  try {
    const firebaseService = req.app.locals.firebaseService;
    const personalizationService = req.app.locals.personalizationService;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Delete from MongoDB first (if exists)
    try {
      await personalizationService.deleteUserProfile(req.mongoUserId);
      logger.info('MongoDB profile deleted:', req.mongoUserId);
    } catch (error) {
      logger.warn('MongoDB profile deletion failed:', error.message);
    }

    // Delete from Firebase
    await firebaseService.deleteUser(req.firebaseUid);
    logger.info('Firebase user deleted:', req.firebaseUid);

    res.json({
      success: true,
      message: 'User account deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Account deletion failed:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete user account',
      code: 'DELETE_FAILED'
    });
  }
});

module.exports = router;






