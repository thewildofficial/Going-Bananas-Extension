// Health Check Routes for Going Bananas T&C Analyzer
const express = require('express');
const GeminiService = require('../services/geminiService');
const CacheService = require('../services/cacheService');
const logger = require('../utils/logger');

const router = express.Router();

// Initialize services for health checks
const geminiService = new GeminiService();
const cacheService = new CacheService();

/**
 * GET /health
 * Basic health check endpoint
 */
router.get('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      checks: {}
    };

    // Basic system checks
    health.checks.memory = {
      status: 'ok',
      usage: process.memoryUsage(),
      free_memory: Math.round(require('os').freemem() / 1024 / 1024) + ' MB',
      total_memory: Math.round(require('os').totalmem() / 1024 / 1024) + ' MB'
    };

    health.checks.cpu = {
      status: 'ok',
      load_average: require('os').loadavg(),
      cpu_count: require('os').cpus().length
    };

    // Check if we can access environment variables
    health.checks.configuration = {
      status: process.env.GEMINI_API_KEY ? 'ok' : 'warning',
      has_api_key: !!process.env.GEMINI_API_KEY,
      mock_mode: process.env.MOCK_GEMINI_API === 'true'
    };

    res.json({
      success: true,
      health: health,
      response_time: Date.now() - startTime
    });

  } catch (error) {
    logger.error('Health check failed:', error.message);
    
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
      response_time: Date.now() - startTime
    });
  }
});

/**
 * GET /health/detailed
 * Comprehensive health check including external services
 */
router.get('/detailed', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const health = {
      status: 'unknown',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      checks: {}
    };

    // System health
    health.checks.system = {
      status: 'ok',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
        external: Math.round(process.memoryUsage().external / 1024 / 1024) + ' MB'
      },
      cpu: {
        load_average: require('os').loadavg(),
        uptime: require('os').uptime()
      },
      disk: await getDiskUsage()
    };

    // Gemini API health
    try {
      const geminiHealth = await geminiService.testConnection();
      health.checks.gemini_api = {
        status: geminiHealth.success ? 'ok' : 'error',
        connected: geminiHealth.connected,
        mock_mode: geminiHealth.mock || false,
        model: geminiHealth.model || 'unknown',
        error: geminiHealth.error || null
      };
    } catch (error) {
      health.checks.gemini_api = {
        status: 'error',
        error: error.message,
        connected: false
      };
    }

    // Cache service health
    try {
      const cacheHealth = await cacheService.healthCheck();
      health.checks.cache = {
        status: cacheHealth.status,
        type: cacheHealth.type,
        entries: cacheHealth.entries || 0,
        hit_rate: cacheHealth.hitRate || 0,
        error: cacheHealth.error || null
      };
    } catch (error) {
      health.checks.cache = {
        status: 'error',
        error: error.message,
        type: 'unknown'
      };
    }

    // Database/Storage health (if applicable)
    health.checks.storage = {
      status: 'ok',
      type: 'filesystem',
      writable: await checkWritePermissions()
    };

    // Overall status determination
    const checkStatuses = Object.values(health.checks).map(check => check.status);
    if (checkStatuses.includes('error')) {
      health.status = 'unhealthy';
    } else if (checkStatuses.includes('warning')) {
      health.status = 'degraded';
    } else {
      health.status = 'healthy';
    }

    // Add response time
    health.response_time = Date.now() - startTime;

    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json({
      success: health.status !== 'unhealthy',
      health: health
    });

  } catch (error) {
    logger.error('Detailed health check failed:', error.message);
    
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
      response_time: Date.now() - startTime
    });
  }
});

/**
 * GET /health/ready
 * Readiness probe for container orchestration
 */
router.get('/ready', async (req, res) => {
  try {
    // Check if all required services are ready
    const checks = await Promise.allSettled([
      checkGeminiReadiness(),
      checkCacheReadiness()
    ]);

    const allReady = checks.every(check => 
      check.status === 'fulfilled' && check.value === true
    );

    if (allReady) {
      res.json({
        ready: true,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        ready: false,
        checks: checks.map((check, index) => ({
          service: ['gemini', 'cache'][index],
          ready: check.status === 'fulfilled' && check.value === true,
          error: check.status === 'rejected' ? check.reason.message : null
        })),
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    res.status(503).json({
      ready: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /health/live
 * Liveness probe for container orchestration
 */
router.get('/live', (req, res) => {
  // Simple liveness check - if the process is running, we're alive
  res.json({
    alive: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /health/metrics
 * Basic metrics endpoint
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = {
      uptime_seconds: process.uptime(),
      memory_usage_bytes: process.memoryUsage().heapUsed,
      memory_total_bytes: process.memoryUsage().heapTotal,
      cpu_usage_percent: await getCpuUsage(),
      nodejs_version: process.version,
      environment: process.env.NODE_ENV || 'development',
      timestamp: Date.now()
    };

    // Add cache metrics if available
    try {
      const cacheStats = await cacheService.getStats();
      metrics.cache_entries = cacheStats.cacheSize || 0;
      metrics.cache_hit_rate = cacheStats.hitRate || 0;
    } catch (error) {
      // Cache metrics not available
    }

    res.json({
      success: true,
      metrics: metrics
    });

  } catch (error) {
    logger.error('Metrics collection failed:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to collect metrics'
    });
  }
});

// Helper functions
async function checkGeminiReadiness() {
  try {
    const result = await geminiService.testConnection();
    return result.success;
  } catch (error) {
    return false;
  }
}

async function checkCacheReadiness() {
  try {
    const result = await cacheService.healthCheck();
    return result.status === 'ok';
  } catch (error) {
    return false;
  }
}

async function getDiskUsage() {
  try {
    const fs = require('fs').promises;
    const stats = await fs.stat('.');
    return {
      status: 'ok',
      accessible: true
    };
  } catch (error) {
    return {
      status: 'error',
      accessible: false,
      error: error.message
    };
  }
}

async function checkWritePermissions() {
  try {
    const fs = require('fs').promises;
    const testFile = './health-check-test.tmp';
    
    await fs.writeFile(testFile, 'test');
    await fs.unlink(testFile);
    
    return true;
  } catch (error) {
    return false;
  }
}

async function getCpuUsage() {
  return new Promise((resolve) => {
    const startUsage = process.cpuUsage();
    
    setTimeout(() => {
      const endUsage = process.cpuUsage(startUsage);
      const totalUsage = endUsage.user + endUsage.system;
      const percentage = (totalUsage / 1000000) * 100; // Convert to percentage
      
      resolve(Math.round(percentage * 100) / 100);
    }, 100);
  });
}

module.exports = router;
