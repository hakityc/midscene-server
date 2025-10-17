import { cleanupLogger, serverLogger } from './logger';

/**
 * 检查是否是 Bridge 连接断开相关的错误
 * 这些错误是预期的（有重连机制），应该完全静默处理
 */
function isBridgeConnectionError(reason: any): boolean {
  const message =
    reason instanceof Error ? reason.message : String(reason || '');
  const stack = reason instanceof Error ? reason.stack : '';

  // 检查错误消息中是否包含连接断开相关的关键词
  const connectionErrorPatterns = [
    'Connection lost',
    'client namespace disconnect',
    'transport close',
    'bridge client',
    'timeout',
    'io-server.ts', // Bridge 服务器相关
    'agent-cli-side.ts', // Agent CLI 端相关
    'showStatusMessage', // 状态消息显示相关
  ];

  return connectionErrorPatterns.some(
    (pattern) => message.includes(pattern) || stack?.includes(pattern),
  );
}

/**
 * 设置全局错误处理
 * 防止服务因未处理的 Promise 拒绝而停止
 */
export function setupGlobalErrorHandlers(): void {
  // 全局错误处理，防止服务因未处理的 Promise 拒绝而停止
  process.on('unhandledRejection', (reason, promise) => {
    // 检查是否是 Bridge 连接断开错误
    if (isBridgeConnectionError(reason)) {
      // 完全静默处理，不记录任何日志
      // 因为这是预期的情况，项目有重连机制
      return;
    }

    // 其他未处理的 Promise 拒绝才记录日志
    serverLogger.error(
      {
        type: 'unhandled_rejection',
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
        promise: promise.toString(),
      },
      '未处理的 Promise 拒绝',
    );

    // 不退出进程，继续运行服务
    serverLogger.info('服务继续运行，错误已记录');
  });

  // 全局异常处理
  process.on('uncaughtException', (error) => {
    serverLogger.fatal(
      {
        type: 'uncaught_exception',
        message: error.message,
        stack: error.stack,
      },
      '未捕获的异常',
    );

    // 对于严重错误，可以选择退出，但这里我们选择继续运行
    serverLogger.info('服务继续运行，异常已记录');
  });

  // 优雅关闭处理
  process.on('SIGINT', () => {
    serverLogger.info('收到 SIGINT 信号，正在优雅关闭服务...');
    cleanupLogger(); // 清理CLS传输器
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    serverLogger.info('收到 SIGTERM 信号，正在优雅关闭服务...');
    cleanupLogger(); // 清理CLS传输器
    process.exit(0);
  });
}
