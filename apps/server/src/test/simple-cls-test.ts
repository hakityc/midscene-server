// 简单测试CLS功能
import 'dotenv/config';
import {
  controllerLogger,
  serverLogger,
  serviceLogger,
} from '../utils/logger.js';

console.log('=== 简单CLS功能测试 ===\n');

console.log('环境变量检查:');
console.log('CLS_ENDPOINT:', process.env.CLS_ENDPOINT ? '✅' : '❌');
console.log('CLS_TOPIC_ID:', process.env.CLS_TOPIC_ID ? '✅' : '❌');

console.log('\n发送测试日志...');
const testId = `test-${Date.now()}`;

// 发送不同类型的测试日志
serverLogger.info(
  {
    testType: 'server',
    timestamp: new Date().toISOString(),
    testId,
  },
  `[${testId}] 服务器日志测试`,
);

controllerLogger.info(
  {
    testType: 'controller',
    action: 'test_action',
    userId: 'test-user-123',
    testId,
  },
  `[${testId}] 控制器日志测试`,
);

serviceLogger.info(
  {
    testType: 'service',
    serviceName: 'test-service',
    operation: 'test_operation',
    testId,
  },
  `[${testId}] 服务日志测试`,
);

serviceLogger.error(
  {
    testType: 'error',
    error: 'test error message',
    stack: 'test stack trace',
    testId,
  },
  `[${testId}] 错误日志测试`,
);

console.log('✅ 测试日志已发送');
console.log('\n等待5秒让日志上报到腾讯云CLS...');

// 等待5秒让日志上报
setTimeout(() => {
  console.log('\n✅ 测试完成!');
  console.log('请检查腾讯云CLS控制台查看是否收到测试日志:');
  console.log(`搜索关键词: ${testId}`);
  process.exit(0);
}, 5000);
