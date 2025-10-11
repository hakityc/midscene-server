import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
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
  },
  // 确保不会包含 Node.js polyfills
  define: {
    global: 'globalThis',
  },
});
