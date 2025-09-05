import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { config } from 'dotenv';
import { setupRouter } from '../routes/index';
import { setupWebSocket } from './websocket';
import { config as appConfig } from '../config';
import { setupError } from './error';

const initApp = () => {
  const app = new Hono();
  setupRouter(app);
  setupError(app);
  return app;
};

export const startServer = () => {
  try {
    // 加载环境变量
    config();

    const port = Number(process.env.PORT || '3000');
    
    // 检查端口是否可用
    const net = require('net');
    const server = net.createServer();
    
    server.listen(port, () => {
      server.close(() => {
        // 端口可用，启动实际服务
        startActualServer(port);
      });
    });
    
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ 端口 ${port} 已被占用，请检查并关闭冲突的进程`);
        console.log('💡 可以尝试以下命令:');
        console.log(`   lsof -ti:${port} | xargs kill -9`);
        console.log(`   或者使用其他端口: PORT=3001 npm run dev`);
        process.exit(1);
      } else {
        console.error('❌ 服务器启动失败:', err);
        process.exit(1);
      }
    });
    
  } catch (error) {
    console.error('❌ 服务器初始化失败:', error);
    process.exit(1);
  }
};

const startActualServer = (port: number) => {
  try {
    // 创建应用
    const app = initApp();

    // 设置 WebSocket
    const { injectWebSocket } = setupWebSocket(app);

    // 启动服务器
    const server = serve({
      fetch: app.fetch,
      port: port,
    });

    // 注入 WebSocket
    injectWebSocket(server);

    console.log('✅ server 服务已在', port, '端口启动');
    
    // 优雅关闭处理
    process.on('SIGTERM', () => {
      console.log('🔄 收到 SIGTERM 信号，正在关闭服务器...');
      server.close(() => {
        console.log('✅ 服务器已关闭');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('🔄 收到 SIGINT 信号，正在关闭服务器...');
      server.close(() => {
        console.log('✅ 服务器已关闭');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
};
