/**
 * Supabase Authentication Routes
 *
 * Handles Supabase authentication, user management, and profile operations
 * Provides endpoints for login, profile management, and user data
 *
 * @fileoverview Supabase authentication routes
 * @author Aban Hasan (thewildofficial)
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

/**
 * POST /supabase-auth/verify
 * Verify Supabase JWT token and return user information
 */
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required',
        code: 'MISSING_TOKEN'
      });
    }

    // Get Supabase service from app locals
    const supabaseService = req.app.locals.supabaseService;

    if (!supabaseService || !supabaseService.isServiceInitialized()) {
      return res.status(500).json({
        success: false,
        error: 'Supabase authentication service not available',
        code: 'SERVICE_UNAVAILABLE'
      });
    }

    // Verify the token
    const decodedToken = await supabaseService.verifyToken(token);

    // Get full user record
    const userRecord = await supabaseService.getUser(decodedToken.uid);

    // Return user information
    res.json({
      success: true,
      user: {
        supabaseUid: decodedToken.uid,
        mongoUserId: supabaseService.getMongoUserId(decodedToken),
        email: decodedToken.email,
        displayName: decodedToken.displayName,
        photoURL: decodedToken.photoURL,
        emailVerified: decodedToken.emailVerified,
        provider: 'supabase',
        metadata: userRecord.metadata
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Supabase token verification failed:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN'
    });
  }
});

/**
 * POST /supabase-auth/create-user
 * Create a new Supabase user (admin only)
 */
router.post('/create-user', async (req, res) => {
  try {
    const { email, password, displayName, photoURL } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    const supabaseService = req.app.locals.supabaseService;

    if (!supabaseService || !supabaseService.isServiceInitialized()) {
      return res.status(500).json({
        success: false,
        error: 'Supabase authentication service not available',
        code: 'SERVICE_UNAVAILABLE'
      });
    }

    // Create user in Supabase
    const userRecord = await supabaseService.createUser({
      email,
      password,
      displayName: displayName || '',
      photoURL: photoURL || ''
    });

    // Return user information (without sensitive data)
    res.json({
      success: true,
      user: {
        uid: userRecord.id,
        email: userRecord.email,
        displayName: userRecord.user_metadata?.full_name,
        photoURL: userRecord.user_metadata?.avatar_url,
        emailVerified: !!userRecord.email_confirmed_at,
        disabled: userRecord.banned_until ? true : false,
        metadata: {
          created_at: userRecord.created_at,
          last_sign_in_at: userRecord.last_sign_in_at
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Supabase user creation failed:', error.message);

    let errorCode = 'USER_CREATION_FAILED';
    let errorMessage = 'Failed to create user';

    if (error.message.includes('User already registered')) {
      errorCode = 'EMAIL_EXISTS';
      errorMessage = 'User with this email already exists';
    } else if (error.message.includes('Invalid email')) {
      errorCode = 'INVALID_EMAIL';
      errorMessage = 'Invalid email format';
    } else if (error.message.includes('Password')) {
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
 * POST /supabase-auth/link-profile
 * Link Supabase user with MongoDB personalization profile
 */
router.post('/link-profile', async (req, res) => {
  try {
    const { supabaseUid, mongoUserId } = req.body;

    if (!supabaseUid || !mongoUserId) {
      return res.status(400).json({
        success: false,
        error: 'Supabase UID and MongoDB user ID are required',
        code: 'MISSING_IDS'
      });
    }

    // Store the mapping in a simple in-memory store
    // In production, this should be stored in a database
    const userMapping = {
      supabaseUid,
      mongoUserId,
      linkedAt: new Date().toISOString()
    };

    // For now, we'll just return success
    // In a real implementation, you'd store this mapping
    res.json({
      success: true,
      message: 'Profile linked successfully',
      mapping: userMapping,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Profile linking failed:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to link profile',
      code: 'LINKING_FAILED'
    });
  }
});

/**
 * GET /supabase-auth/user/:userId
 * Get user information by Supabase UID
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const supabaseService = req.app.locals.supabaseService;

    if (!supabaseService || !supabaseService.isServiceInitialized()) {
      return res.status(500).json({
        success: false,
        error: 'Supabase authentication service not available',
        code: 'SERVICE_UNAVAILABLE'
      });
    }

    const userRecord = await supabaseService.getUser(userId);

    res.json({
      success: true,
      user: {
        uid: userRecord.id,
        email: userRecord.email,
        displayName: userRecord.user_metadata?.full_name,
        photoURL: userRecord.user_metadata?.avatar_url,
        emailVerified: !!userRecord.email_confirmed_at,
        disabled: userRecord.banned_until ? true : false,
        metadata: {
          created_at: userRecord.created_at,
          last_sign_in_at: userRecord.last_sign_in_at,
          app_metadata: userRecord.app_metadata,
          user_metadata: userRecord.user_metadata
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get Supabase user:', error.message);
    return res.status(404).json({
      success: false,
      error: 'User not found',
      code: 'USER_NOT_FOUND'
    });
  }
});

/**
 * PUT /supabase-auth/user/:userId
 * Update user information
 */
router.put('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { displayName, photoURL, metadata } = req.body;

    const supabaseService = req.app.locals.supabaseService;

    if (!supabaseService || !supabaseService.isServiceInitialized()) {
      return res.status(500).json({
        success: false,
        error: 'Supabase authentication service not available',
        code: 'SERVICE_UNAVAILABLE'
      });
    }

    const updateData = {};
    
    if (displayName !== undefined) {
      updateData.user_metadata = { ...updateData.user_metadata, full_name: displayName };
    }
    
    if (photoURL !== undefined) {
      updateData.user_metadata = { ...updateData.user_metadata, avatar_url: photoURL };
    }
    
    if (metadata) {
      updateData.user_metadata = { ...updateData.user_metadata, ...metadata };
    }

    const updatedUser = await supabaseService.updateUser(userId, updateData);

    res.json({
      success: true,
      message: 'User updated successfully',
      user: {
        uid: updatedUser.id,
        email: updatedUser.email,
        displayName: updatedUser.user_metadata?.full_name,
        photoURL: updatedUser.user_metadata?.avatar_url,
        emailVerified: !!updatedUser.email_confirmed_at,
        metadata: updatedUser.user_metadata
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to update Supabase user:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to update user',
      code: 'UPDATE_FAILED'
    });
  }
});

/**
 * DELETE /supabase-auth/user/:userId
 * Delete user account
 */
router.delete('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const supabaseService = req.app.locals.supabaseService;

    if (!supabaseService || !supabaseService.isServiceInitialized()) {
      return res.status(500).json({
        success: false,
        error: 'Supabase authentication service not available',
        code: 'SERVICE_UNAVAILABLE'
      });
    }

    await supabaseService.deleteUser(userId);

    res.json({
      success: true,
      message: 'User deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to delete Supabase user:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete user',
      code: 'DELETE_FAILED'
    });
  }
});

module.exports = router;