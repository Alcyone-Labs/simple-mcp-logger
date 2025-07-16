import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SimpleMcpPinoTransport, createPinoTransport, createPinoDestination, createPinoLogger } from './pino.js';
import * as fs from 'node:fs';

describe('Pino Adapter', () => {
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

  describe('SimpleMcpPinoTransport', () => {
    it('should create transport with default options', () => {
      const transport = new SimpleMcpPinoTransport();
      expect(transport).toBeInstanceOf(SimpleMcpPinoTransport);
    });

    it('should create transport with custom options', () => {
      const transport = new SimpleMcpPinoTransport({
        level: 'debug',
        mcpMode: true,
        prefix: 'PINO'
      });
      expect(transport).toBeInstanceOf(SimpleMcpPinoTransport);
    });

    describe('level mapping', () => {
      it('should map Pino string levels to SimpleMcp levels correctly', () => {
        const transport = new SimpleMcpPinoTransport({ level: 'debug' });
        
        transport.transform({ level: 'fatal', msg: 'fatal message' });
        transport.transform({ level: 'error', msg: 'error message' });
        transport.transform({ level: 'warn', msg: 'warn message' });
        transport.transform({ level: 'info', msg: 'info message' });
        transport.transform({ level: 'debug', msg: 'debug message' });
        transport.transform({ level: 'trace', msg: 'trace message' });
        
        expect(consoleSpy.error).toHaveBeenCalledWith('fatal message');
        expect(consoleSpy.error).toHaveBeenCalledWith('error message');
        expect(consoleSpy.warn).toHaveBeenCalledWith('warn message');
        expect(consoleSpy.error).toHaveBeenCalledWith('info message');
        expect(consoleSpy.debug).toHaveBeenCalledWith('debug message');
        expect(consoleSpy.debug).toHaveBeenCalledWith('trace message');
      });

      it('should map Pino numeric levels to SimpleMcp levels correctly', () => {
        const transport = new SimpleMcpPinoTransport({ level: 'debug' });
        
        transport.transform({ level: 60, msg: 'fatal message' });
        transport.transform({ level: 50, msg: 'error message' });
        transport.transform({ level: 40, msg: 'warn message' });
        transport.transform({ level: 30, msg: 'info message' });
        transport.transform({ level: 20, msg: 'debug message' });
        transport.transform({ level: 10, msg: 'trace message' });
        
        expect(consoleSpy.error).toHaveBeenCalledWith('fatal message');
        expect(consoleSpy.error).toHaveBeenCalledWith('error message');
        expect(consoleSpy.warn).toHaveBeenCalledWith('warn message');
        expect(consoleSpy.error).toHaveBeenCalledWith('info message');
        expect(consoleSpy.debug).toHaveBeenCalledWith('debug message');
        expect(consoleSpy.debug).toHaveBeenCalledWith('trace message');
      });

      it('should handle unknown Pino levels', () => {
        const transport = new SimpleMcpPinoTransport({ level: 'debug' });
        
        transport.transform({ level: 'unknown', msg: 'unknown message' });
        
        expect(consoleSpy.error).toHaveBeenCalledWith('unknown message');
      });
    });

    describe('message handling', () => {
      it('should handle messages with metadata', () => {
        const transport = new SimpleMcpPinoTransport({ level: 'debug' });
        
        transport.transform({
          level: 'info',
          msg: 'test message',
          userId: 123,
          action: 'login',
          time: Date.now()
        });
        
        expect(consoleSpy.error).toHaveBeenCalledWith('test message', { userId: 123, action: 'login' });
      });

      it('should handle messages without metadata', () => {
        const transport = new SimpleMcpPinoTransport({ level: 'debug' });
        
        transport.transform({
          level: 'info',
          msg: 'simple message'
        });
        
        expect(consoleSpy.error).toHaveBeenCalledWith('simple message');
      });

      it('should handle empty messages', () => {
        const transport = new SimpleMcpPinoTransport({ level: 'debug' });
        
        transport.transform({
          level: 'info'
        });
        
        expect(consoleSpy.error).toHaveBeenCalledWith('');
      });

      it('should handle JSON string input', () => {
        const transport = new SimpleMcpPinoTransport({ level: 'debug' });
        
        const logString = JSON.stringify({
          level: 'info',
          msg: 'json message',
          userId: 456
        });
        
        transport.transform(logString);
        
        expect(consoleSpy.error).toHaveBeenCalledWith('json message', { userId: 456 });
      });

      it('should handle malformed JSON gracefully', () => {
        const transport = new SimpleMcpPinoTransport({ level: 'debug' });
        
        transport.transform('invalid json {');
        
        expect(consoleSpy.error).toHaveBeenCalledWith('Failed to parse log message', expect.any(Error));
      });
    });

    describe('MCP mode', () => {
      it('should respect MCP mode setting', () => {
        const transport = new SimpleMcpPinoTransport({ mcpMode: true });
        
        transport.transform({ level: 'info', msg: 'test message' });
        
        expect(consoleSpy.error).not.toHaveBeenCalled();
      });

      it('should allow setting MCP mode dynamically', () => {
        const transport = new SimpleMcpPinoTransport({ mcpMode: false });
        
        transport.transform({ level: 'info', msg: 'before mcp' });
        expect(consoleSpy.error).toHaveBeenCalledWith('before mcp');
        
        transport.setMcpMode(true);
        transport.transform({ level: 'info', msg: 'during mcp' });
        expect(consoleSpy.error).toHaveBeenCalledTimes(1);
        
        transport.setMcpMode(false);
        transport.transform({ level: 'info', msg: 'after mcp' });
        expect(consoleSpy.error).toHaveBeenCalledTimes(2);
      });
    });

    describe('prefix functionality', () => {
      it('should add prefix to messages', () => {
        const transport = new SimpleMcpPinoTransport({ prefix: 'PINO' });
        
        transport.transform({ level: 'info', msg: 'test message' });
        
        expect(consoleSpy.error).toHaveBeenCalledWith('PINO test message');
      });

      it('should allow setting prefix dynamically', () => {
        const transport = new SimpleMcpPinoTransport();
        
        transport.setPrefix('DYNAMIC');
        transport.transform({ level: 'info', msg: 'test message' });
        
        expect(consoleSpy.error).toHaveBeenCalledWith('DYNAMIC test message');
      });
    });

    describe('child logger', () => {
      it('should create child transport with combined prefix', () => {
        const parentTransport = new SimpleMcpPinoTransport({ prefix: 'PARENT' });
        const childTransport = parentTransport.child('CHILD');
        
        childTransport.transform({ level: 'info', msg: 'test message' });
        
        expect(consoleSpy.error).toHaveBeenCalledWith('PARENT:CHILD test message');
      });

      it('should inherit parent configuration', () => {
        const parentTransport = new SimpleMcpPinoTransport({ 
          level: 'warn',
          mcpMode: true 
        });
        const childTransport = parentTransport.child('CHILD');
        
        childTransport.transform({ level: 'info', msg: 'info message' });
        childTransport.transform({ level: 'warn', msg: 'warn message' });
        
        expect(consoleSpy.error).not.toHaveBeenCalled();
        expect(consoleSpy.warn).not.toHaveBeenCalled();
      });
    });

    describe('logger access', () => {
      it('should provide access to underlying logger', () => {
        const transport = new SimpleMcpPinoTransport();
        const logger = transport.getLogger();
        
        expect(logger).toBeDefined();
        expect(typeof logger.info).toBe('function');
      });
    });
  });

  describe('createPinoTransport factory', () => {
    it('should create transport with default options', () => {
      const transport = createPinoTransport();
      expect(transport).toBeInstanceOf(SimpleMcpPinoTransport);
    });

    it('should create transport with custom options', () => {
      const transport = createPinoTransport({
        level: 'debug',
        mcpMode: true,
        prefix: 'FACTORY'
      });
      
      transport.transform({ level: 'info', msg: 'test message' });
      
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });
  });

  describe('createPinoDestination', () => {
    it('should create destination with write method', () => {
      const destination = createPinoDestination();

      expect(destination).toHaveProperty('write');
      expect(destination).toHaveProperty('end');
      expect(destination).toHaveProperty('destroy');
      expect(typeof destination.write).toBe('function');
    });

    it('should write logs through destination', () => {
      const destination = createPinoDestination({ level: 'debug' });

      destination.write({ level: 'info', msg: 'destination message' });

      expect(consoleSpy.error).toHaveBeenCalledWith('destination message');
    });
  });

  describe('browser compatibility', () => {
    it('should handle browser environment gracefully', () => {
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

    it('should allow createPinoDestination in browser environment', () => {
      // Mock browser environment
      const originalWindow = global.window;
      (global as any).window = {};

      try {
        const destination = createPinoDestination({ level: 'debug' });

        expect(destination).toHaveProperty('write');
        destination.write({ level: 'info', msg: 'browser message' });

        expect(consoleSpy.error).toHaveBeenCalledWith('browser message');
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

  describe('file logging support', () => {
    const testLogFile = './test-logs-pino/pino-test.log';

    beforeEach(() => {
      try {
        if (fs.existsSync(testLogFile)) {
          fs.unlinkSync(testLogFile);
        }
        if (fs.existsSync('./test-logs-pino') && fs.readdirSync('./test-logs-pino').length === 0) {
          fs.rmdirSync('./test-logs-pino');
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    afterEach(() => {
      try {
        if (fs.existsSync(testLogFile)) {
          fs.unlinkSync(testLogFile);
        }
        // Only remove directory if it's empty
        if (fs.existsSync('./test-logs-pino') && fs.readdirSync('./test-logs-pino').length === 0) {
          fs.rmdirSync('./test-logs-pino');
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should create transport with file logging option', async () => {
      const transport = new SimpleMcpPinoTransport({
        level: 'debug',
        logToFile: testLogFile
      });

      transport.transform({
        level: 'info',
        msg: 'pino file test'
      });

      await transport.close();

      expect(fs.existsSync(testLogFile)).toBe(true);
      const logContent = fs.readFileSync(testLogFile, 'utf8');
      expect(logContent).toContain('INFO: pino file test');
    });

    it('should write to file in MCP mode while suppressing console', async () => {
      const transport = new SimpleMcpPinoTransport({
        level: 'debug',
        mcpMode: true,
        logToFile: testLogFile
      });

      transport.transform({
        level: 'info',
        msg: 'mcp pino message'
      });

      await transport.close();

      // Should not log to console in MCP mode
      expect(consoleSpy.error).not.toHaveBeenCalled();

      // But should write to file
      const logContent = fs.readFileSync(testLogFile, 'utf8');
      expect(logContent).toContain('INFO: mcp pino message');
    });

    it('should allow setting log file dynamically', async () => {
      const transport = new SimpleMcpPinoTransport({ level: 'debug' });

      await transport.setLogFile(testLogFile);
      transport.transform({
        level: 'info',
        msg: 'dynamic file test'
      });

      await transport.close();

      const logContent = fs.readFileSync(testLogFile, 'utf8');
      expect(logContent).toContain('INFO: dynamic file test');
    });
  });

  describe('createPinoDestination with file logging', () => {
    const testLogFile = './test-logs-pino/pino-destination-test.log';

    afterEach(() => {
      try {
        if (fs.existsSync(testLogFile)) {
          fs.unlinkSync(testLogFile);
        }
        // Only remove directory if it's empty
        if (fs.existsSync('./test-logs-pino') && fs.readdirSync('./test-logs-pino').length === 0) {
          fs.rmdirSync('./test-logs-pino');
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should write logs through destination to file', async () => {
      const destination = createPinoDestination({
        level: 'debug',
        logToFile: testLogFile
      });

      destination.write({
        level: 'info',
        msg: 'destination file message'
      });

      await destination.end();

      const logContent = fs.readFileSync(testLogFile, 'utf8');
      expect(logContent).toContain('INFO: destination file message');
    });

    it('should handle file write errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Try to write to an invalid path
      const transport = new SimpleMcpPinoTransport({
        level: 'debug',
        logToFile: '/invalid/path/test.log'
      });

      transport.transform({
        level: 'info',
        msg: 'test message'
      });

      await transport.close();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to initialize file logging'));
      consoleSpy.mockRestore();
    });

    it('should handle file permission errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Create a read-only directory (if possible on the system)
      const readOnlyDir = './test-logs/readonly';
      const readOnlyFile = `${readOnlyDir}/readonly.log`;

      try {
        fs.mkdirSync(readOnlyDir, { recursive: true });
        fs.chmodSync(readOnlyDir, 0o444); // Read-only

        const transport = new SimpleMcpPinoTransport({
          level: 'debug',
          logToFile: readOnlyFile
        });

        transport.transform({
          level: 'info',
          msg: 'permission test'
        });

        await transport.close();

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('File logging will be disabled'));
      } catch (error) {
        // Skip test if we can't create read-only directory (e.g., on Windows)
        console.log('Skipping permission test:', error);
      } finally {
        try {
          fs.chmodSync(readOnlyDir, 0o755); // Restore permissions
          fs.rmSync(readOnlyDir, { recursive: true, force: true });
        } catch (error) {
          // Ignore cleanup errors
        }
        consoleSpy.mockRestore();
      }
    });

    it('should continue logging to console when file logging fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const transport = new SimpleMcpPinoTransport({
        level: 'debug',
        mcpMode: false, // Allow console logging
        logToFile: '/invalid/path/test.log'
      });

      transport.transform({
        level: 'info',
        msg: 'fallback test'
      });

      await transport.close();

      // Should still log to console even if file logging fails
      expect(consoleSpy).toHaveBeenCalledWith('fallback test');
      consoleSpy.mockRestore();
    });
  });
});
