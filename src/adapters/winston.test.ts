import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SimpleMcpWinstonTransport, createWinstonTransport } from './winston.js';

describe('Winston Adapter', () => {
  let consoleSpy: {
    debug: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('SimpleMcpWinstonTransport', () => {
    it('should create transport with default options', () => {
      const transport = new SimpleMcpWinstonTransport();
      expect(transport).toBeInstanceOf(SimpleMcpWinstonTransport);
    });

    it('should create transport with custom options', () => {
      const transport = new SimpleMcpWinstonTransport({
        level: 'debug',
        mcpMode: true,
        prefix: 'WINSTON'
      });
      expect(transport).toBeInstanceOf(SimpleMcpWinstonTransport);
    });

    describe('level mapping', () => {
      it('should map Winston levels to SimpleMcp levels correctly', () => {
        const transport = new SimpleMcpWinstonTransport({ level: 'debug' });
        
        transport.log({ level: 'error', message: 'error message' });
        transport.log({ level: 'warn', message: 'warn message' });
        transport.log({ level: 'info', message: 'info message' });
        transport.log({ level: 'debug', message: 'debug message' });
        transport.log({ level: 'verbose', message: 'verbose message' });
        transport.log({ level: 'silly', message: 'silly message' });
        
        expect(consoleSpy.error).toHaveBeenCalledWith('error message');
        expect(consoleSpy.warn).toHaveBeenCalledWith('warn message');
        expect(consoleSpy.error).toHaveBeenCalledWith('info message');
        expect(consoleSpy.debug).toHaveBeenCalledWith('debug message');
        expect(consoleSpy.debug).toHaveBeenCalledWith('verbose message');
        expect(consoleSpy.debug).toHaveBeenCalledWith('silly message');
      });

      it('should handle unknown Winston levels', () => {
        const transport = new SimpleMcpWinstonTransport({ level: 'debug' });
        
        transport.log({ level: 'unknown', message: 'unknown message' });
        
        expect(consoleSpy.error).toHaveBeenCalledWith('unknown message');
      });
    });

    describe('message handling', () => {
      it('should handle messages with metadata', () => {
        const transport = new SimpleMcpWinstonTransport({ level: 'debug' });

        transport.log({
          level: 'info',
          message: 'test message',
          userId: 123,
          action: 'login'
        });

        expect(consoleSpy.error).toHaveBeenCalledWith('test message', { userId: 123, action: 'login' });
      });

      it('should handle messages without metadata', () => {
        const transport = new SimpleMcpWinstonTransport({ level: 'debug' });
        
        transport.log({
          level: 'info',
          message: 'simple message'
        });
        
        expect(consoleSpy.error).toHaveBeenCalledWith('simple message');
      });

      it('should handle empty messages', () => {
        const transport = new SimpleMcpWinstonTransport({ level: 'debug' });
        
        transport.log({
          level: 'info'
        });
        
        expect(consoleSpy.error).toHaveBeenCalledWith('');
      });
    });

    describe('callback handling', () => {
      it('should call callback if provided', () => {
        const transport = new SimpleMcpWinstonTransport({ level: 'debug' });
        const callback = vi.fn();
        
        transport.log({ level: 'info', message: 'test' }, callback);
        
        expect(callback).toHaveBeenCalled();
      });

      it('should not fail if no callback provided', () => {
        const transport = new SimpleMcpWinstonTransport({ level: 'debug' });
        
        expect(() => {
          transport.log({ level: 'info', message: 'test' });
        }).not.toThrow();
      });
    });

    describe('MCP mode', () => {
      it('should respect MCP mode setting', () => {
        const transport = new SimpleMcpWinstonTransport({ mcpMode: true });
        
        transport.log({ level: 'info', message: 'test message' });
        
        expect(consoleSpy.error).not.toHaveBeenCalled();
      });

      it('should allow setting MCP mode dynamically', () => {
        const transport = new SimpleMcpWinstonTransport({ mcpMode: false });
        
        transport.log({ level: 'info', message: 'before mcp' });
        expect(consoleSpy.error).toHaveBeenCalledWith('before mcp');
        
        transport.setMcpMode(true);
        transport.log({ level: 'info', message: 'during mcp' });
        expect(consoleSpy.error).toHaveBeenCalledTimes(1);
        
        transport.setMcpMode(false);
        transport.log({ level: 'info', message: 'after mcp' });
        expect(consoleSpy.error).toHaveBeenCalledTimes(2);
      });
    });

    describe('prefix functionality', () => {
      it('should add prefix to messages', () => {
        const transport = new SimpleMcpWinstonTransport({ prefix: 'WINSTON' });
        
        transport.log({ level: 'info', message: 'test message' });
        
        expect(consoleSpy.error).toHaveBeenCalledWith('WINSTON test message');
      });

      it('should allow setting prefix dynamically', () => {
        const transport = new SimpleMcpWinstonTransport();
        
        transport.setPrefix('DYNAMIC');
        transport.log({ level: 'info', message: 'test message' });
        
        expect(consoleSpy.error).toHaveBeenCalledWith('DYNAMIC test message');
      });
    });

    describe('child logger', () => {
      it('should create child transport with combined prefix', () => {
        const parentTransport = new SimpleMcpWinstonTransport({ prefix: 'PARENT' });
        const childTransport = parentTransport.child('CHILD');
        
        childTransport.log({ level: 'info', message: 'test message' });
        
        expect(consoleSpy.error).toHaveBeenCalledWith('PARENT:CHILD test message');
      });

      it('should inherit parent configuration', () => {
        const parentTransport = new SimpleMcpWinstonTransport({ 
          level: 'warn',
          mcpMode: true 
        });
        const childTransport = parentTransport.child('CHILD');
        
        childTransport.log({ level: 'info', message: 'info message' });
        childTransport.log({ level: 'warn', message: 'warn message' });
        
        expect(consoleSpy.error).not.toHaveBeenCalled();
        expect(consoleSpy.warn).not.toHaveBeenCalled();
      });
    });

    describe('logger access', () => {
      it('should provide access to underlying logger', () => {
        const transport = new SimpleMcpWinstonTransport();
        const logger = transport.getLogger();
        
        expect(logger).toBeDefined();
        expect(typeof logger.info).toBe('function');
      });
    });
  });

  describe('createWinstonTransport factory', () => {
    it('should create transport with default options', () => {
      const transport = createWinstonTransport();
      expect(transport).toBeInstanceOf(SimpleMcpWinstonTransport);
    });

    it('should create transport with custom options', () => {
      const transport = createWinstonTransport({
        level: 'debug',
        mcpMode: true,
        prefix: 'FACTORY'
      });
      
      transport.log({ level: 'info', message: 'test message' });
      
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });
  });
});
