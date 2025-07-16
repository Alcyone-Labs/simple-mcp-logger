import { Logger, type LogLevel } from '../SimpleMcpLogger.js';

/**
 * Pino transport that uses SimpleMcpLogger as the underlying logger
 */
export class SimpleMcpPinoTransport {
  private logger: Logger;
  private options: PinoTransportOptions;

  constructor(options: PinoTransportOptions = {}) {
    this.options = options;
    const level = this.mapPinoLevelToMcp(options.level || 'info');

    this.logger = new Logger({
      level,
      mcpMode: options.mcpMode || false,
      prefix: options.prefix,
      logToFile: options.logToFile
    });
  }

  /**
   * Map Pino log levels to SimpleMcpLogger levels
   */
  private mapPinoLevelToMcp(pinoLevel: string | number): LogLevel {
    if (typeof pinoLevel === 'number') {
      if (pinoLevel >= 60) return 'error';
      if (pinoLevel >= 50) return 'error';
      if (pinoLevel >= 40) return 'warn';
      if (pinoLevel >= 30) return 'info';
      if (pinoLevel >= 20) return 'debug';
      return 'debug';
    }
    
    const levelMap: Record<string, LogLevel> = {
      'fatal': 'error',
      'error': 'error',
      'warn': 'warn',
      'info': 'info',
      'debug': 'debug',
      'trace': 'debug'
    };
    
    return levelMap[pinoLevel] || 'info';
  }

  /**
   * Transform function for Pino transport
   */
  transform(chunk: any): void {
    try {
      const logObj = typeof chunk === 'string' ? JSON.parse(chunk) : chunk;
      const level = this.mapPinoLevelToMcp(logObj.level);
      const message = logObj.msg || '';

      // Extract metadata from the log object, excluding Pino-specific fields
      const { level: _, msg: __, time: ___, hostname: ____, pid: _____, ...meta } = logObj;

      // Remove any other Pino internals that might be present
      const cleanMeta: any = {};
      for (const [key, value] of Object.entries(meta)) {
        if (typeof key === 'string' && !key.startsWith('Symbol(') && key !== 'v') {
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
    } catch (error) {
      this.logger.error('Failed to parse log message', error);
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
  child(prefix: string): SimpleMcpPinoTransport {
    const childLogger = this.logger.child(prefix);
    const transport = new SimpleMcpPinoTransport(this.options);
    transport.logger = childLogger;
    return transport;
  }

  /**
   * Get the underlying SimpleMcpLogger instance
   */
  getLogger(): Logger {
    return this.logger;
  }

  /**
   * Set log file path
   */
  async setLogFile(filePath: string): Promise<void> {
    await this.logger.setLogFile(filePath);
  }

  /**
   * Close file stream
   */
  async close(): Promise<void> {
    await this.logger.close();
  }
}

/**
 * Options for Pino transport
 */
export interface PinoTransportOptions {
  level?: LogLevel;
  mcpMode?: boolean;
  prefix?: string;
  logToFile?: string;
}

/**
 * Factory function to create Pino transport
 */
export function createPinoTransport(options: PinoTransportOptions = {}): SimpleMcpPinoTransport {
  return new SimpleMcpPinoTransport(options);
}

/**
 * Create a Pino destination that uses SimpleMcpLogger
 */
export function createPinoDestination(options: PinoTransportOptions = {}) {
  const transport = new SimpleMcpPinoTransport(options);
  
  return {
    write(chunk: any) {
      transport.transform(chunk);
    },
    async end() {
      await transport.close();
    },
    async destroy() {
      await transport.close();
    }
  };
}

/**
 * Create a Pino logger that uses SimpleMcpLogger as the underlying transport
 * Note: This function requires Pino to be installed and available in the environment
 *
 * @deprecated This function uses dynamic imports which are not bundler-friendly.
 * Instead, import Pino directly in your application and use createPinoDestination:
 *
 * ```typescript
 * import pino from 'pino';
 * import { createPinoDestination } from '@alcyone-labs/simple-mcp-logger';
 *
 * const destination = createPinoDestination({ level: 'info' });
 * const logger = pino({ level: 'info' }, destination);
 * ```
 */
export function createPinoLogger(_options: PinoTransportOptions & {
  name?: string;
} = {}) {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    throw new Error('createPinoLogger is not supported in browser environments. Use createPinoDestination with a browser-compatible Pino build instead.');
  }

  // Throw an error encouraging users to import Pino directly for better bundling
  throw new Error(
    'createPinoLogger is deprecated for bundling compatibility. ' +
    'Please import Pino directly and use createPinoDestination instead:\n\n' +
    'import pino from \'pino\';\n' +
    'import { createPinoDestination } from \'@alcyone-labs/simple-mcp-logger\';\n\n' +
    'const destination = createPinoDestination({ level: \'info\' });\n' +
    'const logger = pino({ level: \'info\' }, destination);'
  );
}
