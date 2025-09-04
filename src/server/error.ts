import { Hono } from 'hono';
import { Context } from 'hono';

export const setupError = (app: Hono) => {
  app.onError((err: Error, c: Context) => {
    console.error(err);
    return c.json({ error: 'Internal Server Error' }, 500);
  });
};