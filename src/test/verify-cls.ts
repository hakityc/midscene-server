// 验证腾讯云CLS功能是否正常
import { config } from 'dotenv';
import { serverLogger, controllerLogger, serviceLogger, clsTransport } from '../utils/logger.js';

// 加载环境变量
config();

console.log('=== 腾讯云CLS功能验证 ===\n');

// 检查环境变量配置
console.log('1. 检查环境变量配置:');
const requiredEnvVars = ['CLS_ENDPOINT', 'CLS_TOPIC_ID'];
const optionalEnvVars = ['CLS_MAX_COUNT', 'CLS_MAX_SIZE', 'CLS_REGION'];

requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  console.log(`   ${envVar}: ${value ? '✅ 已配置' : '❌ 未配置'}`);
  if (value) console.log(`      值: ${value}`);
});

optionalEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  console.log(`   ${envVar}: ${value ? `✅ ${value}` : '⚪ 使用默认值'}`);
});

console.log('\n2. 检查CLS传输器状态:');
if (clsTransport) {
  console.log('   ✅ CLS传输器已初始化');
} else {
  console.log('   ❌ CLS传输器未初始化');
  console.log('   原因: 缺少必要的环境变量配置');
  process.exit(1);
}

console.log('\n3. 发送测试日志:');
const testId = `test-${Date.now()}`;

// 发送不同类型的测试日志
serverLogger.info(`[${testId}] 服务器日志测试`, { 
  testType: 'server', 
  timestamp: new Date().toISOString(),
  testId 
});

controllerLogger.info(`[${testId}] 控制器日志测试`, { 
  testType: 'controller', 
  action: 'test_action',
  userId: 'test-user-123',
  testId 
});

serviceLogger.info(`[${testId}] 服务日志测试`, { 
  testType: 'service', 
  serviceName: 'test-service',
  operation: 'test_operation',
  testId 
});

serviceLogger.error(`[${testId}] 错误日志测试`, { 
  testType: 'error', 
  error: 'test error message',
  stack: 'test stack trace',
  testId 
});

console.log('   ✅ 测试日志已发送');

console.log('\n4. 等待日志上报...');
console.log('   正在等待5秒让日志批量上报到腾讯云CLS...');

// 等待5秒让日志上报
setTimeout(() => {
  console.log('\n5. 验证完成!');
  console.log('   请检查腾讯云CLS控制台查看是否收到测试日志:');
  console.log(`   - 搜索关键词: ${testId}`);
  console.log('   - 检查日志级别: info, error');
  console.log('   - 检查附加字段: appId, version, environment, hostname');
  
  console.log('\n6. 清理资源...');
  if (clsTransport) {
    clsTransport.close();
    console.log('   ✅ CLS传输器已关闭');
  }
  
  console.log('\n验证完成! 如果腾讯云CLS控制台能看到测试日志，说明CLS功能正常工作。');
  process.exit(0);
}, 5000);
