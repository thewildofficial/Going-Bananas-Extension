// WebSocket Service for Real-time Analysis Updates
const WebSocket = require('ws');
const logger = require('../utils/logger');

class WebSocketService {
  constructor(server) {
    this.wss = null;
    this.clients = new Map(); // Map of clientId -> WebSocket connection
    this.analysisSessions = new Map(); // Map of sessionId -> analysis data
    this.server = server;

    this.init();
  }

  init() {
    this.wss = new WebSocket.Server({
      server: this.server,
      path: '/ws',
      perMessageDeflate: false
    });

    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      const clientInfo = {
        id: clientId,
        ip: req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        connectedAt: new Date().toISOString()
      };

      this.clients.set(clientId, ws);
      logger.info('WebSocket client connected', clientInfo);

      // Send welcome message
      this.sendToClient(clientId, {
        type: 'connection_established',
        clientId: clientId,
        timestamp: new Date().toISOString()
      });

      // Handle incoming messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(clientId, message);
        } catch (error) {
          logger.error('Failed to parse WebSocket message:', error.message);
          this.sendToClient(clientId, {
            type: 'error',
            message: 'Invalid message format',
            timestamp: new Date().toISOString()
          });
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        logger.info('WebSocket client disconnected', { clientId });
        this.clients.delete(clientId);
        this.cleanupClientSessions(clientId);
      });

      // Handle errors
      ws.on('error', (error) => {
        logger.error('WebSocket error:', {
          clientId,
          error: error.message
        });
      });
    });

    logger.info('WebSocket service initialized');
  }

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  handleMessage(clientId, message) {
    logger.debug('Received WebSocket message:', {
      clientId,
      type: message.type,
      sessionId: message.sessionId
    });

    switch (message.type) {
      case 'start_analysis':
        this.handleStartAnalysis(clientId, message);
        break;

      case 'cancel_analysis':
        this.handleCancelAnalysis(clientId, message);
        break;

      case 'ping':
        this.sendToClient(clientId, {
          type: 'pong',
          timestamp: new Date().toISOString()
        });
        break;

      default:
        logger.warn('Unknown message type:', message.type);
        this.sendToClient(clientId, {
          type: 'error',
          message: `Unknown message type: ${message.type}`,
          timestamp: new Date().toISOString()
        });
    }
  }

  handleStartAnalysis(clientId, message) {
    const { sessionId, text, options } = message;

    if (!sessionId || !text) {
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Missing required fields: sessionId and text',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Store session info
    this.analysisSessions.set(sessionId, {
      clientId,
      status: 'starting',
      startTime: Date.now(),
      text: text,
      options: options || {}
    });

    this.sendToClient(clientId, {
      type: 'analysis_started',
      sessionId: sessionId,
      message: 'Analysis session started',
      timestamp: new Date().toISOString()
    });

    logger.info('Analysis session started via WebSocket', {
      sessionId,
      clientId,
      textLength: text.length
    });
  }

  handleCancelAnalysis(clientId, message) {
    const { sessionId } = message;

    if (!sessionId) {
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Missing sessionId for cancellation',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const session = this.analysisSessions.get(sessionId);
    if (session && session.clientId === clientId) {
      session.status = 'cancelled';
      this.sendToClient(clientId, {
        type: 'analysis_cancelled',
        sessionId: sessionId,
        message: 'Analysis session cancelled',
        timestamp: new Date().toISOString()
      });

      logger.info('Analysis session cancelled', { sessionId, clientId });
    } else {
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Session not found or access denied',
        timestamp: new Date().toISOString()
      });
    }
  }

  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (client && client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(message));
        return true;
      } catch (error) {
        logger.error('Failed to send message to client:', {
          clientId,
          error: error.message
        });
        return false;
      }
    }
    return false;
  }

  broadcastToSession(sessionId, message) {
    const session = this.analysisSessions.get(sessionId);
    if (session) {
      return this.sendToClient(session.clientId, message);
    }
    return false;
  }

  sendAnalysisProgress(sessionId, progress) {
    const message = {
      type: 'analysis_progress',
      sessionId: sessionId,
      progress: progress,
      timestamp: new Date().toISOString()
    };

    return this.broadcastToSession(sessionId, message);
  }

  sendAnalysisResult(sessionId, result) {
    const session = this.analysisSessions.get(sessionId);
    if (session) {
      session.status = 'completed';
      session.endTime = Date.now();
      session.result = result;

      const message = {
        type: 'analysis_completed',
        sessionId: sessionId,
        result: result,
        duration: session.endTime - session.startTime,
        timestamp: new Date().toISOString()
      };

      this.broadcastToSession(sessionId, message);
      logger.info('Analysis result sent via WebSocket', {
        sessionId,
        duration: session.endTime - session.startTime
      });
    }
  }

  sendAnalysisError(sessionId, error) {
    const session = this.analysisSessions.get(sessionId);
    if (session) {
      session.status = 'error';
      session.endTime = Date.now();
      session.error = error;

      const message = {
        type: 'analysis_error',
        sessionId: sessionId,
        error: error,
        duration: session.endTime - session.startTime,
        timestamp: new Date().toISOString()
      };

      this.broadcastToSession(sessionId, message);
      logger.error('Analysis error sent via WebSocket', {
        sessionId,
        error: error.message,
        duration: session.endTime - session.startTime
      });
    }
  }

  cleanupClientSessions(clientId) {
    // Clean up any sessions associated with this client
    for (const [sessionId, session] of this.analysisSessions.entries()) {
      if (session.clientId === clientId) {
        session.status = 'disconnected';
        this.analysisSessions.delete(sessionId);
      }
    }
  }

  getSession(sessionId) {
    return this.analysisSessions.get(sessionId);
  }

  getActiveSessions() {
    return Array.from(this.analysisSessions.entries()).map(([id, session]) => ({
      id,
      clientId: session.clientId,
      status: session.status,
      startTime: session.startTime,
      duration: session.endTime ? session.endTime - session.startTime : Date.now() - session.startTime
    }));
  }

  getConnectedClientsCount() {
    return this.clients.size;
  }

  shutdown() {
    if (this.wss) {
      this.wss.close();
      logger.info('WebSocket service shut down');
    }
  }
}

module.exports = WebSocketService;
