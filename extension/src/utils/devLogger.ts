// Development Logger - Saves extension logs to backend for review
// Only active in development mode

interface LogEntry {
  timestamp: string;
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  context: string; // 'background' | 'popup' | 'content' | 'login' | 'options' | 'auth'
  message: string;
  data?: any;
  stack?: string;
}

class DevLogger {
  private isDevelopment: boolean;
  private context: string;
  private logBuffer: LogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private maxBufferSize = 50;

  constructor(context: string) {
    this.context = context;
    this.isDevelopment = true; // Always enable for now during development
    if (this.isDevelopment) {
      this.startPeriodicFlush();
      this.setupUnloadHandler();
    }
  }

  private async getApiUrl(): Promise<string> {
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.get({ apiUrl: 'http://localhost:3000/api' }, (data) => {
          resolve(data.apiUrl);
        });
      } catch (_e) {
        resolve('http://localhost:3000/api');
      }
    });
  }

  private async sendLogsToBackend(logs: LogEntry[]): Promise<void> {
    try {
      const apiUrl = await this.getApiUrl();
      const endpoint = `${apiUrl}/dev/logs`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'extension', logs })
      });
      if (!response.ok) {
        // In older API versions, this endpoint may not exist; degrade gracefully
        // Avoid noisy warnings in production-like builds
        return;
      }
    } catch (error) {
      // Silently fail - don't want logging to break the extension
      // Swallow errors to avoid console noise in users' consoles
    }
  }

  private createLogEntry(level: LogEntry['level'], message: string, data?: any): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
    };
    if (data !== undefined) entry.data = this.serializeData(data);
    if (level === 'error' && data instanceof Error) entry.stack = data.stack;
    return entry;
  }

  private serializeData(data: any): any {
    try {
      return JSON.parse(JSON.stringify(data, (key, value) => {
        if (typeof value === 'function') return '[Function]';
        if (value instanceof Error) {
          return { name: value.name, message: value.message, stack: value.stack };
        }
        return value;
      }));
    } catch (_e) {
      return '[Unserializable Object]';
    }
  }

  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry);
    if (this.logBuffer.length >= this.maxBufferSize) this.flush();
  }

  private async flush(): Promise<void> {
    if (this.logBuffer.length === 0) return;
    const logsToSend = [...this.logBuffer];
    this.logBuffer = [];
    await this.sendLogsToBackend(logsToSend);
  }

  private startPeriodicFlush(): void {
    this.flushInterval = setInterval(() => { this.flush(); }, 5000);
  }

  private setupUnloadHandler(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => { this.flush(); });
    }
    if (typeof self !== 'undefined' && 'serviceWorker' in self) {
      (self as any).addEventListener('beforeunload', () => { this.flush(); });
    }
  }

  public log(message: string, data?: any): void {
    console.log(`[${this.context}]`, message, data);
    if (this.isDevelopment) this.addToBuffer(this.createLogEntry('log', message, data));
  }
  public info(message: string, data?: any): void {
    console.info(`[${this.context}]`, message, data);
    if (this.isDevelopment) this.addToBuffer(this.createLogEntry('info', message, data));
  }
  public warn(message: string, data?: any): void {
    console.warn(`[${this.context}]`, message, data);
    if (this.isDevelopment) this.addToBuffer(this.createLogEntry('warn', message, data));
  }
  public error(message: string, data?: any): void {
    console.error(`[${this.context}]`, message, data);
    if (this.isDevelopment) this.addToBuffer(this.createLogEntry('error', message, data));
  }
  public debug(message: string, data?: any): void {
    console.debug(`[${this.context}]`, message, data);
    if (this.isDevelopment) this.addToBuffer(this.createLogEntry('debug', message, data));
  }

  public async flushLogs(): Promise<void> { await this.flush(); }
  public destroy(): void {
    if (this.flushInterval) { clearInterval(this.flushInterval); this.flushInterval = null; }
    this.flush();
  }
}

export function createDevLogger(context: string): DevLogger {
  return new DevLogger(context);
}
export { DevLogger };
export type { LogEntry };
