/**
 * SimpleMcpLogger - Core Logger
 *
 * This is the main entry point that only includes the core logger functionality.
 * No external dependencies are included here for optimal bundling.
 *
 * For adapters (Winston, Pino), import from '@alcyone-labs/simple-mcp-logger/adapters'
 */

export {
  Logger,
  logger,
  createMcpLogger,
  createCliLogger,
  type LogLevel,
  type LoggerConfig,
} from './SimpleMcpLogger.js';

export { default } from './SimpleMcpLogger.js';
export { default as SimpleMcpLogger } from './SimpleMcpLogger.js';
