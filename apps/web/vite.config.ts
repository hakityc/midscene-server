import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { codeInspectorPlugin } from 'code-inspector-plugin';
import { defineConfig } from 'vite';
import Inspect from 'vite-plugin-inspect';

export default defineConfig({
  plugins: [
    react(),
    Inspect(),
    codeInspectorPlugin({
      bundler: 'vite',
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // 确保构建目标是浏览器环境
  build: {
    target: 'esnext',
    outDir: 'dist',
  },
  // 开发服务器配置
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  // 确保不会包含 Node.js polyfills
  define: {
    global: 'globalThis',
  },
});
