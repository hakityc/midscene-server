import { hostname } from 'node:os';
import 'dotenv/config';
import { AsyncLocalStorage } from 'node:async_hooks';
import pino from 'pino';
import type { WsInboundMessage } from '../types/websocket';
import { type ErrorCategory, LogFields } from './logFields';
import { TencentCLSTransport } from './tencentCLSTransport.js';

/**
 * 序列化 Error 对象，保留所有有用信息
 */
function serializeError(error: Error): Record<string, any> {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    // 保留所有自定义属性（如 AppError 的 statusCode, isOperational）
    ...Object.getOwnPropertyNames(error).reduce(
      (acc, key) => {
        if (key !== 'name' && key !== 'message' && key !== 'stack') {
          acc[key] = (error as any)[key];
        }
        return acc;
      },
      {} as Record<string, any>,
    ),
  };
}

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
    logger.debug('CLS传输器初始化成功');
  } catch (error) {
    logger.error({ error }, 'CLS传输器初始化失败');
    console.error('请检查CLS配置是否正确:', {
      endpoint: process.env.CLS_ENDPOINT,
      topicId: process.env.CLS_TOPIC_ID,
      hasSecretId: !!process.env.CLS_SECRET_ID,
      hasSecretKey: !!process.env.CLS_SECRET_KEY,
    });
    clsTransport = null;
  }
} else {
  logger.debug('CLS环境变量未配置，跳过CLS日志上报功能');
}

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

        // 处理错误对象序列化
        let processedObj = obj;
        if (typeof obj === 'object' && obj !== null) {
          // 深度序列化所有 Error 对象
          processedObj = Object.entries(obj).reduce(
            (acc, [key, value]) => {
              acc[key] = value instanceof Error ? serializeError(value) : value;
              return acc;
            },
            {} as Record<string, any>,
          );
        }

        // 合并上下文信息到日志对象
        const logObj =
          typeof processedObj === 'object' && processedObj !== null
            ? { ...processedObj, ...context }
            : { ...context, message: typeof obj === 'string' ? obj : '' };

        // 调用原始方法
        originalMethod(logObj, msg);

        // 写入CLS
        clsTransport!.write({
          timestamp: Date.now(),
          level: method,
          message: msg || (typeof obj === 'string' ? obj : ''),
          data:
            typeof processedObj === 'object'
              ? { ...processedObj, ...context }
              : context,
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

        // 处理错误对象序列化
        let processedObj = obj;
        if (typeof obj === 'object' && obj !== null) {
          // 深度序列化所有 Error 对象
          processedObj = Object.entries(obj).reduce(
            (acc, [key, value]) => {
              acc[key] = value instanceof Error ? serializeError(value) : value;
              return acc;
            },
            {} as Record<string, any>,
          );
        }

        // 合并上下文信息到日志对象
        const logObj =
          typeof processedObj === 'object' && processedObj !== null
            ? { ...processedObj, ...context }
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

// ==================== 日志辅助函数 ====================

/**
 * 创建标准化的日志对象
 * 自动添加时间戳，统一日志结构
 */
export function createLogContext(
  data: Record<string, any>,
): Record<string, any> {
  return {
    ...data,
    timestamp: Date.now(),
  };
}

/**
 * 参数清洗工具
 * - 深拷贝避免修改原对象
 * - 截断过长字符串（超过 1000 字符）
 * - 隐藏敏感字段（如 password, secret, token）
 */
function formatSafeParams(params: any, maxLength = 1000): any {
  if (params === null || params === undefined) {
    return params;
  }

  // 处理字符串：直接截断
  if (typeof params === 'string') {
    return params.length > maxLength
      ? `${params.substring(0, maxLength)}... [truncated ${params.length - maxLength} chars]`
      : params;
  }

  // 处理数组：递归处理每个元素
  if (Array.isArray(params)) {
    return params.map((item) => formatSafeParams(item, maxLength));
  }

  // 处理对象：递归处理每个属性
  if (typeof params === 'object') {
    const sensitiveKeys = [
      'password',
      'secret',
      'token',
      'key',
      'apiKey',
      'secretKey',
      'secretId',
    ];
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      const lowerKey = key.toLowerCase();
      // 隐藏敏感字段
      if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = formatSafeParams(value, maxLength);
      }
    }

    return result;
  }

  // 其他类型直接返回
  return params;
}

/**
 * 命令日志记录（清晰记录输入）
 * 记录所有接收到的 WebSocket 指令及其参数
 */
export function logCommandInput(
  logger: any,
  message: WsInboundMessage<any>,
  connectionId?: string,
): void {
  const { meta, payload } = message;

  // 格式化参数：截断过长内容，处理敏感信息
  const safeParams = formatSafeParams(payload.params);

  logger.info(
    createLogContext({
      eventType: 'command.receive',
      [LogFields.MESSAGE_ID]: meta.messageId,
      [LogFields.CONVERSATION_ID]: meta.conversationId,
      [LogFields.CONNECTION_ID]: connectionId,
      [LogFields.CLIENT_TYPE]: meta.clientType || 'web',
      [LogFields.COMMAND_ACTION]: payload.action,
      [LogFields.COMMAND_PARAMS]: safeParams,
      [LogFields.COMMAND_ORIGIN]: payload.originalCmd || '',
    }),
    `收到指令: ${payload.action}`,
  );
}

/**
 * 错误分类记录（便于统计）
 * 使用统一的错误分类，便于后续统计和分析
 */
export function logErrorWithCategory(
  logger: any,
  error: Error,
  category: ErrorCategory,
  context: Record<string, any> = {},
): void {
  logger.error(
    createLogContext({
      eventType: 'error.occurred',
      [LogFields.ERROR]: error,
      [LogFields.ERROR_CATEGORY]: category,
      [LogFields.ERROR_CODE]:
        (error as any).statusCode || (error as any).code || undefined,
      ...context,
    }),
    `发生错误: ${category} - ${error.message}`,
  );
}
