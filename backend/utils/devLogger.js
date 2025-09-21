/**
 * Development Logger for Going Bananas Extension
 * 
 * This logger aggregates logs from all contexts (extension background, popup, 
 * content scripts, login pages, and backend) into centralized log files for 
 * easier debugging and analysis.
 * 
 * @fileoverview Centralized development logging system
 * @author Aban Hasan (thewildofficial)
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

class DevLogger {
  constructor(context) {
    this.context = context;
    this.logDir = path.join(__dirname, '..', 'logs');
    this.logFile = path.join(this.logDir, 'extension-logs.jsonl');
    
    // Ensure log directory exists
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Log an info message
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   */
  info(message, data = {}) {
    this._log('info', message, data);
  }

  /**
   * Log an error message
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   */
  error(message, data = {}) {
    this._log('error', message, data);
  }

  /**
   * Log a warning message
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   */
  warn(message, data = {}) {
    this._log('warn', message, data);
  }

  /**
   * Log a debug message
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   */
  debug(message, data = {}) {
    this._log('debug', message, data);
  }

  /**
   * Log a general message (equivalent to info)
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   */
  log(message, data = {}) {
    this._log('info', message, data);
  }

  /**
   * Internal logging method
   * @private
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  _log(level, message, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      context: this.context,
      level: level,
      message: message,
      data: data
    };

    // Write to JSONL file
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(this.logFile, logLine);

    // Also output to console in development
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') {
      const consoleMessage = `[${this.context}] ${level.toUpperCase()}: ${message}`;
      if (Object.keys(data).length > 0) {
        console.log(consoleMessage, data);
      } else {
        console.log(consoleMessage);
      }
    }
  }
}

/**
 * Create a development logger instance
 * @param {string} context - Context name for the logger
 * @returns {DevLogger} Logger instance
 */
function createDevLogger(context) {
  return new DevLogger(context);
}

module.exports = {
  DevLogger,
  createDevLogger
};