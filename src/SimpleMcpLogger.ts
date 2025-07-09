/**
 * Lightweight centralized logger for ArgParser
 * Provides MCP-compliant logging that can be disabled in MCP mode
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export interface LoggerConfig {
  level: LogLevel;
  mcpMode: boolean;
  prefix?: string;
}

export class Logger {
  private config: LoggerConfig;
  
  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: 'info',
      mcpMode: false,
      prefix: '',
      ...config
    };
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
   * Check if logging is enabled for a given level
   */
  private shouldLog(level: LogLevel): boolean {
    if (this.config.mcpMode) {
      return false; // No console output in MCP mode
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
      console.debug(this.formatMessage(message), ...args);
    }
  }
  
  /**
   * Info logging - uses stderr for MCP compliance
   */
  public info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.error(this.formatMessage(message), ...args);
    }
  }
  
  /**
   * Warning logging
   */
  public warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage(message), ...args);
    }
  }
  
  /**
   * Error logging - uses stderr which is allowed in MCP mode for debugging
   */
  public error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage(message), ...args);
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
 */
export function createMcpLogger(prefix?: string): Logger {
  return new Logger({
    level: 'error', // Only errors in MCP mode
    mcpMode: true,
    prefix
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
