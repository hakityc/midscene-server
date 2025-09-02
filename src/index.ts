import { serve } from '@hono/node-server';
import { Hono } from 'hono';

import { setupRouter } from './routes/index';

const app = new Hono();

setupRouter(app);

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
