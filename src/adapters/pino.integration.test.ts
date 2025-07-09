import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import pino from 'pino';
import { SimpleMcpPinoTransport, createPinoDestination, createPinoLogger } from './index.js';

describe('Pino Integration Tests', () => {
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

  describe('Pino Destination Integration', () => {
    it('should work as a Pino destination', () => {
      const destination = createPinoDestination({ level: 'debug' });
      
      const logger = pino({ level: 'debug' }, destination);

      logger.error('Error message');
      logger.warn('Warning message');
      logger.info('Info message');
      logger.debug('Debug message');

      expect(consoleSpy.error).toHaveBeenCalledWith('Error message');
      expect(consoleSpy.warn).toHaveBeenCalledWith('Warning message');
      expect(consoleSpy.error).toHaveBeenCalledWith('Info message');
      expect(consoleSpy.debug).toHaveBeenCalledWith('Debug message');
    });

    it('should handle Pino metadata correctly', () => {
      const destination = createPinoDestination({ level: 'debug' });
      
      const logger = pino({ level: 'debug' }, destination);

      logger.info({ userId: 123, action: 'login', timestamp: '2024-01-01' }, 'User action');

      expect(consoleSpy.error).toHaveBeenCalledWith('User action', { userId: 123, action: 'login', timestamp: '2024-01-01' });
    });

    it('should respect Pino log levels', () => {
      const destination = createPinoDestination({ level: 'warn' });
      
      const logger = pino({ level: 'warn' }, destination);

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      // Debug and info should not be logged due to level filtering
      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalledWith('Warning message');
      expect(consoleSpy.error).toHaveBeenCalledWith('Error message');
    });

    it('should work with Pino child loggers', () => {
      const destination = createPinoDestination({ 
        level: 'debug',
        prefix: 'MAIN'
      });
      
      const logger = pino({ level: 'debug' }, destination);
      const childLogger = logger.child({ service: 'auth' });

      childLogger.info('Authentication successful');

      expect(consoleSpy.error).toHaveBeenCalledWith('MAIN Authentication successful', { service: 'auth' });
    });

    it('should handle Pino fatal level', () => {
      const destination = createPinoDestination({ level: 'debug' });
      
      const logger = pino({ level: 'debug' }, destination);

      logger.fatal('Fatal error');

      expect(consoleSpy.error).toHaveBeenCalledWith('Fatal error');
    });

    it('should handle Pino trace level', () => {
      const destination = createPinoDestination({ level: 'trace' });
      
      const logger = pino({ level: 'trace' }, destination);

      logger.trace('Trace message');

      expect(consoleSpy.debug).toHaveBeenCalledWith('Trace message');
    });
  });

  describe('Pino Logger Factory Integration', () => {
    it('should create a working Pino logger using direct import pattern', () => {
      const destination = createPinoDestination({
        level: 'debug',
        prefix: 'FACTORY'
      });

      const logger = pino({ level: 'debug' }, destination);
      logger.info('Factory created logger');

      expect(consoleSpy.error).toHaveBeenCalledWith('FACTORY Factory created logger');
    });

    it('should create logger with name using direct import pattern', () => {
      const destination = createPinoDestination({
        level: 'debug'
      });

      const logger = pino({ level: 'debug', name: 'test-service' }, destination);
      logger.info('Named logger message');

      expect(consoleSpy.error).toHaveBeenCalledWith('Named logger message', { name: 'test-service' });
    });

    it('should handle child loggers from factory', () => {
      const destination = createPinoDestination({
        level: 'debug',
        prefix: 'PARENT'
      });

      const logger = pino({ level: 'debug' }, destination);
      const child = logger.child({ component: 'auth' });
      child.info('Child logger message');

      expect(consoleSpy.error).toHaveBeenCalledWith('PARENT Child logger message', { component: 'auth' });
    });

    it('should throw error when using deprecated createPinoLogger', () => {
      expect(() => {
        createPinoLogger();
      }).toThrow('createPinoLogger is deprecated for bundling compatibility');
    });
  });

  describe('Pino Transport Integration', () => {
    it('should work with Pino transport streams', () => {
      const transport = new SimpleMcpPinoTransport({ level: 'debug' });

      // Simulate Pino transport stream behavior
      const logData = {
        level: 30, // info level
        time: Date.now(),
        msg: 'Transport message',
        hostname: 'localhost',
        pid: process.pid,
        customField: 'test'
      };

      transport.transform(logData);

      // hostname and pid should be filtered out, but customField should remain
      expect(consoleSpy.error).toHaveBeenCalledWith('Transport message', { customField: 'test' });
    });

    it('should handle numeric log levels correctly', () => {
      const transport = new SimpleMcpPinoTransport({ level: 'debug' });
      
      transport.transform({ level: 60, msg: 'Fatal message' }); // fatal
      transport.transform({ level: 50, msg: 'Error message' }); // error
      transport.transform({ level: 40, msg: 'Warn message' });  // warn
      transport.transform({ level: 30, msg: 'Info message' });  // info
      transport.transform({ level: 20, msg: 'Debug message' }); // debug
      transport.transform({ level: 10, msg: 'Trace message' }); // trace

      expect(consoleSpy.error).toHaveBeenCalledWith('Fatal message');
      expect(consoleSpy.error).toHaveBeenCalledWith('Error message');
      expect(consoleSpy.warn).toHaveBeenCalledWith('Warn message');
      expect(consoleSpy.error).toHaveBeenCalledWith('Info message');
      expect(consoleSpy.debug).toHaveBeenCalledWith('Debug message');
      expect(consoleSpy.debug).toHaveBeenCalledWith('Trace message');
    });
  });

  describe('MCP Mode Integration', () => {
    it('should suppress output in MCP mode', () => {
      const destination = createPinoDestination({ 
        level: 'debug',
        mcpMode: true
      });
      
      const logger = pino({ level: 'debug' }, destination);

      logger.info('MCP mode message');

      expect(consoleSpy.error).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });

    it('should allow dynamic MCP mode toggling', () => {
      const transport = new SimpleMcpPinoTransport({ 
        level: 'debug',
        mcpMode: false
      });

      transport.transform({ level: 'info', msg: 'Before MCP mode' });
      expect(consoleSpy.error).toHaveBeenCalledWith('Before MCP mode');

      transport.setMcpMode(true);
      transport.transform({ level: 'info', msg: 'During MCP mode' });
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);

      transport.setMcpMode(false);
      transport.transform({ level: 'info', msg: 'After MCP mode' });
      expect(consoleSpy.error).toHaveBeenCalledTimes(2);
    });
  });

  describe('Pino Serializers Integration', () => {
    it('should work with Pino serializers', () => {
      const destination = createPinoDestination({ level: 'debug' });
      
      const logger = pino({
        level: 'debug',
        serializers: {
          err: pino.stdSerializers.err,
          req: pino.stdSerializers.req,
          res: pino.stdSerializers.res
        }
      }, destination);

      const error = new Error('Test error');
      logger.error({ err: error }, 'Error occurred');

      expect(consoleSpy.error).toHaveBeenCalled();
      const call = consoleSpy.error.mock.calls[0];
      expect(call[0]).toBe('Error occurred');
      expect(call[1]).toMatchObject({
        err: expect.objectContaining({
          type: 'Error',
          message: 'Test error',
          stack: expect.any(String)
        })
      });
    });
  });

  describe('Browser Environment Handling', () => {
    it('should throw appropriate error for createPinoLogger in browser', () => {
      // Mock browser environment
      const originalWindow = global.window;
      (global as any).window = {};

      try {
        expect(() => {
          createPinoLogger();
        }).toThrow('createPinoLogger is not supported in browser environments');
      } finally {
        // Restore original environment
        if (originalWindow === undefined) {
          delete (global as any).window;
        } else {
          global.window = originalWindow;
        }
      }
    });
  });
});
