import pino from 'pino';

// 日志级别配置
const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// 创建 Pino 实例
const logger = pino({
  level: logLevel,
  // 开发环境使用 pino-pretty 进行美化输出
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
      messageFormat: '[{level}] {msg}',
    },
  } : undefined,
  // 生产环境配置
  ...(process.env.NODE_ENV === 'production' && {
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  }),
});

// 创建子 logger 的工厂函数
export const createLogger = (name: string) => {
  return logger.child({ module: name });
};

// 导出默认 logger
export default logger;

// 导出常用的日志方法，保持向后兼容
export const log = {
  debug: logger.debug.bind(logger),
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  fatal: logger.fatal.bind(logger),
};

// 导出默认 logger 的别名
export { logger };

// WebSocket 专用 logger
export const wsLogger = createLogger('websocket');

// 服务器专用 logger
export const serverLogger = createLogger('server');

// 控制器专用 logger
export const controllerLogger = createLogger('controller');

// 服务专用 logger
export const serviceLogger = createLogger('service');
