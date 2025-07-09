/**
 * Adapters for SimpleMcpLogger
 * 
 * This module contains adapters for popular logging libraries.
 * Import this separately to avoid bundling dependencies you don't need.
 * 
 * Usage:
 * ```typescript
 * // Main logger (no external dependencies)
 * import { Logger } from '@alcyone-labs/simple-mcp-logger';
 * 
 * // Adapters (includes winston-transport and pino dependencies)
 * import { SimpleMcpWinstonTransport, createPinoDestination } from '@alcyone-labs/simple-mcp-logger/adapters';
 * ```
 */

// Winston adapter exports
export {
  SimpleMcpWinstonTransport,
  createWinstonTransport
} from './winston.js';

// Pino adapter exports
export {
  SimpleMcpPinoTransport,
  createPinoTransport,
  createPinoDestination,
  createPinoLogger
} from './pino.js';
