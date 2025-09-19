// Main Server File for Going Bananas T&C Analyzer Backend
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const logger = require('./utils/logger');
const corsMiddleware = require('./middleware/cors');
const validationMiddleware = require('./middleware/validation');
const rateLimitMiddleware = require('./middleware/rateLimit');

// Import routes
const analyzeRoutes = require('./routes/analyze');
const healthRoutes = require('./routes/health');
const personalizationRoutes = require('./routes/personalization');
const configRoutes = require('./routes/config');
const WebSocketService = require('./services/webSocketService');

class Server {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.webSocketService = null;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false, // Disable for API
      crossOriginEmbedderPolicy: false
    }));

    // Compression
    this.app.use(compression());

    // CORS
    this.app.use(corsMiddleware);

    // Rate limiting
    this.app.use(rateLimitMiddleware);

    // Body parsing
    this.app.use(express.json({ 
      limit: '10mb',
      strict: true 
    }));
    this.app.use(express.urlencoded({ 
      extended: true,
      limit: '10mb' 
    }));

    // Logging
    if (process.env.NODE_ENV !== 'test') {
      this.app.use(morgan('combined', {
        stream: {
          write: (message) => logger.info(message.trim())
        }
      }));
    }

    // Request validation
    this.app.use(validationMiddleware);
  }

  setupRoutes() {
    // Health check route
    this.app.use('/api/health', healthRoutes);
    this.app.use('/api', healthRoutes);

    // Main analysis route
    this.app.use('/api/analyze', analyzeRoutes);
    this.app.use('/api', analyzeRoutes);

    // Personalization routes
    this.app.use('/api/personalization', personalizationRoutes);

    // Configuration routes
    this.app.use('/api/config', configRoutes);

    // Root route
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Going Bananas T&C Analyzer API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
          health: '/api/health',
          analyze: '/api/analyze',
          personalization: '/api/personalization',
          config: '/api/config',
          websocket: 'ws://localhost:3000/ws'
        },
        documentation: 'https://github.com/goingbananas/extension/blob/main/docs/API.md'
      });
    });

    // OAuth success redirect handler
    this.app.get('/oauth/success', (req, res) => {
      logger.info('OAuth success redirect handled', { 
        query: req.query,
        hash: req.params,
        userAgent: req.get('User-Agent')
      });
      
      res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Login Successful - Going Bananas</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 0;
      background: linear-gradient(135deg, #ff9a56 0%, #ff6b95 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .container {
      background: white;
      color: #1a1a1a;
      padding: 40px;
      border-radius: 20px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12);
      max-width: 500px;
      text-align: center;
    }
    .title {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 16px;
      background: linear-gradient(135deg, #ff9a56 0%, #ff6b95 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .subtitle {
      font-size: 18px;
      margin-bottom: 24px;
      color: #4a5568;
      font-weight: 500;
    }
    .success-message {
      background: #f0fff4;
      border: 2px solid #68d391;
      color: #2f855a;
      padding: 16px;
      border-radius: 12px;
      font-size: 16px;
      margin-bottom: 24px;
      font-weight: 500;
    }
    .processing-message {
      background: #fefcbf;
      border: 2px solid #f6e05e;
      color: #744210;
      padding: 16px;
      border-radius: 12px;
      font-size: 16px;
      margin-bottom: 24px;
      font-weight: 500;
      display: none;
    }
    .instructions {
      font-size: 16px;
      color: #718096;
      margin-bottom: 20px;
      font-weight: 500;
    }
    .steps {
      text-align: left;
      font-size: 15px;
      color: #4a5568;
      line-height: 1.8;
      margin-bottom: 24px;
      background: #f7fafc;
      padding: 20px;
      border-radius: 12px;
      border-left: 4px solid #ff9a56;
    }
    .step {
      margin-bottom: 12px;
      padding: 8px 0;
    }
    .step strong {
      color: #2d3748;
    }
    .button {
      background: linear-gradient(135deg, #ff9a56 0%, #ff6b95 100%);
      color: white;
      border: none;
      padding: 14px 28px;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      margin: 8px;
      font-size: 16px;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(255, 154, 86, 0.3);
    }
    .button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(255, 154, 86, 0.4);
    }
    .button.secondary {
      background: #e2e8f0;
      color: #4a5568;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    .button.secondary:hover {
      background: #cbd5e0;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
    }
    .extension-icon {
      width: 24px;
      height: 24px;
      background: #ff9a56;
      border-radius: 6px;
      display: inline-block;
      margin-right: 8px;
      vertical-align: middle;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="title">🎉 Welcome to Going Bananas!</div>
    <div class="subtitle">Your Google account has been successfully connected</div>
    
    <div id="success-message" class="success-message">
      ✅ Authentication completed! Setting up your session...
    </div>
    
    <div id="processing-message" class="processing-message">
      🔄 Processing your authentication tokens and creating your session...
    </div>
    
    <div class="instructions">To continue with your personalization setup:</div>
    <div class="steps">
      <div class="step">
        <strong>Step 1:</strong> Look for the Going Bananas extension icon <span class="extension-icon"></span> in your browser's toolbar (usually in the top right)
      </div>
      <div class="step">
        <strong>Step 2:</strong> Click on the extension icon to open the popup
      </div>
      <div class="step">
        <strong>Step 3:</strong> You should now be automatically logged in
      </div>
      <div class="step">
        <strong>Step 4:</strong> Complete the quick 4-step personalization setup
      </div>
    </div>
    
    <button class="button" onclick="continueSetup()" id="continue-btn">
      🚀 Continue to Setup
    </button>
    <button class="button secondary" onclick="window.close()">
      Close This Tab
    </button>
    
    <div id="status" style="display: none; margin-top: 20px; padding: 12px; border-radius: 8px;"></div>
  </div>

  <script>
    console.log('🎯 OAuth success page loaded');
    
    let tokensProcessed = false;
    let userSession = null;
    
    function continueSetup() {
      const status = document.getElementById('status');
      status.style.display = 'block';
      status.style.background = '#e6fffa';
      status.style.border = '1px solid #38b2ac';
      status.style.color = '#2c7a7b';
      
      if (tokensProcessed) {
        status.innerHTML = '✅ Session created! Click the Going Bananas extension icon to access your personalized dashboard.';
      } else {
        status.innerHTML = '⏳ Still processing your session. Please wait a moment and try again.';
      }
    }

    // Extract OAuth tokens from URL and create session
    async function processOAuthTokens() {
      try {
        console.log('🔍 Extracting OAuth tokens from URL');
        
        const fragment = window.location.hash.substring(1);
        const params = new URLSearchParams(fragment);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        const expires_in = params.get('expires_in');
        
        if (access_token) {
          console.log('✅ OAuth tokens found, creating user session');
          
          // Show processing message
          document.getElementById('processing-message').style.display = 'block';
          document.getElementById('success-message').innerHTML = '🔄 Creating your session...';
          
          // Create session data
          const sessionData = {
            access_token,
            refresh_token,
            expires_in: parseInt(expires_in) || 3600,
            timestamp: Date.now()
          };
          
          // Get user info from Supabase using the access token
          try {
            // Get Supabase config from backend
            const configResponse = await fetch('/api/config/supabase');
            const config = await configResponse.json();
            
            const userResponse = await fetch(config.url + '/auth/v1/user', {
              headers: {
                'Authorization': 'Bearer ' + access_token,
                'apikey': config.anonKey
              }
            });
            
            if (userResponse.ok) {
              const userData = await userResponse.json();
              console.log('👤 User data retrieved:', userData);
              
              userSession = {
                user: {
                  email: userData.email || 'user@example.com',
                  name: userData.user_metadata?.name || userData.user_metadata?.full_name || 'User',
                  provider: 'google',
                  avatar: userData.user_metadata?.avatar_url
                },
                timestamp: Date.now(),
                tokens: sessionData
              };
            } else {
              console.log('⚠️ User API response not ok:', userResponse.status);
              throw new Error('User fetch failed');
            }
          } catch (error) {
            console.log('⚠️ Could not fetch user data, using fallback:', error.message);
            userSession = {
              user: {
                email: 'user@example.com',
                name: 'User',
                provider: 'google'
              },
              timestamp: Date.now(),
              tokens: sessionData
            };
          }
          
          // Store session data for extension to access
          localStorage.setItem('goingBananas_userSession', JSON.stringify(userSession));
          localStorage.setItem('goingBananas_loginSuccess', 'true');
          localStorage.setItem('goingBananas_loginTimestamp', Date.now().toString());
          
          console.log('✅ User session created and stored');
          tokensProcessed = true;
          
          // Send message to content script to transfer session to extension
          try {
            window.postMessage({
              type: 'GOING_BANANAS_SESSION_CREATED',
              sessionData: userSession
            }, window.location.origin);
            console.log('📨 Session data sent to content script');
          } catch (e) {
            console.log('⚠️ Could not send message to content script:', e);
          }
          
          // Update UI
          document.getElementById('processing-message').style.display = 'none';
          document.getElementById('success-message').innerHTML = '✅ Session created successfully! You are now logged in.';
          document.getElementById('success-message').style.background = '#f0fff4';
          
        } else {
          console.error('❌ No access token found in URL');
          document.getElementById('processing-message').style.display = 'none';
          document.getElementById('success-message').innerHTML = '❌ Authentication tokens not found. Please try logging in again.';
          document.getElementById('success-message').style.background = '#fed7d7';
          document.getElementById('success-message').style.borderColor = '#f56565';
          document.getElementById('success-message').style.color = '#c53030';
        }
        
      } catch (error) {
        console.error('❌ Failed to process OAuth tokens:', error);
        document.getElementById('processing-message').style.display = 'none';
        document.getElementById('success-message').innerHTML = '❌ Failed to create session. Please try logging in again.';
        document.getElementById('success-message').style.background = '#fed7d7';
        document.getElementById('success-message').style.borderColor = '#f56565';
        document.getElementById('success-message').style.color = '#c53030';
      }
    }

    // Process tokens when page loads
    window.addEventListener('load', () => {
      console.log('🚀 Page loaded, processing OAuth tokens');
      processOAuthTokens();
    });
  </script>
</body>
</html>
      `);
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        available_endpoints: [
          'GET /api/health',
          'POST /api/analyze',
          'GET|POST|PATCH|DELETE /api/personalization',
          'GET /api/config/supabase',
          'POST /api/dev/logs'
        ]
      });
    });
  }

  setupErrorHandling() {
    // Global error handler
    this.app.use((error, req, res, next) => {
      logger.error('Unhandled error:', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip
      });

      const isDevelopment = process.env.NODE_ENV === 'development';
      
      res.status(error.status || 500).json({
        success: false,
        error: error.message || 'Internal server error',
        ...(isDevelopment && { stack: error.stack })
      });
    });

    // Unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Promise Rejection:', {
        reason: reason,
        promise: promise
      });
    });

    // Uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', {
        error: error.message,
        stack: error.stack
      });
      
      // Graceful shutdown
      this.gracefulShutdown();
    });

    // Graceful shutdown on SIGTERM/SIGINT
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, starting graceful shutdown');
      this.gracefulShutdown();
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, starting graceful shutdown');
      this.gracefulShutdown();
    });
  }

  gracefulShutdown() {
    if (this.server) {
      this.server.close(() => {
        logger.info('Server closed gracefully');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    } else {
      process.exit(0);
    }
  }

  start() {
    this.server = this.app.listen(this.port, () => {
      logger.info(`Going Bananas API Server started on port ${this.port}`, {
        port: this.port,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      });

      // Initialize WebSocket service
      this.webSocketService = new WebSocketService(this.server);

      // Store WebSocket service in app locals for route access
      this.app.locals.webSocketService = this.webSocketService;

      // Log available endpoints
      logger.info('Available endpoints:', {
        endpoints: [
          `GET http://localhost:${this.port}/api/health`,
          `POST http://localhost:${this.port}/api/analyze`,
          `GET|POST|PATCH|DELETE http://localhost:${this.port}/api/personalization`,
          `GET http://localhost:${this.port}/api/config/supabase`,
          `POST http://localhost:${this.port}/api/dev/logs`,
          `WebSocket ws://localhost:${this.port}/ws`
        ]
      });
    });

    this.server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${this.port} is already in use`);
      } else {
        logger.error('Server error:', error);
      }
      process.exit(1);
    });

    return this.server;
  }

  stop() {
    return new Promise((resolve) => {
      // Shutdown WebSocket service
      if (this.webSocketService) {
        this.webSocketService.shutdown();
      }

      if (this.server) {
        this.server.close(resolve);
      } else {
        resolve();
      }
    });
  }

  getWebSocketService() {
    return this.webSocketService;
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new Server();
  server.start();
}

module.exports = Server;
