/**
 * Supabase Authentication Service
 *
 * Service for handling Supabase authentication alongside Firebase
 * Provides user verification and session management
 *
 * @fileoverview Supabase authentication service
 * @author Aban Hasan (thewildofficial)
 * @version 1.0.0
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

class SupabaseService {
  constructor() {
    this.supabase = null;
    this.isInitialized = false;
    this.initialize();
  }

  /**
   * Initialize Supabase client
   */
  initialize() {
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        logger.warn('Supabase credentials not found. Supabase authentication disabled.');
        return;
      }

      this.supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      this.isInitialized = true;
      logger.info('Supabase service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Supabase service:', error.message);
      this.isInitialized = false;
    }
  }

  /**
   * Check if Supabase service is initialized
   * @returns {boolean} True if initialized
   */
  isServiceInitialized() {
    return this.isInitialized && this.supabase !== null;
  }

  /**
   * Verify Supabase JWT token
   * @param {string} token - JWT token from Supabase
   * @returns {Promise<Object>} Decoded token data
   */
  async verifyToken(token) {
    if (!this.isServiceInitialized()) {
      throw new Error('Supabase service not initialized');
    }

    try {
      const { data: { user }, error } = await this.supabase.auth.getUser(token);
      
      if (error) {
        throw new Error(`Token verification failed: ${error.message}`);
      }

      if (!user) {
        throw new Error('Invalid token: No user found');
      }

      return {
        uid: user.id,
        email: user.email,
        displayName: user.user_metadata?.full_name || user.user_metadata?.name,
        photoURL: user.user_metadata?.avatar_url,
        emailVerified: user.email_confirmed_at ? true : false,
        provider: 'supabase',
        metadata: {
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          app_metadata: user.app_metadata,
          user_metadata: user.user_metadata
        }
      };
    } catch (error) {
      logger.error('Supabase token verification failed:', error.message);
      throw error;
    }
  }

  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User data
   */
  async getUser(userId) {
    if (!this.isServiceInitialized()) {
      throw new Error('Supabase service not initialized');
    }

    try {
      const { data: { user }, error } = await this.supabase.auth.admin.getUserById(userId);
      
      if (error) {
        throw new Error(`Failed to get user: ${error.message}`);
      }

      return user;
    } catch (error) {
      logger.error('Failed to get Supabase user:', error.message);
      throw error;
    }
  }

  /**
   * Generate MongoDB user ID from Supabase user
   * @param {Object} decodedToken - Decoded token data
   * @returns {string} MongoDB user ID
   */
  getMongoUserId(decodedToken) {
    // Use Supabase user ID as MongoDB user ID
    return decodedToken.uid;
  }

  /**
   * Create user in Supabase (admin only)
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user
   */
  async createUser(userData) {
    if (!this.isServiceInitialized()) {
      throw new Error('Supabase service not initialized');
    }

    try {
      const { data, error } = await this.supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        user_metadata: {
          full_name: userData.displayName || '',
          avatar_url: userData.photoURL || ''
        },
        email_confirm: true
      });

      if (error) {
        throw new Error(`User creation failed: ${error.message}`);
      }

      return data.user;
    } catch (error) {
      logger.error('Supabase user creation failed:', error.message);
      throw error;
    }
  }

  /**
   * Update user in Supabase
   * @param {string} userId - User ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} Updated user
   */
  async updateUser(userId, updateData) {
    if (!this.isServiceInitialized()) {
      throw new Error('Supabase service not initialized');
    }

    try {
      const { data, error } = await this.supabase.auth.admin.updateUserById(userId, {
        user_metadata: updateData.user_metadata || {},
        app_metadata: updateData.app_metadata || {}
      });

      if (error) {
        throw new Error(`User update failed: ${error.message}`);
      }

      return data.user;
    } catch (error) {
      logger.error('Supabase user update failed:', error.message);
      throw error;
    }
  }

  /**
   * Delete user from Supabase
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteUser(userId) {
    if (!this.isServiceInitialized()) {
      throw new Error('Supabase service not initialized');
    }

    try {
      const { error } = await this.supabase.auth.admin.deleteUser(userId);
      
      if (error) {
        throw new Error(`User deletion failed: ${error.message}`);
      }

      return true;
    } catch (error) {
      logger.error('Supabase user deletion failed:', error.message);
      throw error;
    }
  }

  /**
   * Get authentication middleware for Express
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

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await this.verifyToken(token);

        // Add user info to request object
        req.user = decodedToken;
        req.supabaseUid = decodedToken.uid;
        req.mongoUserId = this.getMongoUserId(decodedToken);
        req.userEmail = decodedToken.email;
        req.authProvider = 'supabase';

        next();
      } catch (error) {
        logger.error('Supabase auth middleware error:', error.message);
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token'
        });
      }
    };
  }

  /**
   * Optional authentication middleware
   * Allows routes to work with or without authentication
   */
  getOptionalAuthMiddleware() {
    return async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.split('Bearer ')[1];
          
          try {
            const decodedToken = await this.verifyToken(token);
            
            req.user = decodedToken;
            req.supabaseUid = decodedToken.uid;
            req.mongoUserId = this.getMongoUserId(decodedToken);
            req.userEmail = decodedToken.email;
            req.authProvider = 'supabase';
            req.isAuthenticated = true;
          } catch (authError) {
            logger.debug('Optional Supabase authentication failed:', authError.message);
            req.isAuthenticated = false;
          }
        } else {
          req.isAuthenticated = false;
        }

        next();
      } catch (error) {
        logger.error('Optional Supabase auth middleware error:', error.message);
        req.isAuthenticated = false;
        next();
      }
    };
  }
}

module.exports = SupabaseService;