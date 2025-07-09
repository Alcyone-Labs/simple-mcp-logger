import { Logger, type LogLevel } from '../SimpleMcpLogger.js';

import TransportStream from 'winston-transport';

interface TransportStreamOptions {
  level?: string;
  silent?: boolean;
  handleExceptions?: boolean;
  handleRejections?: boolean;
  [key: string]: any;
}

/**
 * Winston transport that uses SimpleMcpLogger as the underlying logger
 */
export class SimpleMcpWinstonTransport extends TransportStream {
  private logger: Logger;
  private options: TransportStreamOptions;

  constructor(options: TransportStreamOptions & {
    mcpMode?: boolean;
    prefix?: string;
  } = {}) {
    super(options);
    this.options = options;

    const level = this.mapWinstonLevelToMcp(options.level || 'info');

    this.logger = new Logger({
      level,
      mcpMode: options.mcpMode || false,
      prefix: options.prefix
    });
  }

  /**
   * Emit method for Winston compatibility
   */
  emit(event: string, ...args: any[]): boolean {
    return super.emit(event, ...args);
  }

  /**
   * Map Winston log levels to SimpleMcpLogger levels
   */
  private mapWinstonLevelToMcp(winstonLevel: string): LogLevel {
    const levelMap: Record<string, LogLevel> = {
      'error': 'error',
      'warn': 'warn',
      'info': 'info',
      'http': 'info',
      'verbose': 'debug',
      'debug': 'debug',
      'silly': 'debug'
    };
    
    return levelMap[winstonLevel] || 'info';
  }



  /**
   * Log method called by Winston
   */
  log(info: any, callback?: () => void): void {
    const level = this.mapWinstonLevelToMcp(info.level);
    const message = info.message || '';

    // Extract metadata from the info object, excluding Winston-specific fields
    const { level: _, message: __, timestamp: ___, ...meta } = info;

    // Remove any Symbol properties and other Winston internals
    const cleanMeta: any = {};
    for (const [key, value] of Object.entries(meta)) {
      if (typeof key === 'string' && !key.startsWith('Symbol(') && key !== 'splat') {
        cleanMeta[key] = value;
      }
    }

    const args = Object.keys(cleanMeta).length > 0 ? [cleanMeta] : [];

    switch (level) {
      case 'debug':
        this.logger.debug(message, ...args);
        break;
      case 'info':
        this.logger.info(message, ...args);
        break;
      case 'warn':
        this.logger.warn(message, ...args);
        break;
      case 'error':
        this.logger.error(message, ...args);
        break;
      default:
        this.logger.info(message, ...args);
    }

    // Emit the 'logged' event as expected by Winston
    setImmediate(() => {
      this.emit('logged', info);
    });

    if (callback) {
      callback();
    }
  }

  /**
   * Set MCP mode
   */
  setMcpMode(enabled: boolean): void {
    this.logger.setMcpMode(enabled);
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.logger.setLevel(level);
  }

  /**
   * Set prefix
   */
  setPrefix(prefix: string): void {
    this.logger.setPrefix(prefix);
  }

  /**
   * Create child logger
   */
  child(prefix: string): SimpleMcpWinstonTransport {
    const childLogger = this.logger.child(prefix);
    const transport = new SimpleMcpWinstonTransport(this.options);
    transport.logger = childLogger;
    return transport;
  }

  /**
   * Get the underlying SimpleMcpLogger instance
   */
  getLogger(): Logger {
    return this.logger;
  }
}

/**
 * Factory function to create Winston transport
 */
export function createWinstonTransport(options: TransportStreamOptions & {
  mcpMode?: boolean;
  prefix?: string;
} = {}): SimpleMcpWinstonTransport {
  return new SimpleMcpWinstonTransport(options);
}
