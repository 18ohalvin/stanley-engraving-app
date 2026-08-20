import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const proxyConfig = {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
    ws: true,
    configure: (proxy, _options) => {
      proxy.on('proxyRes', (proxyRes, req, res) => {
        if (req.url && req.url.includes('/api/events')) {
          res.setHeader('Cache-Control', 'no-cache, no-transform');
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Connection', 'keep-alive');
          res.setHeader('X-Accel-Buffering', 'no');
          if (typeof res.flushHeaders === 'function') {
            res.flushHeaders();
          }
        }
      });
    }
  }
};

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    cors: true,
    allowedHosts: true,
    proxy: proxyConfig
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: false,
    cors: true,
    allowedHosts: true,
    proxy: proxyConfig
  }
});
