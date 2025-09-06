import { startServer } from './server';

// 全局错误处理，防止服务因未处理的 Promise 拒绝而停止
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的 Promise 拒绝:', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: promise.toString(),
  });
  
  // 不退出进程，继续运行服务
  console.log('🔄 服务继续运行，错误已记录');
});

// 全局异常处理
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', {
    message: error.message,
    stack: error.stack,
  });
  
  // 对于严重错误，可以选择退出，但这里我们选择继续运行
  console.log('🔄 服务继续运行，异常已记录');
});

// 优雅关闭处理
process.on('SIGINT', () => {
  console.log('🛑 收到 SIGINT 信号，正在优雅关闭服务...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 收到 SIGTERM 信号，正在优雅关闭服务...');
  process.exit(0);
});

startServer();