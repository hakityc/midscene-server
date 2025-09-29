import type { Context } from 'hono';
import type { ApiResponse } from '../types';

export const successResponse = <T>(
  c: Context,
  data: T,
  message?: string,
  status = 200,
) => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
  };

  return c.json(response, status as any);
};

export const errorResponse = (c: Context, error: string, status = 400) => {
  const response: ApiResponse = {
    success: false,
    error,
  };

  return c.json(response, status as any);
};
