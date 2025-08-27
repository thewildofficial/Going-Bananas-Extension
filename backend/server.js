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
          websocket: 'ws://localhost:3000/ws'
        },
        documentation: 'https://github.com/goingbananas/extension/blob/main/docs/API.md'
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        available_endpoints: [
          'GET /api/health',
          'POST /api/analyze',
          'GET|POST|PATCH|DELETE /api/personalization'
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
