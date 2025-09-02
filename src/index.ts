import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { config } from 'dotenv';

// 加载环境变量
config();

import { setupRouter } from './routes/index';
import { config as appConfig } from './config';

const app = new Hono();

setupRouter(app);

serve(
  {
    fetch: app.fetch,
    port: appConfig.port,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
