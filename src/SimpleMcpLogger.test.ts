import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger, logger, createMcpLogger, createCliLogger, type LogLevel } from './SimpleMcpLogger.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('SimpleMcpLogger', () => {
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

  describe('file logging', () => {
    const testLogFile = './test-logs/test.log';



    beforeEach(() => {
      // Clean up test log file
      try {
        if (fs.existsSync(testLogFile)) {
          fs.unlinkSync(testLogFile);
        }
        if (fs.existsSync('./test-logs')) {
          fs.rmdirSync('./test-logs');
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    afterEach(() => {
      // Clean up test log file
      try {
        if (fs.existsSync(testLogFile)) {
          fs.unlinkSync(testLogFile);
        }
        if (fs.existsSync('./test-logs')) {
          fs.rmdirSync('./test-logs');
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should create log file and directory if they do not exist', async () => {
      const testLogger = new Logger({
        logToFile: testLogFile,
        level: 'debug'
      });

      testLogger.info('test message');
      await testLogger.close();

      expect(fs.existsSync('./test-logs')).toBe(true);
      expect(fs.existsSync(testLogFile)).toBe(true);
    });

    it('should write logs to file when logToFile is specified', async () => {
      const testLogger = new Logger({
        logToFile: testLogFile,
        level: 'debug'
      });

      testLogger.info('info message');
      testLogger.error('error message');
      await testLogger.close();

      const logContent = fs.readFileSync(testLogFile, 'utf8');
      expect(logContent).toContain('INFO: info message');
      expect(logContent).toContain('ERROR: error message');
    });

    it('should write logs with metadata to file', async () => {
      const testLogger = new Logger({
        logToFile: testLogFile,
        level: 'debug'
      });

      testLogger.info('test message', { userId: 123, action: 'login' });
      await testLogger.close();

      const logContent = fs.readFileSync(testLogFile, 'utf8');
      expect(logContent).toContain('INFO: test message {"userId":123,"action":"login"}');
    });

    it('should include timestamp in file logs', async () => {
      const testLogger = new Logger({
        logToFile: testLogFile,
        level: 'debug'
      });

      testLogger.info('timestamped message');
      await testLogger.close();

      const logContent = fs.readFileSync(testLogFile, 'utf8');
      expect(logContent).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] INFO: timestamped message/);
    });

    it('should respect log levels when writing to file', async () => {
      const testLogger = new Logger({
        logToFile: testLogFile,
        level: 'warn'
      });

      testLogger.debug('debug message');
      testLogger.info('info message');
      testLogger.warn('warn message');
      testLogger.error('error message');
      await testLogger.close();

      const logContent = fs.readFileSync(testLogFile, 'utf8');
      expect(logContent).not.toContain('debug message');
      expect(logContent).not.toContain('info message');
      expect(logContent).toContain('WARN: warn message');
      expect(logContent).toContain('ERROR: error message');
    });

    it('should write to file in MCP mode while suppressing console', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const testLogger = new Logger({
        logToFile: testLogFile,
        mcpMode: true,
        level: 'debug'
      });

      testLogger.info('mcp file message');
      await testLogger.close();

      // Should not log to console in MCP mode
      expect(consoleSpy).not.toHaveBeenCalled();

      // But should write to file
      const logContent = fs.readFileSync(testLogFile, 'utf8');
      expect(logContent).toContain('INFO: mcp file message');

      consoleSpy.mockRestore();
    });

    it('should log to both console and file when not in MCP mode', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const testLogger = new Logger({
        logToFile: testLogFile,
        mcpMode: false,
        level: 'debug'
      });

      testLogger.info('dual output message');
      await testLogger.close();

      // Should log to console (info uses console.error for MCP compliance)
      expect(consoleSpy).toHaveBeenCalledWith('dual output message');

      // And write to file
      const logContent = fs.readFileSync(testLogFile, 'utf8');
      expect(logContent).toContain('INFO: dual output message');

      consoleSpy.mockRestore();
    });

    it('should handle file write errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Try to write to an invalid path
      const testLogger = new Logger({
        logToFile: '/invalid/path/test.log',
        level: 'debug'
      });

      testLogger.info('test message');
      await testLogger.close();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to initialize file logging'));
      consoleSpy.mockRestore();
    });

    it('should allow changing log file path dynamically', async () => {
      const testLogger = new Logger({ level: 'debug' });
      const newLogFile = './test-logs/new-test.log';

      await testLogger.setLogFile(testLogFile);
      testLogger.info('first message');

      await testLogger.setLogFile(newLogFile);
      testLogger.info('second message');
      await testLogger.close();

      // First file should have first message
      const firstContent = fs.readFileSync(testLogFile, 'utf8');
      expect(firstContent).toContain('INFO: first message');
      expect(firstContent).not.toContain('second message');

      // Second file should have second message
      const secondContent = fs.readFileSync(newLogFile, 'utf8');
      expect(secondContent).toContain('INFO: second message');
      expect(secondContent).not.toContain('first message');

      // Cleanup
      fs.unlinkSync(newLogFile);
    });

    it('should include prefix in file logs', async () => {
      const testLogger = new Logger({
        logToFile: testLogFile,
        prefix: 'TEST',
        level: 'debug'
      });

      testLogger.info('prefixed message');
      await testLogger.close();

      const logContent = fs.readFileSync(testLogFile, 'utf8');
      expect(logContent).toContain('INFO: TEST prefixed message');
    });

    it('should handle concurrent file access from multiple loggers', async () => {
      const logger1 = new Logger({
        logToFile: testLogFile,
        prefix: 'LOGGER1',
        level: 'debug'
      });

      const logger2 = new Logger({
        logToFile: testLogFile,
        prefix: 'LOGGER2',
        level: 'debug'
      });

      // Write messages from both loggers
      logger1.info('message from logger 1');
      logger2.info('message from logger 2');
      logger1.warn('warning from logger 1');
      logger2.error('error from logger 2');

      await logger1.close();
      await logger2.close();

      const logContent = fs.readFileSync(testLogFile, 'utf8');
      expect(logContent).toContain('INFO: LOGGER1 message from logger 1');
      expect(logContent).toContain('INFO: LOGGER2 message from logger 2');
      expect(logContent).toContain('WARN: LOGGER1 warning from logger 1');
      expect(logContent).toContain('ERROR: LOGGER2 error from logger 2');
    });

    it('should handle rapid sequential writes to the same file', async () => {
      const logger = new Logger({
        logToFile: testLogFile,
        level: 'debug'
      });

      // Write many messages rapidly
      for (let i = 0; i < 100; i++) {
        logger.info(`rapid message ${i}`);
      }

      await logger.close();

      const logContent = fs.readFileSync(testLogFile, 'utf8');
      const lines = logContent.split('\n').filter(line => line.trim());

      // Should have all 100 messages
      expect(lines.length).toBe(100);
      expect(logContent).toContain('INFO: rapid message 0');
      expect(logContent).toContain('INFO: rapid message 99');
    });
  });

  describe('createMcpLogger with file logging', () => {
    const testLogFile = './test-logs/mcp-test.log';
    
    afterEach(() => {
      try {
        if (fs.existsSync(testLogFile)) {
          fs.unlinkSync(testLogFile);
        }
        if (fs.existsSync('./test-logs')) {
          fs.rmdirSync('./test-logs');
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    it('should create MCP logger with file logging', async () => {
      const mcpLogger = createMcpLogger('MCP', testLogFile);

      mcpLogger.error('mcp error message');
      await mcpLogger.close();

      // Should not log to console in MCP mode
      expect(consoleSpy.error).not.toHaveBeenCalled();

      // But should write to file
      const logContent = fs.readFileSync(testLogFile, 'utf8');
      expect(logContent).toContain('ERROR: MCP mcp error message');
    });
  });
});
