import { hostname } from 'node:os';
import 'dotenv/config';
import { AsyncLocalStorage } from 'node:async_hooks';
import pino from 'pino';
import { TencentCLSTransport } from './tencentCLSTransport.js';

// 日志上下文接口
interface LogContext {
  messageId?: string;
  conversationId?: string;
  connectionId?: string;
}

// 创建异步本地存储来管理日志上下文
const logContextStorage = new AsyncLocalStorage<LogContext>();

// 日志级别配置
// 使用方括号语法避免 tsup 静态替换
const logLevel =
  process.env.LOG_LEVEL ||
  (process.env['NODE_ENV'] === 'production' ? 'info' : 'debug');

// 创建腾讯云CLS传输器（仅在配置了CLS相关环境变量时启用）
let clsTransport: TencentCLSTransport | null = null;
if (process.env.CLS_ENDPOINT && process.env.CLS_TOPIC_ID) {
  try {
    clsTransport = new TencentCLSTransport({
      endpoint: process.env.CLS_ENDPOINT,
      topicId: process.env.CLS_TOPIC_ID,
      maxCount: parseInt(process.env.CLS_MAX_COUNT || '100', 10),
      maxSize: parseFloat(process.env.CLS_MAX_SIZE || '0.1'),
      appendFieldsFn: () => {
        // 动态读取环境变量，避免被 tsup 静态替换
        const nodeEnv = process.env['NODE_ENV'] || 'development';
        return {
          appId: process.env.APP_ID || 'midscene-server',
          version: process.env.npm_package_version || '1.0.0',
          environment: nodeEnv,
          hostname: hostname(),
        };
      },
    });
    console.log('✅ CLS传输器初始化成功');
  } catch (error) {
    console.error('❌ CLS传输器初始化失败:', error);
    console.error('请检查CLS配置是否正确:', {
      endpoint: process.env.CLS_ENDPOINT,
      topicId: process.env.CLS_TOPIC_ID,
      hasSecretId: !!process.env.CLS_SECRET_ID,
      hasSecretKey: !!process.env.CLS_SECRET_KEY,
    });
    clsTransport = null;
  }
} else {
  console.log('ℹ️ CLS环境变量未配置，跳过CLS日志上报功能');
}

// 创建 Pino 实例
// 使用方括号语法避免 tsup 静态替换
const nodeEnv = process.env['NODE_ENV'] || 'development';
const logger = pino({
  level: logLevel,
  // 开发环境使用 pino-pretty 进行美化输出
  transport:
    nodeEnv === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            messageFormat: '[{level}] {msg}',
          },
        }
      : undefined,
  // 生产环境配置
  ...(nodeEnv === 'production' && {
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
  const childLogger = logger.child({ module: name });

  // 如果启用了CLS传输器，添加CLS日志写入功能
  if (clsTransport) {
    // 重写所有日志方法
    const methods = ['debug', 'info', 'warn', 'error', 'fatal'] as const;

    methods.forEach((method) => {
      const originalMethod = childLogger[method].bind(childLogger);
      childLogger[method] = (obj: any, msg?: string) => {
        // 获取当前上下文
        const context = logContextStorage.getStore();

        // 合并上下文信息到日志对象
        const logObj =
          typeof obj === 'object' && obj !== null
            ? { ...obj, ...context }
            : { ...context, message: typeof obj === 'string' ? obj : '' };

        // 调用原始方法
        originalMethod(logObj, msg);

        // 写入CLS
        clsTransport!.write({
          timestamp: Date.now(),
          level: method,
          message: msg || (typeof obj === 'string' ? obj : ''),
          data: typeof obj === 'object' ? { ...obj, ...context } : context,
          module: name,
          messageId: context?.messageId,
          conversationId: context?.conversationId,
          connectionId: context?.connectionId,
        });
      };
    });
  } else {
    // 即使没有CLS传输器，也要添加上下文信息
    const methods = ['debug', 'info', 'warn', 'error', 'fatal'] as const;

    methods.forEach((method) => {
      const originalMethod = childLogger[method].bind(childLogger);
      childLogger[method] = (obj: any, msg?: string) => {
        // 获取当前上下文
        const context = logContextStorage.getStore();

        // 合并上下文信息到日志对象
        const logObj =
          typeof obj === 'object' && obj !== null
            ? { ...obj, ...context }
            : { ...context, message: typeof obj === 'string' ? obj : '' };

        // 调用原始方法
        originalMethod(logObj, msg);
      };
    });
  }

  return childLogger;
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

// 上下文管理函数
export const setLogContext = (context: LogContext) => {
  logContextStorage.enterWith(context);
};

export const getLogContext = (): LogContext | undefined => {
  return logContextStorage.getStore();
};

export const withLogContext = <T>(context: LogContext, fn: () => T): T => {
  return logContextStorage.run(context, fn);
};

// 从 WebSocket 消息设置日志上下文
export const setLogContextFromMessage = (
  message: any,
  connectionId?: string,
) => {
  const context: LogContext = {
    messageId: message?.meta?.messageId,
    conversationId: message?.meta?.conversationId,
    connectionId,
  };
  setLogContext(context);
};

// 导出CLS传输器用于清理
export { clsTransport };

// 清理函数，用于应用关闭时刷新剩余日志
export const cleanupLogger = () => {
  if (clsTransport) {
    clsTransport.close();
  }
};
