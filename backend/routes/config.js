const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

// Supabase configuration endpoint
// Returns public Supabase configuration (URL and anonymous key) for extension use
router.get('/supabase', (req, res) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      logger.error('Supabase configuration missing', {
        hasUrl: !!supabaseUrl,
        hasAnonKey: !!supabaseAnonKey
      });
      
      return res.status(500).json({
        success: false,
        error: 'Supabase configuration not found',
        message: 'Please configure SUPABASE_URL and SUPABASE_ANON_KEY environment variables'
      });
    }

    logger.info('Supabase configuration requested', {
      url: supabaseUrl,
      anonKeyPrefix: supabaseAnonKey.substring(0, 20) + '...'
    });

    // Return Supabase configuration for extension use
    // These are public credentials (URL and anonymous key) that are safe to expose
    res.json({
      success: true,
      config: {
        url: supabaseUrl,
        anonKey: supabaseAnonKey
      }
    });
  } catch (error) {
    logger.error('Error providing Supabase configuration:', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve Supabase configuration',
      message: error.message
    });
  }
});

// Development logs endpoint
router.post('/dev/logs', async (req, res) => {
  try {
    const { source, logs } = req.body;

    if (!source || !logs || !Array.isArray(logs)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body. Expected { source: string, logs: LogEntry[] }'
      });
    }

    // Ensure logs directory exists
    const logsDir = path.join(__dirname, '../logs/extension');
    try {
      await fs.mkdir(logsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore error
    }

    // Append logs to file
    const logFile = path.join(logsDir, 'extension-logs.jsonl');
    const logEntries = logs.map(log => JSON.stringify({
      ...log,
      source,
      receivedAt: new Date().toISOString()
    })).join('\n') + '\n';

    await fs.appendFile(logFile, logEntries);

    logger.debug('Received development logs', {
      source,
      logCount: logs.length,
      contexts: [...new Set(logs.map(l => l.context))]
    });

    res.json({
      success: true,
      message: `Received ${logs.length} log entries from ${source}`
    });
  } catch (error) {
    logger.error('Error processing development logs:', {
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Failed to process logs',
      message: error.message
    });
  }
});

module.exports = router;