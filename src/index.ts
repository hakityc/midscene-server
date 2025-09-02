import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { config } from 'dotenv';

// 加载环境变量
config();

import { setupRouter } from './routes/index';
import { config as appConfig } from './config';

const app = new Hono();

setupRouter(app);

const startServer = async () => {
  try {
    const server = serve(
      {
        fetch: app.fetch,
        port: appConfig.port,
      },
      (info) => {
        console.log(`🚀 Server is running on http://localhost:${info.port}`);
      }
    );

    // 处理服务器错误
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${appConfig.port} is already in use. Please try a different port.`);
        console.log(`💡 You can set a different port using: PORT=3001 npm start`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', error);
        process.exit(1);
      }
    });

    // 优雅关闭处理
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down server gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down server gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
