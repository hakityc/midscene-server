import { serverLogger } from './logger.js';
// 自定义错误类型
export class AppError extends Error {
    message;
    statusCode;
    isOperational;
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.message = message;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
export const setupError = (app) => {
    app.onError((err, c) => {
        // 记录错误日志
        serverLogger.error({ err }, 'Error occurred');
        if (err.stack) {
            serverLogger.error({ stack: err.stack }, 'Stack trace');
        }
        // 默认错误响应
        const errorResponse = {
            success: false,
            error: 'Internal Server Error',
        };
        // 设置默认状态码
        let statusCode = 500;
        // 根据错误类型设置状态码和消息
        if (err instanceof AppError) {
            statusCode = err.statusCode;
            errorResponse.error = err.message;
            // 在开发环境中返回错误堆栈
            if (process.env.NODE_ENV === 'development') {
                errorResponse.stack = err.stack;
            }
        }
        else if (err.name === 'ZodError') {
            // 处理 Zod 验证错误
            statusCode = 400;
            errorResponse.error = 'Validation Error';
            errorResponse.message = err.message;
        }
        else if (err.name === 'TypeError') {
            // 处理类型错误
            statusCode = 400;
            errorResponse.error = 'Type Error';
            errorResponse.message = err.message;
        }
        return c.json(errorResponse, statusCode);
    });
};
