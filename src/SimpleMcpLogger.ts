/**
 * Lightweight centralized logger for ArgParser
 * Provides MCP-compliant logging that can be disabled in MCP mode
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

/**
 * Configuration options for SimpleMcpLogger
 */
export interface LoggerConfig {
  /** Minimum log level to output */
  level: LogLevel;
  /** When true, suppresses console output to prevent MCP protocol corruption */
  mcpMode: boolean;
  /** Optional prefix to prepend to all log messages */
  prefix?: string;
  /** Optional file path for persistent logging. Creates directory if it doesn't exist. */
  logToFile?: string;
}

export class Logger {
  private config: LoggerConfig;
  private fileStream?: fs.WriteStream;
  
  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: 'info',
      mcpMode: false,
      prefix: '',
      ...config
    };
    
    // Initialize file logging if specified
    if (this.config.logToFile) {
      this.initFileLogging(this.config.logToFile);
    }
  }
  
  /**
   * Initialize file logging
   */
  private initFileLogging(filePath: string): void {
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      fs.mkdirSync(dir, { recursive: true });

      this.fileStream = fs.createWriteStream(filePath, { flags: 'a' });

      this.fileStream.on('error', (error) => {
        console.error(`SimpleMcpLogger: File stream error for '${filePath}': ${error.message}`);
        console.error(`SimpleMcpLogger: File logging will be disabled. Check file permissions and disk space.`);
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`SimpleMcpLogger: Failed to initialize file logging for '${filePath}': ${errorMessage}`);
      console.error(`SimpleMcpLogger: Possible causes: invalid path, insufficient permissions, or disk full.`);
      this.fileStream = undefined;
    }
  }
  
  /**
   * Write to file if file logging is enabled
   */
  private writeToFile(level: string, message: string, ...args: any[]): void {
    if (this.fileStream && !this.fileStream.destroyed) {
      const timestamp = new Date().toISOString();
      const formattedArgs = args.length > 0 ? ' ' + args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ') : '';

      const logLine = `[${timestamp}] ${level.toUpperCase()}: ${message}${formattedArgs}\n`;
      this.fileStream.write(logLine);
    }
  }
  
  /**
   * Set MCP mode - when true, all console output is suppressed
   */
  public setMcpMode(enabled: boolean): void {
    this.config.mcpMode = enabled;
  }
  
  /**
   * Set log level
   */
  public setLevel(level: LogLevel): void {
    this.config.level = level;
  }
  
  /**
   * Set prefix for all log messages
   */
  public setPrefix(prefix: string): void {
    this.config.prefix = prefix;
  }
  
  /**
   * Set or change the log file path
   *
   * @param filePath Path to the log file. Directory will be created if it doesn't exist.
   *
   * @example
   * ```typescript
   * await logger.setLogFile('./logs/app.log');
   * logger.info('This goes to the new file');
   * ```
   */
  public async setLogFile(filePath: string): Promise<void> {
    // Close existing stream
    await this.close();

    this.config.logToFile = filePath;
    this.initFileLogging(filePath);
  }
  
  /**
   * Close file stream
   */
  public close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.fileStream && !this.fileStream.destroyed) {
        // Ensure all data is written before closing
        this.fileStream.end(() => {
          this.fileStream = undefined;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
  
  /**
   * Check if logging is enabled for a given level
   */
  private shouldLog(level: LogLevel): boolean {
    if (this.config.mcpMode && !this.config.logToFile) {
      return false; // No console output in MCP mode unless file logging
    }
    
    if (this.config.level === 'silent') {
      return false;
    }
    
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex >= currentLevelIndex;
  }
  
  /**
   * Check if console logging should be used (not in MCP mode or file logging disabled)
   */
  private shouldLogToConsole(level: LogLevel): boolean {
    return this.shouldLog(level) && (!this.config.mcpMode || !this.config.logToFile);
  }
  
  /**
   * Format message with prefix
   */
  private formatMessage(message: string): string {
    return this.config.prefix ? `${this.config.prefix} ${message}` : message;
  }
  
  /**
   * Debug logging
   */
  public debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      if (this.config.logToFile) {
        this.writeToFile('debug', this.formatMessage(message), ...args);
      }
      if (this.shouldLogToConsole('debug')) {
        console.debug(this.formatMessage(message), ...args);
      }
    }
  }
  
  /**
   * Info logging - uses stderr for MCP compliance
   */
  public info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      if (this.config.logToFile) {
        this.writeToFile('info', this.formatMessage(message), ...args);
      }
      if (this.shouldLogToConsole('info')) {
        console.error(this.formatMessage(message), ...args);
      }
    }
  }
  
  /**
   * Warning logging
   */
  public warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      if (this.config.logToFile) {
        this.writeToFile('warn', this.formatMessage(message), ...args);
      }
      if (this.shouldLogToConsole('warn')) {
        console.warn(this.formatMessage(message), ...args);
      }
    }
  }
  
  /**
   * Error logging - uses stderr which is allowed in MCP mode for debugging
   */
  public error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      if (this.config.logToFile) {
        this.writeToFile('error', this.formatMessage(message), ...args);
      }
      if (this.shouldLogToConsole('error')) {
        console.error(this.formatMessage(message), ...args);
      }
    }
  }

  /**
   * Log method - alias for info to match console.log behavior
   */
  public log(message: string, ...args: any[]): void {
    this.info(message, ...args);
  }

  /**
   * Trace logging - uses console.trace for stack traces
   */
  public trace(message?: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      if (message) {
        console.trace(this.formatMessage(message), ...args);
      } else {
        console.trace();
      }
    }
  }

  /**
   * Table logging - uses console.table for structured data
   */
  public table(data: any, columns?: string[]): void {
    if (this.shouldLog('info')) {
      console.table(data, columns);
    }
  }

  /**
   * Group logging - creates a collapsible group
   */
  public group(label?: string): void {
    if (this.shouldLog('info')) {
      if (label) {
        console.group(this.formatMessage(label));
      } else {
        console.group();
      }
    }
  }

  /**
   * Collapsed group logging
   */
  public groupCollapsed(label?: string): void {
    if (this.shouldLog('info')) {
      if (label) {
        console.groupCollapsed(this.formatMessage(label));
      } else {
        console.groupCollapsed();
      }
    }
  }

  /**
   * End group logging
   */
  public groupEnd(): void {
    if (this.shouldLog('info')) {
      console.groupEnd();
    }
  }

  /**
   * Time logging - starts a timer
   */
  public time(label?: string): void {
    if (this.shouldLog('debug')) {
      const timerLabel = label ? this.formatMessage(label) : undefined;
      console.time(timerLabel);
    }
  }

  /**
   * Time end logging - ends a timer and logs the duration
   */
  public timeEnd(label?: string): void {
    if (this.shouldLog('debug')) {
      const timerLabel = label ? this.formatMessage(label) : undefined;
      console.timeEnd(timerLabel);
    }
  }

  /**
   * Time log - logs current timer value without ending it
   */
  public timeLog(label?: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      const timerLabel = label ? this.formatMessage(label) : undefined;
      console.timeLog(timerLabel, ...args);
    }
  }

  /**
   * Count logging - maintains a counter for the label
   */
  public count(label?: string): void {
    if (this.shouldLog('debug')) {
      const countLabel = label ? this.formatMessage(label) : undefined;
      console.count(countLabel);
    }
  }

  /**
   * Count reset - resets the counter for the label
   */
  public countReset(label?: string): void {
    if (this.shouldLog('debug')) {
      const countLabel = label ? this.formatMessage(label) : undefined;
      console.countReset(countLabel);
    }
  }

  /**
   * Assert logging - logs an error if assertion fails
   */
  public assert(condition: boolean, message?: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      if (message) {
        console.assert(condition, this.formatMessage(message), ...args);
      } else {
        console.assert(condition, ...args);
      }
    }
  }

  /**
   * Clear console - clears the console if supported
   */
  public clear(): void {
    if (this.shouldLog('debug') && console.clear) {
      console.clear();
    }
  }

  /**
   * Dir logging - displays an interactive list of object properties
   */
  public dir(obj: any, options?: any): void {
    if (this.shouldLog('info')) {
      console.dir(obj, options);
    }
  }

  /**
   * DirXML logging - displays XML/HTML element representation
   */
  public dirxml(obj: any): void {
    if (this.shouldLog('info')) {
      console.dirxml(obj);
    }
  }
  
  /**
   * MCP-safe error logging - always uses STDERR even in MCP mode
   *
   * STDERR is safe for MCP servers because the MCP protocol only uses STDOUT
   * for JSON-RPC messages. STDERR output appears in client logs without
   * interfering with protocol communication.
   *
   * Use this for critical errors, debugging info, and monitoring data that
   * needs to be visible even when the logger is in MCP mode.
   */
  public mcpError(message: string, ...args: any[]): void {
    console.error(this.formatMessage(message), ...args);
  }
  
  /**
   * Create a child logger with additional prefix
   */
  public child(prefix: string): Logger {
    return new Logger({
      ...this.config,
      prefix: this.config.prefix ? `${this.config.prefix}:${prefix}` : prefix
    });
  }
}

/**
 * Global logger instance
 */
export const logger = new Logger();

/**
 * Create a logger for MCP mode
 *
 * @param prefix Optional prefix for all log messages
 * @param logToFile Optional file path for persistent logging. When provided, logs are written to file even in MCP mode while console output is suppressed.
 * @returns Logger instance configured for MCP compliance
 *
 * @example
 * ```typescript
 * // Basic MCP logger (console suppressed)
 * const logger = createMcpLogger('MyServer');
 *
 * // MCP logger with file output (console suppressed, file enabled)
 * const fileLogger = createMcpLogger('MyServer', './logs/mcp.log');
 * ```
 */
export function createMcpLogger(prefix?: string, logToFile?: string): Logger {
  return new Logger({
    level: 'error', // Only errors in MCP mode
    mcpMode: true,
    prefix,
    logToFile
  });
}

/**
 * Create a logger for CLI mode
 */
export function createCliLogger(level: LogLevel = 'info', prefix?: string): Logger {
  return new Logger({
    level,
    mcpMode: false,
    prefix
  });
}

/**
 * Default export - the Logger class
 */
export default Logger;
