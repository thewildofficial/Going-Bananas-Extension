// Cache Service for Going Bananas T&C Analyzer
const crypto = require('crypto');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.cacheType = 'memory'; // Default to in-memory cache
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
    
    // TTL in seconds (default 24 hours)
    this.defaultTTL = parseInt(process.env.REDIS_TTL) || 86400;
    
    // Initialize Redis if available
    // this.initializeRedis();
    
    // Cleanup interval for memory cache
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 300000); // Clean up every 5 minutes
  }

  async initializeRedis() {
    try {
      if (process.env.REDIS_URL && process.env.ENABLE_CACHING === 'true') {
        const redis = require('redis');
        this.redisClient = redis.createClient({
          url: process.env.REDIS_URL,
          password: process.env.REDIS_PASSWORD || undefined,
          socket: {
            reconnectStrategy: (retries) => {
              if (retries > 3) {
                logger.error('Redis connection failed after 3 retries, falling back to memory cache');
                return false;
              }
              return Math.min(retries * 100, 3000);
            }
          }
        });

        this.redisClient.on('error', (error) => {
          logger.error('Redis error:', error.message);
          this.stats.errors++;
        });

        this.redisClient.on('connect', () => {
          logger.info('Redis connected successfully');
          this.cacheType = 'redis';
        });

        await this.redisClient.connect();
      }
    } catch (error) {
      logger.warn('Failed to initialize Redis, using memory cache:', error.message);
      this.cacheType = 'memory';
    }
  }

  generateKey(text, options = {}) {
    // Create a consistent hash key from text and options
    const contentToHash = JSON.stringify({
      text: text,
      language: options.language || 'en',
      detail_level: options.detail_level || 'standard',
      categories: options.categories || ['privacy', 'liability', 'termination', 'payment']
    });

    return crypto.createHash('sha256').update(contentToHash).digest('hex');
  }

  async get(key) {
    try {
      let value = null;
      
      if (this.cacheType === 'redis' && this.redisClient) {
        const redisValue = await this.redisClient.get(key);
        if (redisValue) {
          value = JSON.parse(redisValue);
        }
      } else {
        // Memory cache
        const cached = this.cache.get(key);
        if (cached && cached.expires > Date.now()) {
          value = cached.data;
        } else if (cached) {
          // Expired entry
          this.cache.delete(key);
        }
      }

      if (value) {
        this.stats.hits++;
        logger.debug('Cache hit:', { key: key.substring(0, 8) + '...' });
        return value;
      } else {
        this.stats.misses++;
        logger.debug('Cache miss:', { key: key.substring(0, 8) + '...' });
        return null;
      }

    } catch (error) {
      logger.error('Cache get error:', error.message);
      this.stats.errors++;
      return null;
    }
  }

  async set(key, value, ttl = null) {
    try {
      const actualTTL = ttl || this.defaultTTL;
      
      if (this.cacheType === 'redis' && this.redisClient) {
        await this.redisClient.setEx(key, actualTTL, JSON.stringify(value));
      } else {
        // Memory cache
        this.cache.set(key, {
          data: value,
          expires: Date.now() + (actualTTL * 1000)
        });
      }

      this.stats.sets++;
      logger.debug('Cache set:', { 
        key: key.substring(0, 8) + '...',
        ttl: actualTTL,
        cacheType: this.cacheType
      });

    } catch (error) {
      logger.error('Cache set error:', error.message);
      this.stats.errors++;
    }
  }

  async delete(key) {
    try {
      if (this.cacheType === 'redis' && this.redisClient) {
        await this.redisClient.del(key);
      } else {
        this.cache.delete(key);
      }

      this.stats.deletes++;
      logger.debug('Cache delete:', { key: key.substring(0, 8) + '...' });

    } catch (error) {
      logger.error('Cache delete error:', error.message);
      this.stats.errors++;
    }
  }

  async clear() {
    try {
      if (this.cacheType === 'redis' && this.redisClient) {
        await this.redisClient.flushDb();
      } else {
        this.cache.clear();
      }

      logger.info('Cache cleared');

    } catch (error) {
      logger.error('Cache clear error:', error.message);
      this.stats.errors++;
    }
  }

  async getStats() {
    try {
      let size = 0;
      
      if (this.cacheType === 'redis' && this.redisClient) {
        size = await this.redisClient.dbSize();
      } else {
        size = this.cache.size;
      }

      const totalRequests = this.stats.hits + this.stats.misses;
      const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) : 0;

      return {
        cacheType: this.cacheType,
        cacheSize: size,
        hitRate: Math.round(hitRate * 10000) / 100, // Percentage with 2 decimal places
        totalHits: this.stats.hits,
        totalMisses: this.stats.misses,
        totalSets: this.stats.sets,
        totalDeletes: this.stats.deletes,
        totalErrors: this.stats.errors,
        totalRequests: totalRequests
      };

    } catch (error) {
      logger.error('Cache stats error:', error.message);
      return {
        cacheType: this.cacheType,
        cacheSize: 0,
        hitRate: 0,
        error: error.message
      };
    }
  }

  async healthCheck() {
    try {
      const testKey = 'health_check_' + Date.now();
      const testValue = { test: true, timestamp: Date.now() };

      // Test set operation
      await this.set(testKey, testValue, 60); // 1 minute TTL

      // Test get operation
      const retrieved = await this.get(testKey);

      // Test delete operation
      await this.delete(testKey);

      if (retrieved && retrieved.test === true) {
        return {
          status: 'ok',
          type: this.cacheType,
          connected: this.cacheType === 'redis' ? !!this.redisClient?.isReady : true
        };
      } else {
        throw new Error('Cache health check failed - data integrity issue');
      }

    } catch (error) {
      logger.error('Cache health check failed:', error.message);
      return {
        status: 'error',
        type: this.cacheType,
        error: error.message,
        connected: false
      };
    }
  }

  cleanup() {
    if (this.cacheType === 'memory') {
      const now = Date.now();
      let expiredCount = 0;

      for (const [key, value] of this.cache.entries()) {
        if (value.expires <= now) {
          this.cache.delete(key);
          expiredCount++;
        }
      }

      if (expiredCount > 0) {
        logger.debug('Memory cache cleanup:', { 
          expired: expiredCount,
          remaining: this.cache.size 
        });
      }
    }
  }

  // Utility method to get cache entries for debugging
  async getAllKeys() {
    try {
      if (this.cacheType === 'redis' && this.redisClient) {
        return await this.redisClient.keys('*');
      } else {
        return Array.from(this.cache.keys());
      }
    } catch (error) {
      logger.error('Failed to get cache keys:', error.message);
      return [];
    }
  }

  // Method to warm up cache with common analyses
  async warmUp(commonAnalyses = []) {
    logger.info('Starting cache warm-up', { count: commonAnalyses.length });

    for (const analysis of commonAnalyses) {
      try {
        const key = this.generateKey(analysis.text, analysis.options);
        await this.set(key, analysis.result);
      } catch (error) {
        logger.error('Cache warm-up error for analysis:', error.message);
      }
    }

    logger.info('Cache warm-up completed');
  }

  // Graceful shutdown
  async shutdown() {
    try {
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }

      if (this.redisClient) {
        await this.redisClient.quit();
        logger.info('Redis connection closed');
      }

      logger.info('Cache service shutdown completed');
    } catch (error) {
      logger.error('Cache shutdown error:', error.message);
    }
  }
}

module.exports = CacheService;
