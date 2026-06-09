import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

function browserLogPlugin(): Plugin {
  return {
    name: 'mls-browser-log',
    apply: 'serve',
    configureServer(server) {
      const logPath = process.env.MLS_BROWSER_LOG_PATH;
      if (!logPath) return;

      fs.mkdirSync(path.dirname(logPath), { recursive: true });
      server.httpServer?.once('listening', () => {
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] Browser logging started\n`);
      });

      server.middlewares.use('/__mls/browser-log', (request, response) => {
        if (request.method !== 'POST') {
          response.statusCode = 405;
          response.end();
          return;
        }

        let body = '';
        request.setEncoding('utf8');
        request.on('data', (chunk) => {
          body += chunk;
          if (body.length > 1_000_000) request.destroy();
        });
        request.on('end', () => {
          try {
            const event = JSON.parse(body) as Record<string, unknown>;
            fs.appendFileSync(
              logPath,
              `${JSON.stringify({ serverTime: new Date().toISOString(), ...event })}\n`,
            );
            response.statusCode = 204;
          } catch {
            response.statusCode = 400;
          }
          response.end();
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [
    browserLogPlugin(),
    react(),
    nodePolyfills({
      include: ['buffer', 'zlib'],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@mls/core': path.resolve(__dirname, '../core/src/index.ts'),
    },
  },
  optimizeDeps: {
    include: ['prismarine-nbt', 'pako'],
  },
});
