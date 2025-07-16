import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import dts from 'vite-plugin-dts';
import { writeFileSync, readFileSync } from 'node:fs';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: false,
      rollupTypes: false,
      include: ['src/**/*'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
      entryRoot: 'src',
      outDir: 'dist',
      afterBuild: () => {
        // Generate the main index.d.ts file manually to only include core types
        const mainIndexTypes = `/**
 * SimpleMcpLogger - Core Logger
 *
 * This is the main entry point that only includes the core logger functionality.
 * No external dependencies are included here for optimal bundling.
 *
 * For adapters (Winston, Pino), import from '@alcyone-labs/simple-mcp-logger/adapters'
 */
export { Logger, logger, createMcpLogger, createCliLogger, type LogLevel, type LoggerConfig, } from './SimpleMcpLogger.js';
export { default } from './SimpleMcpLogger.js';
export { default as SimpleMcpLogger } from './SimpleMcpLogger.js';
`;
        writeFileSync(resolve(__dirname, 'dist/index.d.ts'), mainIndexTypes);

        // Fix winston-transport import in winston.d.ts
        const winstonTypesPath = resolve(__dirname, 'dist/adapters/winston.d.ts');
        try {
          const winstonTypes = readFileSync(winstonTypesPath, 'utf8');
          let fixedWinstonTypes = winstonTypes.replace(
            'import { default as TransportStream } from \'winston-transport\';',
            'import TransportStream = require(\'winston-transport\');'
          );
          // Also handle the case where it's already a default import
          fixedWinstonTypes = fixedWinstonTypes.replace(
            'import TransportStream from \'winston-transport\';',
            'import TransportStream = require(\'winston-transport\');'
          );
          writeFileSync(winstonTypesPath, fixedWinstonTypes);
        } catch (error) {
          console.warn('Could not fix winston-transport import:', error);
        }
      },
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'adapters/index': resolve(__dirname, 'src/adapters/index.ts'),
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => {
        const ext = format === 'es' ? 'mjs' : 'cjs';
        return `${entryName}.${ext}`;
      },
    },
    rollupOptions: {
      external: ['winston-transport', 'pino', 'node:fs', 'node:path'],
      output: {
        globals: {
          'winston-transport': 'WinstonTransport',
          'pino': 'pino',
          'node:fs': 'fs',
          'node:path': 'path',
        },
      },
    },
    sourcemap: true,
    minify: false,
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
