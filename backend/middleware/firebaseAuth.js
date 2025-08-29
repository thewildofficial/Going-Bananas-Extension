/**
 * Firebase Authentication Middleware
 *
 * Middleware for verifying Firebase ID tokens and extracting user information
 * Must be used after FirebaseService is initialized
 *
 * @fileoverview Firebase authentication middleware
 * @author Aban Hasan (thewildofficial)
 * @version 1.0.0
 */

const logger = require('../utils/logger');

/**
 * Firebase Authentication Middleware Factory
 * @param {FirebaseService} firebaseService - Initialized Firebase service instance
 * @returns {Function} Express middleware function
 */
function firebaseAuth(firebaseService) {
  return async (req, res, next) => {
    try {
      // Check if Firebase service is initialized
      if (!firebaseService || !firebaseService.isInitialized()) {
        logger.error('Firebase service not initialized');
        return res.status(500).json({
          success: false,
          error: 'Authentication service not available'
        });
      }

      // Extract token from Authorization header
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'No authorization token provided',
          code: 'NO_TOKEN'
        });
      }

      const idToken = authHeader.split('Bearer ')[1];

      if (!idToken) {
        return res.status(401).json({
          success: false,
          error: 'Invalid authorization token format',
          code: 'INVALID_TOKEN_FORMAT'
        });
      }

      // Verify Firebase token
      const decodedToken = await firebaseService.verifyToken(idToken);

      // Add user information to request object
      req.user = decodedToken;
      req.firebaseUid = decodedToken.uid;
      req.mongoUserId = firebaseService.getMongoUserId(decodedToken);
      req.userEmail = decodedToken.email;

      // Log successful authentication
      logger.info('User authenticated:', {
        firebaseUid: req.firebaseUid,
        mongoUserId: req.mongoUserId,
        email: req.userEmail,
        ip: req.ip
      });

      next();
    } catch (error) {
      logger.error('Authentication failed:', {
        error: error.message,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Determine appropriate error response
      let statusCode = 401;
      let errorCode = 'AUTH_FAILED';
      let errorMessage = 'Authentication failed';

      if (error.message.includes('Token used too late')) {
        errorCode = 'TOKEN_EXPIRED';
        errorMessage = 'Authentication token has expired';
      } else if (error.message.includes('Invalid token')) {
        errorCode = 'INVALID_TOKEN';
        errorMessage = 'Invalid authentication token';
      } else if (error.message.includes('Firebase service not initialized')) {
        statusCode = 500;
        errorCode = 'SERVICE_UNAVAILABLE';
        errorMessage = 'Authentication service temporarily unavailable';
      }

      return res.status(statusCode).json({
        success: false,
        error: errorMessage,
        code: errorCode,
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * Optional Authentication Middleware
 * Allows routes to work with or without authentication
 * Adds user info if token is provided, but doesn't fail if missing
 */
function optionalFirebaseAuth(firebaseService) {
  return async (req, res, next) => {
    try {
      // Try to authenticate if token is provided
      const authHeader = req.headers.authorization;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const idToken = authHeader.split('Bearer ')[1];

        if (idToken && firebaseService && firebaseService.isInitialized()) {
          try {
            const decodedToken = await firebaseService.verifyToken(idToken);

            req.user = decodedToken;
            req.firebaseUid = decodedToken.uid;
            req.mongoUserId = firebaseService.getMongoUserId(decodedToken);
            req.userEmail = decodedToken.email;
            req.isAuthenticated = true;

            logger.debug('Optional authentication successful:', req.mongoUserId);
          } catch (authError) {
            logger.debug('Optional authentication failed:', authError.message);
            req.isAuthenticated = false;
          }
        }
      } else {
        req.isAuthenticated = false;
      }

      next();
    } catch (error) {
      logger.error('Optional authentication error:', error.message);
      req.isAuthenticated = false;
      next();
    }
  };
}

/**
 * Admin-only Middleware
 * Requires authentication AND admin role
 */
function firebaseAuthAdmin(firebaseService) {
  return async (req, res, next) => {
    try {
      // First run regular auth
      const authMiddleware = firebaseAuth(firebaseService);
      await new Promise((resolve, reject) => {
        const mockRes = {
          status: (code) => ({
            json: (data) => {
              if (code >= 400) {
                reject(new Error(data.error || 'Auth failed'));
              } else {
                resolve(data);
              }
            }
          })
        };

        const mockReq = { ...req };
        authMiddleware(mockReq, mockRes, () => resolve());

        // Copy auth results back to original req
        if (mockReq.user) {
          req.user = mockReq.user;
          req.firebaseUid = mockReq.firebaseUid;
          req.mongoUserId = mockReq.mongoUserId;
        }
      });

      // Check for admin role (you can customize this logic)
      const isAdmin = req.user.email && (
        req.user.email.endsWith('@yourdomain.com') ||
        req.user.admin === true ||
        process.env.ADMIN_EMAILS?.split(',').includes(req.user.email)
      );

      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
          code: 'ADMIN_REQUIRED'
        });
      }

      logger.info('Admin access granted:', {
        userId: req.mongoUserId,
        email: req.user.email
      });

      next();
    } catch (error) {
      logger.error('Admin auth failed:', error.message);
      return res.status(403).json({
        success: false,
        error: 'Admin access denied',
        code: 'ADMIN_ACCESS_DENIED'
      });
    }
  };
}

module.exports = {
  firebaseAuth,
  optionalFirebaseAuth,
  firebaseAuthAdmin
};


