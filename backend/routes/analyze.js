// Analysis Routes for Going Bananas T&C Analyzer
const express = require('express');
const Joi = require('joi');
const GeminiService = require('../services/geminiService');
const AnalysisService = require('../services/analysisService');
const CacheService = require('../services/cacheService');
const logger = require('../utils/logger');
const { processText } = require('../utils/textProcessor');

const router = express.Router();

// Initialize services
const geminiService = new GeminiService();
const analysisService = new AnalysisService(geminiService);
const cacheService = new CacheService();

// Request validation schema
const analyzeSchema = Joi.object({
  text: Joi.string().min(50).max(50000).required()
    .messages({
      'string.min': 'Text must be at least 50 characters long',
      'string.max': 'Text must not exceed 50,000 characters',
      'any.required': 'Text is required for analysis'
    }),
  url: Joi.string().uri().optional(),
  options: Joi.object({
    language: Joi.string().valid('en', 'es', 'fr', 'de', 'it', 'pt').default('en'),
    detail_level: Joi.string().valid('basic', 'standard', 'comprehensive').default('standard'),
    cache: Joi.boolean().default(true),
    categories: Joi.array().items(
      Joi.string().valid('privacy', 'liability', 'termination', 'payment')
    ).default(['privacy', 'liability', 'termination', 'payment'])
  }).default({})
});

/**
 * POST /analyze
 * Analyze terms and conditions text
 */
router.post('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Validate request
    const { error, value: validatedData } = analyzeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    const { text, url, options } = validatedData;
    
    logger.info('Analysis request received:', {
      textLength: text.length,
      url: url || 'not provided',
      options: options,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Check cache first if enabled
    let cacheKey = null;
    if (options.cache) {
      cacheKey = cacheService.generateKey(text, options);
      const cachedResult = await cacheService.get(cacheKey);
      
      if (cachedResult) {
        logger.info('Returning cached analysis', { cacheKey });
        return res.json({
          success: true,
          analysis: {
            ...cachedResult,
            cached: true,
            cache_timestamp: cachedResult.analysis_time
          },
          metadata: {
            processing_time: Date.now() - startTime,
            cached: true
          }
        });
      }
    }

    // Preprocess text
    const processedText = processText(text);
    if (!processedText || processedText.length < 50) {
      return res.status(400).json({
        success: false,
        error: 'Text preprocessing resulted in insufficient content',
        details: 'The provided text may be too short or contain insufficient meaningful content'
      });
    }

    // Perform analysis
    const analysis = await analysisService.analyzeText(processedText, {
      ...options,
      url: url,
      originalLength: text.length,
      processedLength: processedText.length
    });

    // Cache result if enabled
    if (options.cache && cacheKey) {
      await cacheService.set(cacheKey, analysis);
    }

    // Log successful analysis
    logger.info('Analysis completed successfully:', {
      textLength: text.length,
      riskScore: analysis.risk_score,
      riskLevel: analysis.risk_level,
      confidence: analysis.confidence,
      processingTime: Date.now() - startTime,
      cached: false
    });

    // Return successful response
    res.json({
      success: true,
      analysis: analysis,
      metadata: {
        processing_time: Date.now() - startTime,
        text_length: text.length,
        processed_length: processedText.length,
        cached: false,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.error('Analysis failed:', {
      error: error.message,
      stack: error.stack,
      processingTime: processingTime,
      textLength: req.body?.text?.length || 0,
      ip: req.ip
    });

    // Determine error type and response
    let statusCode = 500;
    let errorMessage = 'Internal server error during analysis';

    if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
      statusCode = 408;
      errorMessage = 'Analysis request timed out. Please try with shorter text or try again later.';
    } else if (error.message.includes('rate limit') || error.message.includes('quota')) {
      statusCode = 429;
      errorMessage = 'API rate limit exceeded. Please try again later.';
    } else if (error.message.includes('validation') || error.message.includes('invalid')) {
      statusCode = 400;
      errorMessage = 'Invalid request data';
    } else if (error.message.includes('service unavailable') || error.message.includes('connection')) {
      statusCode = 503;
      errorMessage = 'Analysis service temporarily unavailable';
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      metadata: {
        processing_time: processingTime,
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && {
          debug_error: error.message
        })
      }
    });
  }
});

/**
 * POST /batch
 * Analyze multiple terms and conditions texts in batch
 */
router.post('/batch', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const batchSchema = Joi.object({
      requests: Joi.array().items(analyzeSchema).min(1).max(10).required()
        .messages({
          'array.min': 'At least one analysis request is required',
          'array.max': 'Maximum 10 requests allowed per batch'
        })
    });

    const { error, value: validatedData } = batchSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Batch validation failed',
        details: error.details
      });
    }

    const { requests } = validatedData;
    
    logger.info('Batch analysis request received:', {
      requestCount: requests.length,
      ip: req.ip
    });

    // Process all requests in parallel
    const results = await Promise.allSettled(
      requests.map(async (request, index) => {
        try {
          const processedText = processText(request.text);
          const analysis = await analysisService.analyzeText(processedText, request.options);
          
          return {
            success: true,
            index: index,
            analysis: analysis
          };
        } catch (error) {
          return {
            success: false,
            index: index,
            error: error.message
          };
        }
      })
    );

    // Format results
    const formattedResults = results.map((result, index) => ({
      index: index,
      ...(result.status === 'fulfilled' ? result.value : {
        success: false,
        error: result.reason?.message || 'Unknown error'
      })
    }));

    const successCount = formattedResults.filter(r => r.success).length;
    
    logger.info('Batch analysis completed:', {
      total: requests.length,
      successful: successCount,
      failed: requests.length - successCount,
      processingTime: Date.now() - startTime
    });

    res.json({
      success: true,
      results: formattedResults,
      metadata: {
        total_requests: requests.length,
        successful_analyses: successCount,
        failed_analyses: requests.length - successCount,
        processing_time: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Batch analysis failed:', {
      error: error.message,
      stack: error.stack,
      processingTime: Date.now() - startTime
    });

    res.status(500).json({
      success: false,
      error: 'Batch analysis failed',
      metadata: {
        processing_time: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /test
 * Test the analysis service
 */
router.get('/test', async (req, res) => {
  try {
    const testText = `
      Terms of Service
      
      By using our service, you agree to these terms. We may collect your personal information
      including email, location data, and browsing patterns. This information may be shared
      with third-party partners for marketing purposes. We are not liable for any damages
      resulting from use of our service. We may terminate your account at any time without notice.
      All disputes will be resolved through binding arbitration.
    `;

    const analysis = await analysisService.analyzeText(testText, {
      detail_level: 'standard',
      language: 'en'
    });

    res.json({
      success: true,
      test: true,
      analysis: analysis,
      message: 'Analysis service test completed successfully'
    });

  } catch (error) {
    logger.error('Analysis test failed:', error.message);
    
    res.status(500).json({
      success: false,
      test: true,
      error: error.message,
      message: 'Analysis service test failed'
    });
  }
});

/**
 * GET /stats
 * Get analysis statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await cacheService.getStats();
    
    res.json({
      success: true,
      stats: {
        cache_entries: stats.cacheSize || 0,
        cache_hit_rate: stats.hitRate || 0,
        total_analyses: stats.totalAnalyses || 0,
        avg_processing_time: stats.avgProcessingTime || 0,
        service_uptime: process.uptime(),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to get stats:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics'
    });
  }
});

module.exports = router;
