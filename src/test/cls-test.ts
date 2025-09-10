// 腾讯云CLS日志测试
import { serverLogger, controllerLogger, serviceLogger } from '../utils/logger.js';

console.log('开始测试腾讯云CLS日志功能...');

// 测试不同类型的日志
serverLogger.info('服务器启动测试');
serverLogger.error('错误测试', { error: 'test error', code: 500 });

controllerLogger.info('控制器测试', { action: 'test', userId: '123' });
controllerLogger.warn('警告测试', { warning: 'test warning' });

serviceLogger.info('服务测试', { service: 'test-service', data: { key: 'value' } });
serviceLogger.error('服务错误测试', { 
  service: 'test-service', 
  error: new Error('test service error'),
  context: { requestId: 'req-123' }
});

console.log('CLS日志测试完成，请检查腾讯云CLS控制台查看日志');
