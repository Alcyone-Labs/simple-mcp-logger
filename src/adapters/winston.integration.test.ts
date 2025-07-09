import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import winston from 'winston';
import { SimpleMcpWinstonTransport, createWinstonTransport } from './index.js';

describe('Winston Integration Tests', () => {
  let consoleSpy: {
    debug: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    log: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Winston Logger Integration', () => {
    it('should work as a Winston transport', () => {
      const transport = new SimpleMcpWinstonTransport({ level: 'debug' });
      
      const logger = winston.createLogger({
        level: 'debug',
        transports: [transport]
      });

      logger.error('Error message');
      logger.warn('Warning message');
      logger.info('Info message');
      logger.debug('Debug message');

      expect(consoleSpy.error).toHaveBeenCalledWith('Error message');
      expect(consoleSpy.warn).toHaveBeenCalledWith('Warning message');
      expect(consoleSpy.error).toHaveBeenCalledWith('Info message');
      expect(consoleSpy.debug).toHaveBeenCalledWith('Debug message');
    });

    it('should handle Winston metadata correctly', () => {
      const transport = new SimpleMcpWinstonTransport({ level: 'debug' });

      const logger = winston.createLogger({
        level: 'debug',
        transports: [transport]
      });

      logger.info('User action', { userId: 123, action: 'login', customField: 'test' });

      expect(consoleSpy.error).toHaveBeenCalledWith('User action', { userId: 123, action: 'login', customField: 'test' });
    });

    it('should respect Winston log levels', () => {
      const transport = new SimpleMcpWinstonTransport({ level: 'warn' });
      
      const logger = winston.createLogger({
        level: 'warn',
        transports: [transport]
      });

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      // Debug and info should not be logged due to level filtering
      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalledWith('Warning message');
      expect(consoleSpy.error).toHaveBeenCalledWith('Error message');
    });

    it('should work with Winston child loggers', () => {
      const transport = new SimpleMcpWinstonTransport({ 
        level: 'debug',
        prefix: 'MAIN'
      });
      
      const logger = winston.createLogger({
        level: 'debug',
        transports: [transport]
      });

      const childLogger = logger.child({ service: 'auth' });

      childLogger.info('Authentication successful');

      expect(consoleSpy.error).toHaveBeenCalledWith('MAIN Authentication successful', { service: 'auth' });
    });

    it('should handle Winston format transformations', () => {
      const transport = new SimpleMcpWinstonTransport({ level: 'debug' });
      
      const logger = winston.createLogger({
        level: 'debug',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        transports: [transport]
      });

      logger.info('Formatted message', { data: 'test' });

      // The transport should receive the formatted log object
      expect(consoleSpy.error).toHaveBeenCalled();
      const call = consoleSpy.error.mock.calls[0];
      expect(call[0]).toBe('Formatted message');
      expect(call[1]).toMatchObject({ data: 'test' });
    });

    it('should work with multiple transports', () => {
      const mcpTransport = new SimpleMcpWinstonTransport({ level: 'debug' });
      const consoleTransport = new winston.transports.Console({ level: 'debug' });

      const logger = winston.createLogger({
        level: 'debug',
        transports: [mcpTransport, consoleTransport]
      });

      logger.info('Multi transport message');

      // Our transport should receive the message
      expect(consoleSpy.error).toHaveBeenCalledWith('Multi transport message');

      // Verify that the logger has both transports
      expect(logger.transports).toHaveLength(2);
      expect(logger.transports[0]).toBe(mcpTransport);
      expect(logger.transports[1]).toBe(consoleTransport);
    });

    it('should handle Winston exceptions and rejections', () => {
      const transport = new SimpleMcpWinstonTransport({ level: 'debug' });
      
      const logger = winston.createLogger({
        level: 'debug',
        transports: [transport],
        exceptionHandlers: [transport],
        rejectionHandlers: [transport]
      });

      // Simulate an exception log
      transport.log({
        level: 'error',
        message: 'Uncaught Exception',
        stack: 'Error stack trace...',
        exception: true
      });

      expect(consoleSpy.error).toHaveBeenCalledWith('Uncaught Exception', { stack: 'Error stack trace...', exception: true });
    });
  });

  describe('Factory Function Integration', () => {
    it('should create working transport via factory', () => {
      const transport = createWinstonTransport({ 
        level: 'info',
        prefix: 'FACTORY'
      });
      
      const logger = winston.createLogger({
        level: 'info',
        transports: [transport]
      });

      logger.info('Factory created transport');

      expect(consoleSpy.error).toHaveBeenCalledWith('FACTORY Factory created transport');
    });
  });

  describe('MCP Mode Integration', () => {
    it('should suppress output in MCP mode', () => {
      const transport = new SimpleMcpWinstonTransport({ 
        level: 'debug',
        mcpMode: true
      });
      
      const logger = winston.createLogger({
        level: 'debug',
        transports: [transport]
      });

      logger.info('MCP mode message');

      expect(consoleSpy.error).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });

    it('should allow dynamic MCP mode toggling', () => {
      const transport = new SimpleMcpWinstonTransport({ 
        level: 'debug',
        mcpMode: false
      });
      
      const logger = winston.createLogger({
        level: 'debug',
        transports: [transport]
      });

      logger.info('Before MCP mode');
      expect(consoleSpy.error).toHaveBeenCalledWith('Before MCP mode');

      transport.setMcpMode(true);
      logger.info('During MCP mode');
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);

      transport.setMcpMode(false);
      logger.info('After MCP mode');
      expect(consoleSpy.error).toHaveBeenCalledTimes(2);
    });
  });
});
