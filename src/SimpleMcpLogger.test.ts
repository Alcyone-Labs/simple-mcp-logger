import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger, logger, createMcpLogger, createCliLogger, type LogLevel } from './SimpleMcpLogger.js';

describe('SimpleMcpLogger', () => {
  let consoleSpy: {
    debug: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    trace: ReturnType<typeof vi.spyOn>;
    table: ReturnType<typeof vi.spyOn>;
    group: ReturnType<typeof vi.spyOn>;
    groupCollapsed: ReturnType<typeof vi.spyOn>;
    groupEnd: ReturnType<typeof vi.spyOn>;
    time: ReturnType<typeof vi.spyOn>;
    timeEnd: ReturnType<typeof vi.spyOn>;
    timeLog: ReturnType<typeof vi.spyOn>;
    count: ReturnType<typeof vi.spyOn>;
    countReset: ReturnType<typeof vi.spyOn>;
    assert: ReturnType<typeof vi.spyOn>;
    clear: ReturnType<typeof vi.spyOn>;
    dir: ReturnType<typeof vi.spyOn>;
    dirxml: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      trace: vi.spyOn(console, 'trace').mockImplementation(() => {}),
      table: vi.spyOn(console, 'table').mockImplementation(() => {}),
      group: vi.spyOn(console, 'group').mockImplementation(() => {}),
      groupCollapsed: vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {}),
      groupEnd: vi.spyOn(console, 'groupEnd').mockImplementation(() => {}),
      time: vi.spyOn(console, 'time').mockImplementation(() => {}),
      timeEnd: vi.spyOn(console, 'timeEnd').mockImplementation(() => {}),
      timeLog: vi.spyOn(console, 'timeLog').mockImplementation(() => {}),
      count: vi.spyOn(console, 'count').mockImplementation(() => {}),
      countReset: vi.spyOn(console, 'countReset').mockImplementation(() => {}),
      assert: vi.spyOn(console, 'assert').mockImplementation(() => {}),
      clear: vi.spyOn(console, 'clear').mockImplementation(() => {}),
      dir: vi.spyOn(console, 'dir').mockImplementation(() => {}),
      dirxml: vi.spyOn(console, 'dirxml').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Logger class', () => {
    it('should create a logger with default config', () => {
      const testLogger = new Logger();
      expect(testLogger).toBeInstanceOf(Logger);
    });

    it('should create a logger with custom config', () => {
      const testLogger = new Logger({
        level: 'debug',
        mcpMode: true,
        prefix: 'TEST'
      });
      expect(testLogger).toBeInstanceOf(Logger);
    });

    describe('log level filtering', () => {
      const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
      
      levels.forEach((level, index) => {
        it(`should respect ${level} log level`, () => {
          const testLogger = new Logger({ level });
          
          testLogger.debug('debug message');
          testLogger.info('info message');
          testLogger.warn('warn message');
          testLogger.error('error message');

          if (index <= 0) expect(consoleSpy.debug).toHaveBeenCalled();
          else expect(consoleSpy.debug).not.toHaveBeenCalled();

          if (index <= 1) expect(consoleSpy.error).toHaveBeenCalledWith('info message');
          else expect(consoleSpy.error).not.toHaveBeenCalledWith('info message');

          if (index <= 2) expect(consoleSpy.warn).toHaveBeenCalled();
          else expect(consoleSpy.warn).not.toHaveBeenCalled();

          expect(consoleSpy.error).toHaveBeenCalledWith('error message');
        });
      });

      it('should not log anything when level is silent', () => {
        const testLogger = new Logger({ level: 'silent' });
        
        testLogger.debug('debug message');
        testLogger.info('info message');
        testLogger.warn('warn message');
        testLogger.error('error message');

        expect(consoleSpy.debug).not.toHaveBeenCalled();
        expect(consoleSpy.error).not.toHaveBeenCalled();
        expect(consoleSpy.warn).not.toHaveBeenCalled();
      });
    });

    describe('MCP mode', () => {
      it('should suppress all output in MCP mode', () => {
        const testLogger = new Logger({ mcpMode: true });
        
        testLogger.debug('debug message');
        testLogger.info('info message');
        testLogger.warn('warn message');
        testLogger.error('error message');

        expect(consoleSpy.debug).not.toHaveBeenCalled();
        expect(consoleSpy.error).not.toHaveBeenCalled();
        expect(consoleSpy.warn).not.toHaveBeenCalled();
      });

      it('should allow mcpError to bypass MCP mode', () => {
        const testLogger = new Logger({ mcpMode: true });
        
        testLogger.mcpError('critical error');
        
        expect(consoleSpy.error).toHaveBeenCalledWith('critical error');
      });

      it('should allow setting MCP mode dynamically', () => {
        const testLogger = new Logger({ mcpMode: false });
        
        testLogger.info('before mcp mode');
        expect(consoleSpy.error).toHaveBeenCalledWith('before mcp mode');
        
        testLogger.setMcpMode(true);
        testLogger.info('during mcp mode');
        expect(consoleSpy.error).toHaveBeenCalledTimes(1);
        
        testLogger.setMcpMode(false);
        testLogger.info('after mcp mode');
        expect(consoleSpy.error).toHaveBeenCalledTimes(2);
      });
    });

    describe('prefix functionality', () => {
      it('should add prefix to messages', () => {
        const testLogger = new Logger({ prefix: 'TEST' });

        testLogger.info('message');

        expect(consoleSpy.error).toHaveBeenCalledWith('TEST message');
      });

      it('should allow setting prefix dynamically', () => {
        const testLogger = new Logger();

        testLogger.setPrefix('DYNAMIC');
        testLogger.info('message');

        expect(consoleSpy.error).toHaveBeenCalledWith('DYNAMIC message');
      });

      it('should handle empty prefix', () => {
        const testLogger = new Logger({ prefix: '' });

        testLogger.info('message');

        expect(consoleSpy.error).toHaveBeenCalledWith('message');
      });
    });

    describe('console method compatibility', () => {
      let testLogger: Logger;

      beforeEach(() => {
        testLogger = new Logger({ level: 'debug' });
      });

      it('should support log method as alias for info', () => {
        testLogger.log('test message');

        expect(consoleSpy.error).toHaveBeenCalledWith('test message');
      });

      it('should support trace method', () => {
        testLogger.trace('trace message');

        expect(consoleSpy.trace).toHaveBeenCalledWith('trace message');
      });

      it('should support trace without message', () => {
        testLogger.trace();

        expect(consoleSpy.trace).toHaveBeenCalledWith();
      });

      it('should support table method', () => {
        const data = [{ name: 'John', age: 30 }];
        testLogger.table(data);

        expect(consoleSpy.table).toHaveBeenCalledWith(data, undefined);
      });

      it('should support table with columns', () => {
        const data = [{ name: 'John', age: 30 }];
        const columns = ['name'];
        testLogger.table(data, columns);

        expect(consoleSpy.table).toHaveBeenCalledWith(data, columns);
      });

      it('should support group methods', () => {
        testLogger.group('test group');
        expect(consoleSpy.group).toHaveBeenCalledWith('test group');

        testLogger.groupCollapsed('collapsed group');
        expect(consoleSpy.groupCollapsed).toHaveBeenCalledWith('collapsed group');

        testLogger.groupEnd();
        expect(consoleSpy.groupEnd).toHaveBeenCalled();
      });

      it('should support group methods without labels', () => {
        testLogger.group();
        expect(consoleSpy.group).toHaveBeenCalledWith();

        testLogger.groupCollapsed();
        expect(consoleSpy.groupCollapsed).toHaveBeenCalledWith();
      });

      it('should support timing methods', () => {
        testLogger.time('timer1');
        expect(consoleSpy.time).toHaveBeenCalledWith('timer1');

        testLogger.timeLog('timer1', 'checkpoint');
        expect(consoleSpy.timeLog).toHaveBeenCalledWith('timer1', 'checkpoint');

        testLogger.timeEnd('timer1');
        expect(consoleSpy.timeEnd).toHaveBeenCalledWith('timer1');
      });

      it('should support timing methods without labels', () => {
        testLogger.time();
        expect(consoleSpy.time).toHaveBeenCalledWith(undefined);

        testLogger.timeEnd();
        expect(consoleSpy.timeEnd).toHaveBeenCalledWith(undefined);
      });

      it('should support count methods', () => {
        testLogger.count('counter1');
        expect(consoleSpy.count).toHaveBeenCalledWith('counter1');

        testLogger.countReset('counter1');
        expect(consoleSpy.countReset).toHaveBeenCalledWith('counter1');
      });

      it('should support assert method', () => {
        testLogger.assert(false, 'assertion failed');
        expect(consoleSpy.assert).toHaveBeenCalledWith(false, 'assertion failed');
      });

      it('should support assert without message', () => {
        testLogger.assert(true, 'extra', 'args');
        expect(consoleSpy.assert).toHaveBeenCalledWith(true, 'extra', 'args');
      });

      it('should support clear method', () => {
        testLogger.clear();
        expect(consoleSpy.clear).toHaveBeenCalled();
      });

      it('should support dir and dirxml methods', () => {
        const obj = { test: 'value' };

        testLogger.dir(obj);
        expect(consoleSpy.dir).toHaveBeenCalledWith(obj, undefined);

        testLogger.dirxml(obj);
        expect(consoleSpy.dirxml).toHaveBeenCalledWith(obj);
      });
    });

    describe('child logger', () => {
      it('should create child logger with combined prefix', () => {
        const parentLogger = new Logger({ prefix: 'PARENT' });
        const childLogger = parentLogger.child('CHILD');

        childLogger.info('message');

        expect(consoleSpy.error).toHaveBeenCalledWith('PARENT:CHILD message');
      });

      it('should create child logger from logger without prefix', () => {
        const parentLogger = new Logger();
        const childLogger = parentLogger.child('CHILD');

        childLogger.info('message');

        expect(consoleSpy.error).toHaveBeenCalledWith('CHILD message');
      });

      it('should inherit parent configuration', () => {
        const parentLogger = new Logger({ level: 'warn', mcpMode: true });
        const childLogger = parentLogger.child('CHILD');

        childLogger.info('info message');
        childLogger.warn('warn message');

        expect(consoleSpy.error).not.toHaveBeenCalled();
        expect(consoleSpy.warn).not.toHaveBeenCalled();
      });
    });
  });

  describe('factory functions', () => {
    describe('createMcpLogger', () => {
      it('should create logger with MCP mode enabled', () => {
        const mcpLogger = createMcpLogger();

        mcpLogger.info('info message');
        mcpLogger.error('error message');

        expect(consoleSpy.error).not.toHaveBeenCalled();
      });

      it('should create logger with prefix', () => {
        const mcpLogger = createMcpLogger('MCP');

        mcpLogger.mcpError('critical error');

        expect(consoleSpy.error).toHaveBeenCalledWith('MCP critical error');
      });

      it('should have error level by default', () => {
        const mcpLogger = createMcpLogger();

        mcpLogger.warn('warn message');
        mcpLogger.error('error message');

        expect(consoleSpy.warn).not.toHaveBeenCalled();
        expect(consoleSpy.error).not.toHaveBeenCalled();
      });
    });

    describe('createCliLogger', () => {
      it('should create logger with CLI mode (MCP disabled)', () => {
        const cliLogger = createCliLogger();

        cliLogger.info('info message');

        expect(consoleSpy.error).toHaveBeenCalledWith('info message');
      });

      it('should create logger with custom level', () => {
        const cliLogger = createCliLogger('warn');

        cliLogger.info('info message');
        cliLogger.warn('warn message');

        expect(consoleSpy.error).not.toHaveBeenCalledWith('info message');
        expect(consoleSpy.warn).toHaveBeenCalledWith('warn message');
      });

      it('should create logger with prefix', () => {
        const cliLogger = createCliLogger('info', 'CLI');

        cliLogger.info('message');

        expect(consoleSpy.error).toHaveBeenCalledWith('CLI message');
      });
    });
  });

  describe('global logger instance', () => {
    it('should be available as named export', () => {
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should work with default configuration', () => {
      logger.info('global logger test');

      expect(consoleSpy.error).toHaveBeenCalledWith('global logger test');
    });
  });

  describe('drop-in console replacement', () => {
    it('should have all console methods', () => {
      const testLogger = new Logger();

      const consoleMethods = [
        'debug', 'info', 'warn', 'error', 'log', 'trace', 'table',
        'group', 'groupCollapsed', 'groupEnd', 'time', 'timeEnd', 'timeLog',
        'count', 'countReset', 'assert', 'clear', 'dir', 'dirxml'
      ];

      consoleMethods.forEach(method => {
        expect(typeof (testLogger as any)[method]).toBe('function');
      });
    });

    it('should work as console replacement with proper method signatures', () => {
      const testLogger = new Logger({ level: 'debug' });

      testLogger.log('test message');
      testLogger.warn('warning message');
      testLogger.error('error message');
      testLogger.debug('debug message');
      testLogger.trace('trace message');

      expect(consoleSpy.error).toHaveBeenCalledWith('test message');
      expect(consoleSpy.warn).toHaveBeenCalledWith('warning message');
      expect(consoleSpy.error).toHaveBeenCalledWith('error message');
      expect(consoleSpy.debug).toHaveBeenCalledWith('debug message');
      expect(consoleSpy.trace).toHaveBeenCalledWith('trace message');
    });
  });
});
