// Analysis Routes for Going Bananas T&C Analyzer
const express = require('express');
const Joi = require('joi');
const GeminiService = require('../services/geminiService');
const AnalysisService = require('../services/analysisService');
const CacheService = require('../services/cacheService');
const PersonalizationService = require('../services/personalizationService');
const logger = require('../utils/logger');
const { processText } = require('../utils/textProcessor');

const router = express.Router();

// Initialize services
const geminiService = new GeminiService();
const analysisService = new AnalysisService(geminiService);
const cacheService = new CacheService();
const personalizationService = new PersonalizationService();

// Request validation schema
const analyzeSchema = Joi.object({
  text: Joi.string().min(50).max(50000).required()
    .messages({
      'string.min': 'Text must be at least 50 characters long',
      'string.max': 'Text must not exceed 50,000 characters',
      'any.required': 'Text is required for analysis'
    }),
  url: Joi.string().uri().optional(),
  userId: Joi.string().uuid().optional(), // For personalization
  sessionId: Joi.string().optional(), // For streaming analysis
  options: Joi.object({
    language: Joi.string().valid('en', 'es', 'fr', 'de', 'it', 'pt').default('en'),
    detail_level: Joi.string().valid('basic', 'standard', 'comprehensive').default('standard'),
    cache: Joi.boolean().default(true),
    categories: Joi.array().items(
      Joi.string().valid('privacy', 'liability', 'termination', 'payment')
    ).default(['privacy', 'liability', 'termination', 'payment']),
    // New Gemini 2.5 features
    multiPass: Joi.boolean().default(false), // Enable multi-pass analysis
    streaming: Joi.boolean().default(false), // Enable streaming analysis
    contextAware: Joi.boolean().default(false), // Use personalization context
    // Advanced options
    documentType: Joi.string().valid('privacy_policy', 'terms_of_service', 'user_agreement', 'eula', 'cookie_policy').optional(),
    jurisdiction: Joi.string().optional()
  }).default({})
}).unknown(true);

/**
 * POST /analyze
 * Analyze terms and conditions text
 */
router.post('/', async (req, res) => {
  logger.debug('Request Body:', req.body);
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

        const { text, url, userId, sessionId, options } = validatedData;

    logger.debug('🔍 ANALYSIS REQUEST RECEIVED:', {
      textLength: text.length,
      multiPass: options.multiPass,
      contextAware: options.contextAware,
      options: options
    });

    logger.info('Analysis request received:', {
      textLength: text.length,
      url: url || 'not provided',
      userId: userId || 'not provided',
      sessionId: sessionId || 'not provided',
      options: options,
      multiPass: options.multiPass,
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

    // Get user personalization profile if available and requested
    let personalizationContext = null;
    if (options.contextAware && userId) {
      try {
        personalizationContext = await personalizationService.getUserProfile(userId);
        logger.info('Personalization context loaded:', {
          userId,
          hasProfile: !!personalizationContext
        });
      } catch (error) {
        logger.warn('Failed to load personalization context:', error.message);
      }
    }

    // Enhanced analysis options
    const enhancedOptions = {
      ...options,
      url: url,
      originalLength: text.length,
      processedLength: processedText.length,
      personalizationContext: personalizationContext,
      // Enable advanced features for Gemini 2.5
      multiPass: options.multiPass || false,
      streaming: options.streaming || false
    };

    // Handle streaming analysis
    if (options.streaming && sessionId) {
      return this.handleStreamingAnalysis(sessionId, processedText, enhancedOptions, res, startTime, cacheKey, req);
    }

    // Perform analysis (single-pass or multi-pass)
    const analysis = await analysisService.analyzeText(processedText, enhancedOptions);

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
      cached: false,
      multiPass: analysis.multi_pass_analysis || false,
      passesCompleted: analysis.passes_completed || 1
    });

    // Debug: Check if major_clauses is present
    logger.debug('🔍 Analysis object has major_clauses:', !!analysis.major_clauses);
    if (analysis.major_clauses) {
      logger.debug('📊 Major clauses count:', analysis.major_clauses.clauses?.length || 0);
    }

    // Return successful response
    res.json({
      success: true,
      analysis: analysis,
      metadata: {
        processing_time: Date.now() - startTime,
        text_length: text.length,
        processed_length: processedText.length,
        cached: false,
        timestamp: new Date().toISOString(),
        features: {
          multiPass: analysis.multi_pass_analysis || false,
          contextAware: !!personalizationContext,
          streaming: false
        }
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
 * POST /selected-text
 * Analyze selected text from terms and conditions
 */
router.post('/selected-text', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const selectedTextSchema = Joi.object({
      text: Joi.string().min(10).max(5000).required()
        .messages({
          'string.min': 'Selected text must be at least 10 characters long',
          'string.max': 'Selected text must not exceed 5,000 characters',
          'any.required': 'Selected text is required for analysis'
        }),
      url: Joi.string().uri().optional(),
      context: Joi.string().optional(), // Additional context about the selection
      options: Joi.object({
        language: Joi.string().valid('en', 'es', 'fr', 'de', 'it', 'pt').default('en'),
        detail_level: Joi.string().valid('basic', 'standard', 'comprehensive').default('comprehensive'),
        focus_areas: Joi.array().items(
          Joi.string().valid('data_usage', 'user_obligations', 'service_limitations', 'privacy_practices', 'liability_clauses', 'termination_terms')
        ).default(['data_usage', 'user_obligations', 'service_limitations', 'privacy_practices']),
        include_recommendations: Joi.boolean().default(true),
        risk_assessment: Joi.boolean().default(true)
      }).default({})
    });

    const { error, value: validatedData } = selectedTextSchema.validate(req.body);
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

    const { text, url, context, options } = validatedData;

    logger.info('Selected text analysis request received:', {
      textLength: text.length,
      url: url || 'not provided',
      context: context || 'not provided',
      options: options,
      ip: req.ip
    });

    // Create specialized analysis options for selected text
    const selectedTextOptions = {
      ...options,
      url: url,
      originalLength: text.length,
      selectedTextAnalysis: true,
      context: context,
      // Enhanced analysis for selected text
      detail_level: 'comprehensive',
      categories: ['privacy', 'data-collection', 'user-rights', 'terms-of-service', 'liability', 'termination'],
      focus_areas: options.focus_areas || ['data_usage', 'user_obligations', 'service_limitations', 'privacy_practices'],
      include_recommendations: options.include_recommendations !== false,
      risk_assessment: options.risk_assessment !== false,
      output_format: 'structured'
    };

    // Perform analysis with specialized prompt for selected text
    const analysis = await analysisService.analyzeSelectedText(text, selectedTextOptions);

    // Log successful analysis
    logger.info('Selected text analysis completed successfully:', {
      textLength: text.length,
      riskScore: analysis.risk_score,
      riskLevel: analysis.risk_level,
      confidence: analysis.confidence,
      processingTime: Date.now() - startTime
    });

    // Return successful response
    res.json({
      success: true,
      analysis: analysis,
      metadata: {
        processing_time: Date.now() - startTime,
        text_length: text.length,
        analysis_type: 'selected_text',
        timestamp: new Date().toISOString(),
        features: {
          selectedTextAnalysis: true,
          comprehensive: true,
          contextual: !!context
        }
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.error('Selected text analysis failed:', {
      error: error.message,
      stack: error.stack,
      processingTime: processingTime,
      textLength: req.body?.text?.length || 0,
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      error: 'Selected text analysis failed',
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

// Streaming analysis handler
handleStreamingAnalysis = async (sessionId, text, options, res, startTime, cacheKey, req) => {
  try {
    // Get WebSocket service from the request app locals
    let webSocketService = null;

    if (req && req.app.locals.webSocketService) {
      webSocketService = req.app.locals.webSocketService;
    }

    if (!webSocketService) {
      return res.status(503).json({
        success: false,
        error: 'Streaming service unavailable'
      });
    }

    // Check if session exists and is valid
    const session = webSocketService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Streaming session not found'
      });
    }

    // Start streaming analysis
    res.json({
      success: true,
      message: 'Streaming analysis started',
      sessionId: sessionId,
      metadata: {
        processing_time: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        features: {
          streaming: true,
          multiPass: options.multiPass || false,
          contextAware: !!options.personalizationContext
        }
      }
    });

    // Perform analysis with progress callbacks
    const analysisOptions = {
      ...options,
      onProgress: (progress) => {
        webSocketService.sendAnalysisProgress(sessionId, progress);
      }
    };

    const analysis = await analysisService.analyzeText(text, analysisOptions);

    // Cache result if enabled
    if (options.cache && cacheKey) {
      await cacheService.set(cacheKey, analysis);
    }

    // Send final result via WebSocket
    webSocketService.sendAnalysisResult(sessionId, analysis);

    logger.info('Streaming analysis completed:', {
      sessionId,
      riskScore: analysis.risk_score,
      processingTime: Date.now() - startTime
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('Streaming analysis failed:', {
      sessionId,
      error: error.message,
      processingTime
    });

    // Send error via WebSocket if available
    try {
      if (req && req.app.locals.webSocketService) {
        req.app.locals.webSocketService.sendAnalysisError(sessionId, {
          message: error.message,
          processingTime
        });
      }
    } catch (wsError) {
      logger.error('Failed to send WebSocket error:', wsError.message);
    }

    // Also send HTTP error response if connection still open
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Streaming analysis failed',
        sessionId: sessionId,
        metadata: {
          processing_time: processingTime,
          timestamp: new Date().toISOString()
        }
      });
    }
  }
};

/**
 * GET /websocket-info
 * Get WebSocket connection information
 */
router.get('/websocket-info', (req, res) => {
  try {
    // Get WebSocket service from the running server instance
    let webSocketService = null;

    // Try to get the service from the app locals (set by server)
    if (req.app.locals.webSocketService) {
      webSocketService = req.app.locals.webSocketService;
    }

    // If not available, create a basic response
    if (!webSocketService) {
      const info = {
        connectedClients: 0,
        activeSessions: 0,
        websocketUrl: `ws://localhost:${process.env.PORT || 3000}/ws`,
        supportedMessageTypes: [
          'start_analysis',
          'cancel_analysis',
          'ping',
          'connection_established',
          'analysis_started',
          'analysis_progress',
          'analysis_completed',
          'analysis_error',
          'pong'
        ],
        status: 'service_not_initialized'
      };

      return res.json({
        success: true,
        websocket: info,
        timestamp: new Date().toISOString()
      });
    }

    const info = {
      connectedClients: webSocketService.getConnectedClientsCount(),
      activeSessions: webSocketService.getActiveSessions().length,
      websocketUrl: `ws://localhost:${process.env.PORT || 3000}/ws`,
      supportedMessageTypes: [
        'start_analysis',
        'cancel_analysis',
        'ping',
        'connection_established',
        'analysis_started',
        'analysis_progress',
        'analysis_completed',
        'analysis_error',
        'pong'
      ],
      status: 'active'
    };

    res.json({
      success: true,
      websocket: info,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get WebSocket info:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve WebSocket information'
    });
  }
});

/**
 * POST /streaming/start
 * Start a streaming analysis session
 */
router.post('/streaming/start', async (req, res) => {
  const startTime = Date.now();

  try {
    let webSocketService = null;

    if (req.app.locals.webSocketService) {
      webSocketService = req.app.locals.webSocketService;
    }

    if (!webSocketService) {
      return res.status(503).json({
        success: false,
        error: 'Streaming service unavailable'
      });
    }

    const streamingSchema = Joi.object({
      text: Joi.string().min(50).max(50000).required(),
      url: Joi.string().uri().optional(),
      userId: Joi.string().uuid().optional(),
      options: Joi.object({
        language: Joi.string().valid('en', 'es', 'fr', 'de', 'it', 'pt').default('en'),
        detail_level: Joi.string().valid('basic', 'standard', 'comprehensive').default('standard'),
        categories: Joi.array().items(
          Joi.string().valid('privacy', 'liability', 'termination', 'payment')
        ).default(['privacy', 'liability', 'termination', 'payment']),
        multiPass: Joi.boolean().default(true), // Enable multi-pass by default for streaming
        contextAware: Joi.boolean().default(false)
      }).default({})
    });

    const { error, value: validatedData } = streamingSchema.validate(req.body);
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

    const { text, url, userId, options } = validatedData;

    // Generate session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Check if WebSocket connection exists (optional - session can be started without active WS)
    const sessionInfo = webSocketService.getSession(sessionId);

    logger.info('Streaming analysis session initiated:', {
      sessionId,
      textLength: text.length,
      hasWebSocketConnection: !!sessionInfo,
      ip: req.ip
    });

    res.json({
      success: true,
      sessionId: sessionId,
      message: 'Streaming analysis session created',
      websocketRequired: true,
      websocketUrl: `ws://localhost:${process.env.PORT || 3000}/ws`,
      nextSteps: [
        'Connect to WebSocket at the provided URL',
        'Send start_analysis message with the sessionId',
        'Listen for analysis_progress and analysis_completed messages'
      ],
      metadata: {
        processing_time: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        features: {
          streaming: true,
          multiPass: options.multiPass,
          contextAware: options.contextAware
        }
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('Failed to start streaming session:', {
      error: error.message,
      processingTime
    });

    res.status(500).json({
      success: false,
      error: 'Failed to start streaming session',
      metadata: {
        processing_time: processingTime,
        timestamp: new Date().toISOString()
      }
    });
  }
});

module.exports = router;
