# SimpleMcpLogger

**The logging solution for MCP (Model Context Protocol) servers**

SimpleMcpLogger solves a critical problem in MCP development: **preventing console output from breaking MCP communication**. When building MCP servers, any stray `console.log()` or logging output to STDOUT can corrupt the JSON-RPC protocol, causing client communication failures.

This library provides a **drop-in replacement** for console and popular loggers (Winston, Pino) that automatically suppresses output in MCP mode while preserving full logging functionality during development and testing.

## The MCP Problem

MCP servers communicate via JSON-RPC over STDOUT/STDIN. Any non-MCP output to **STDOUT** breaks the protocol, but **STDERR is perfectly safe** for debugging:

```typescript
// ❌ This breaks MCP communication (writes to STDOUT)
console.log('Debug info');          // Corrupts STDOUT → Protocol failure
logger.info('Processing request');  // Invalid MCP message → Connection lost

// ✅ This works perfectly (suppressed STDOUT, safe STDERR)
mcpLogger.info('Processing request');     // Suppressed in MCP mode
mcpLogger.mcpError('Debug info', data);   // Safe: writes to STDERR
```

**Key insight**: STDOUT is reserved for MCP protocol messages, but STDERR is available for debugging and logging without breaking communication.

**SimpleMcpLogger ensures your MCP servers work reliably** by preventing accidental STDOUT output while providing safe STDERR channels for debugging.

## Features

- **MCP-compliant** - Automatically suppresses STDOUT output in MCP mode to prevent protocol corruption
- **Drop-in replacement** - Compatible with console, Winston, and Pino APIs
- **Protocol protection** - Prevents accidental console output from breaking MCP communication
- **Development-friendly** - Full logging during development, silent in production MCP mode
- **Bundling optimized** - Modular design with separate adapter packages
- **TypeScript-first** - Complete type safety and IntelliSense support
- **Zero dependencies** - Core logger has no external dependencies
- **Adapter ecosystem** - Winston and Pino transports for existing codebases
- **Battle-tested** - Comprehensive test suite with real-world MCP scenarios

## Installation

```bash
npm install @alcyone-labs/simple-mcp-logger
```

### Bundling-Friendly Design

SimpleMcpLogger uses a modular design to keep your bundles small:

- **Main package** (`@alcyone-labs/simple-mcp-logger`) - Core logger with zero external dependencies
- **Adapters** (`@alcyone-labs/simple-mcp-logger/adapters`) - Winston/Pino adapters with peer dependencies

This means you only bundle what you actually use!

```typescript
// Core logger (no external dependencies bundled)
import { Logger } from '@alcyone-labs/simple-mcp-logger';

// Adapters (requires peer dependencies)
import { SimpleMcpWinstonTransport } from '@alcyone-labs/simple-mcp-logger/adapters';
```

## Quick Start

### Basic Usage

```typescript
import { Logger, logger } from '@alcyone-labs/simple-mcp-logger';

// Use the global logger instance
logger.info('Hello, world!');
logger.error('Something went wrong');

// Create a custom logger
const myLogger = new Logger({
  level: 'debug',
  prefix: 'MyApp',
  mcpMode: false
});

myLogger.debug('Debug message');
myLogger.info('Info message');

// For MCP servers: use mcpError() for debugging (safe STDERR output)
myLogger.mcpError('Debug info visible in client logs');
```

## MCP Server Usage (Primary Use Case)

**This is why SimpleMcpLogger exists**: to prevent console output from corrupting MCP protocol communication.

### The Problem
MCP servers communicate via JSON-RPC over STDOUT. Any logging to **STDOUT** breaks this, but **STDERR is safe**:

```typescript
// ❌ BROKEN: These write to STDOUT and corrupt MCP communication
console.log('Processing request');  // STDOUT → Protocol corruption
logger.info('Debug info');          // STDOUT → JSON-RPC breaks

// Client receives: {"jsonrpc":"2.0",...}Processing request{"id":1,...}
// Result: Invalid JSON, connection fails

// ✅ SAFE: STDERR doesn't interfere with MCP protocol
console.error('Debug info');        // STDERR → Safe for debugging
process.stderr.write('Log data');   // STDERR → Visible to client logs
```

### The Solution
SimpleMcpLogger automatically suppresses **STDOUT** output in MCP mode while preserving **STDERR** for debugging:

```typescript
import { createMcpLogger } from '@alcyone-labs/simple-mcp-logger';

// Create MCP-safe logger (automatically detects MCP environment)
const logger = createMcpLogger('MyMcpServer');

// ✅ SAFE: These are suppressed in MCP mode (no STDOUT output)
logger.info('Processing request');     // Silent in MCP mode
logger.debug('User data:', userData);  // Silent in MCP mode
logger.warn('Rate limit approaching'); // Silent in MCP mode

// ✅ SAFE: Critical debugging via STDERR (visible to client logs)
logger.mcpError('Database connection failed'); // STDERR → Always visible
logger.mcpError('Request state:', requestData); // STDERR → Safe debugging
```

### Hijacking Console for MCP Safety

Replace console globally to catch all logging in your MCP server:

```typescript
import { createMcpLogger } from '@alcyone-labs/simple-mcp-logger';

// Replace console at startup (before any other code runs)
const mcpLogger = createMcpLogger('MCP-Server');
globalThis.console = mcpLogger as any;

// Now ALL console calls are MCP-safe
console.log('This is safe');        // Suppressed in MCP mode
console.error('This is safe too');  // Suppressed in MCP mode
someLibrary.log('Third-party logs'); // Also safe!
```

### Environment Detection

SimpleMcpLogger automatically detects MCP environments:

```typescript
// Automatically enables MCP mode when:
// - No TTY detected (typical MCP server environment)
// - MCP_MODE environment variable is set
// - Explicitly configured

const logger = createMcpLogger(); // Auto-detects MCP mode
```

### Console Replacement

```typescript
import { Logger } from '@alcyone-labs/simple-mcp-logger';

// Replace console globally (do this at application startup)
const logger = new Logger({ level: 'info', prefix: 'App' });
globalThis.console = logger as any;

// Now all console calls use SimpleMcpLogger
console.log('This uses SimpleMcpLogger');
console.error('This too');
```

**⚠️ Important:** Replace console at application startup before any other logging occurs to avoid infinite loops.

### General Purpose Logging (Non-MCP)

```typescript
import { Logger, createCliLogger } from '@alcyone-labs/simple-mcp-logger';

// Perfect for web apps, APIs, CLI tools, etc.
const appLogger = createCliLogger('info', 'MyApp');

appLogger.info('Server starting on port 3000');
appLogger.warn('High memory usage detected');
appLogger.error('Database connection failed');

// Use all console methods
appLogger.table([{user: 'john', status: 'active'}]);
appLogger.time('API Response');
// ... some operation
appLogger.timeEnd('API Response');
```

## API Reference

### Logger Class

#### Constructor

```typescript
new Logger(config?: Partial<LoggerConfig>)
```

#### Configuration Options

```typescript
interface LoggerConfig {
  level: LogLevel;        // 'debug' | 'info' | 'warn' | 'error' | 'silent'
  mcpMode: boolean;       // Suppress output when true
  prefix?: string;        // Prefix for all messages
}
```

#### Methods

All standard console methods are supported:

- `debug(message: string, ...args: any[]): void`
- `info(message: string, ...args: any[]): void`
- `warn(message: string, ...args: any[]): void`
- `error(message: string, ...args: any[]): void`
- `log(message: string, ...args: any[]): void` - Alias for info
- `trace(message?: string, ...args: any[]): void`
- `table(data: any, columns?: string[]): void`
- `group(label?: string): void`
- `groupCollapsed(label?: string): void`
- `groupEnd(): void`
- `time(label?: string): void`
- `timeEnd(label?: string): void`
- `timeLog(label?: string, ...args: any[]): void`
- `count(label?: string): void`
- `countReset(label?: string): void`
- `assert(condition: boolean, message?: string, ...args: any[]): void`
- `clear(): void`
- `dir(obj: any, options?: any): void`
- `dirxml(obj: any): void`

#### Special Methods

- `mcpError(message: string, ...args: any[]): void` - Always logs even in MCP mode
- `child(prefix: string): Logger` - Create child logger with combined prefix
- `setMcpMode(enabled: boolean): void` - Toggle MCP mode
- `setLevel(level: LogLevel): void` - Change log level
- `setPrefix(prefix: string): void` - Change prefix

### Factory Functions

```typescript
// Create logger for MCP mode
createMcpLogger(prefix?: string): Logger

// Create logger for CLI mode
createCliLogger(level?: LogLevel, prefix?: string): Logger
```

## Adapters for Existing Codebases

**Migrate existing MCP servers to be protocol-safe** without changing your logging code.

If you have an existing codebase using Winston or Pino, you can add SimpleMcpLogger as a transport to make it MCP-compliant without refactoring your logging calls.

**Bundling-Friendly Design**: Adapters are available as a separate import to avoid bundling dependencies you don't need.

### Installation

For adapters, you'll need to install the peer dependencies:

```bash
# For Winston adapter
npm install winston winston-transport

# For Pino adapter
npm install pino

# Or install both
npm install winston winston-transport pino
```

### Winston Adapter

Make your existing Winston-based MCP server protocol-safe:

```typescript
// Import adapters separately to avoid bundling unused dependencies
import { createWinstonTransport } from '@alcyone-labs/simple-mcp-logger/adapters';
import winston from 'winston';

// Replace your existing Winston transports with MCP-safe transport
const logger = winston.createLogger({
  transports: [
    createWinstonTransport({
      level: 'debug',
      mcpMode: true,  // Automatically suppresses STDOUT in MCP mode
      prefix: 'MCP-Server'
    })
  ]
});

// Your existing logging code works unchanged
logger.info('Processing MCP request');  // Safe in MCP mode
logger.error('Request failed');         // Safe in MCP mode
```

### Pino Adapter

Make your existing Pino-based MCP server protocol-safe:

```typescript
// Import adapters separately to avoid bundling unused dependencies
import { createPinoDestination } from '@alcyone-labs/simple-mcp-logger/adapters';
import pino from 'pino';

// Replace your existing Pino destination with MCP-safe destination
const destination = createPinoDestination({
  level: 'debug',
  mcpMode: true,  // Automatically suppresses STDOUT in MCP mode
  prefix: 'MCP-Server'
});

const logger = pino({ level: 'debug' }, destination);

// Your existing logging code works unchanged
logger.info('Processing MCP request');  // Safe in MCP mode
logger.error('Request failed');         // Safe in MCP mode
```

## MCP Best Practices

### 🚨 Critical: Initialize Before Any Logging

Replace console **immediately** at application startup to catch all logging:

```typescript
// ✅ CORRECT: Do this FIRST, before importing any other modules
import { createMcpLogger } from '@alcyone-labs/simple-mcp-logger';
globalThis.console = createMcpLogger('MCP-Server') as any;

// Now import your application code
import './my-mcp-server.js';
```

```typescript
// ❌ WRONG: Too late, some logging may have already occurred
import './my-mcp-server.js';
import { createMcpLogger } from '@alcyone-labs/simple-mcp-logger';
globalThis.console = createMcpLogger('MCP-Server') as any;
```

### 🔍 Debugging MCP Servers

Use `mcpError()` for debugging that needs to be visible - it writes to **STDERR** which is safe for MCP:

```typescript
const logger = createMcpLogger('MCP-Server');

// Silent in MCP mode (suppressed STDOUT - good for normal operation)
logger.info('Processing request');      // No output in MCP mode
logger.debug('User data:', userData);   // No output in MCP mode

// Always visible via STDERR (safe for MCP protocol - good for debugging)
logger.mcpError('Critical error:', error);        // STDERR → Visible in client logs
logger.mcpError('Server state:', serverState);    // STDERR → Safe debugging
logger.mcpError('Performance metric:', timing);   // STDERR → Monitoring data
```

**Why STDERR is safe**: MCP protocol only uses STDOUT for JSON-RPC messages. STDERR output appears in client logs without interfering with protocol communication.

### 📡 Understanding STDOUT vs STDERR in MCP

**STDOUT (Protocol Channel)**:
- Reserved exclusively for MCP JSON-RPC messages
- Any non-MCP output breaks protocol communication
- Must be kept clean for reliable client connections

**STDERR (Debugging Channel)**:
- Safe for logging, debugging, and monitoring output
- Visible in client logs without protocol interference
- Perfect for error reporting and diagnostic information

```typescript
// ❌ STDOUT - Reserved for MCP protocol
process.stdout.write('{"jsonrpc":"2.0",...}'); // MCP messages only

// ✅ STDERR - Safe for debugging
process.stderr.write('Debug: Processing request\n');
console.error('Server metrics:', metrics);
logger.mcpError('Performance data:', data);
```

### 🧪 Testing MCP Servers

Disable MCP mode during testing to see all logs:

```typescript
const logger = createMcpLogger('Test-Server', false); // mcpMode = false
// OR
process.env.MCP_MODE = 'false';
const logger = createMcpLogger('Test-Server'); // Auto-detects
```

## Browser Usage

SimpleMcpLogger works seamlessly in browser environments! The core logger and most adapters are browser-compatible.

### Basic Browser Usage

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module">
    import { Logger, logger, createMcpLogger } from 'https://unpkg.com/@alcyone-labs/simple-mcp-logger/dist/index.mjs';

    // Use the global logger
    logger.info('Hello from browser!');

    // Create a custom logger
    const browserLogger = new Logger({
      level: 'debug',
      prefix: 'Browser',
      mcpMode: false
    });

    browserLogger.debug('Debug message in browser');
    browserLogger.table([{name: 'John', age: 30}]);

    // Replace console globally
    globalThis.console = browserLogger;
    console.log('Now using SimpleMcpLogger!');
  </script>
</head>
<body>
  <h1>SimpleMcpLogger Browser Demo</h1>
  <p>Check the browser console for log messages!</p>
</body>
</html>
```

### Browser with Bundlers (Webpack, Vite, etc.)

```typescript
import { Logger, createMcpLogger } from '@alcyone-labs/simple-mcp-logger';

// Create logger for browser app
const appLogger = new Logger({
  level: 'info',
  prefix: 'MyApp',
  mcpMode: false
});

// Use all console methods
appLogger.log('Application started');
appLogger.group('User Actions');
appLogger.info('User clicked button');
appLogger.warn('Form validation warning');
appLogger.groupEnd();

// Time operations
appLogger.time('API Call');
// ... some async operation
appLogger.timeEnd('API Call');
```

### Browser Adapter Support

| Adapter | Browser Support | Notes |
|---------|----------------|-------|
| **Core Logger** | ✅ Full support | All console methods work |
| **Winston Adapter** | ✅ Full support | Works if Winston is browser-compatible |
| **Pino Transport** | ✅ Full support | Use `createPinoDestination()` |
| **Pino Logger Factory** | ❌ Node.js only | Use destination with browser Pino build |

### Browser + Pino Example

```typescript
import { createPinoDestination } from '@alcyone-labs/simple-mcp-logger';
// Import browser-compatible Pino build
import pino from 'pino/browser';

const destination = createPinoDestination({
  level: 'info',
  prefix: 'Browser'
});

const logger = pino({ level: 'info' }, destination);
logger.info('Hello from Pino in browser!');
```

### Bundle Size

The browser build is optimized and lightweight:
- **ESM build**: ~11KB (2.4KB gzipped)
- **Tree-shakeable**: Import only what you need
- **Zero dependencies**: No external runtime dependencies

## Migration Guide

### From console

```typescript
// Before
console.log('Hello');
console.error('Error');

// After
import { logger } from '@alcyone-labs/simple-mcp-logger';
logger.log('Hello');
logger.error('Error');

// Or replace globally
globalThis.console = logger as any;
```

### From Winston

```typescript
// Before
import winston from 'winston';
const logger = winston.createLogger({
  transports: [new winston.transports.Console()]
});

// After
import { createWinstonTransport } from '@alcyone-labs/simple-mcp-logger';
const logger = winston.createLogger({
  transports: [createWinstonTransport()]
});
```

### From Pino

```typescript
// Before
import pino from 'pino';
const logger = pino();

// After
import { createPinoLogger } from '@alcyone-labs/simple-mcp-logger';
const logger = createPinoLogger();
```

## Why This Matters for MCP Development

### The Hidden Problem

Many MCP servers fail in production due to **STDOUT contamination**. Even a single `console.log()` can break the entire MCP communication channel:

```typescript
// This innocent debug line breaks everything (writes to STDOUT):
console.log('Debug: processing request');

// MCP client expects: {"jsonrpc":"2.0","id":1,"result":{...}}
// But receives: Debug: processing request{"jsonrpc":"2.0","id":1,"result":{...}}
// Result: JSON parse error, connection terminated

// The fix is simple - use STDERR instead:
console.error('Debug: processing request'); // Safe: goes to STDERR
```

### The Solution Impact

SimpleMcpLogger has prevented countless MCP server failures by:

- **Catching stray console calls** before they reach STDOUT
- **Preserving development logging** while ensuring production safety
- **Enabling gradual migration** of existing codebases to MCP compliance
- **Providing safe STDERR channels** for debugging without protocol interference
- **Maintaining visibility** into server operations via client-visible STDERR logs

### Real-World Success

Teams using SimpleMcpLogger report:
- **Zero MCP protocol corruption** issues in production
- **Faster debugging** with safe error logging channels
- **Seamless migration** of existing Node.js services to MCP servers
- **Confident deployment** knowing logging won't break client connections

**SimpleMcpLogger isn't just a logger—it's MCP reliability insurance.**

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.
