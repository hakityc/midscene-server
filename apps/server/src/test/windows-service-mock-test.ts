/**
 * Windows 操作服务模拟测试
 *
 * 此测试不依赖 robotjs，通过模拟 WindowsClientConnectionManager 来测试服务逻辑
 * 适用于：
 * - macOS/Linux 开发环境
 * - CI/CD 环境
 * - 快速功能验证
 *
 * 注意：完整的功能测试需要在 Windows 环境下进行
 */

import { WindowsClientConnectionManager } from '../services/windowsClientConnectionManager';
import { WindowsOperateService } from '../services/windowsOperateService';

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║     Windows Operate Service 模拟测试 (无需真实设备)      ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

async function mockTest() {
  let testsPassed = 0;
  let testsFailed = 0;

  // ==================== 测试 1: 服务单例模式 ====================
  console.log('🔒 测试 1: 单例模式');
  console.log('─'.repeat(60));

  try {
    const instance1 = WindowsOperateService.getInstance();
    const instance2 = WindowsOperateService.getInstance();

    if (instance1 !== instance2) {
      throw new Error('单例模式失败：获取到不同的实例');
    }
    console.log('  ✓ 获取到相同的实例');

    WindowsOperateService.resetInstance();
    const instance3 = WindowsOperateService.getInstance();

    if (instance3 === instance1) {
      throw new Error('重置实例失败：获取到相同的实例');
    }
    console.log('  ✓ 重置实例成功');

    console.log('✅ 测试 1 通过\n');
    testsPassed++;
  } catch (error: any) {
    console.error(`❌ 测试 1 失败: ${error.message}`);
    testsFailed++;
  } finally {
    WindowsOperateService.resetInstance();
  }

  // ==================== 测试 2: 服务生命周期 ====================
  console.log('♻️  测试 2: 服务生命周期');
  console.log('─'.repeat(60));

  try {
    const service = WindowsOperateService.getInstance();

    // 2.1 初始状态
    console.log('  检查初始状态...');
    const initialStarted = service.isStarted();
    const initialReady = service.isReady();

    if (initialStarted || initialReady) {
      throw new Error('初始状态应该是未启动');
    }
    console.log(
      `  ✓ 初始状态正确: started=${initialStarted}, ready=${initialReady}`,
    );

    // 2.2 启动服务（会失败，因为没有真实连接）
    console.log('  尝试启动服务（预期会失败，因为没有真实连接）...');
    try {
      await service.start();
      console.log('  ⚠️  警告: 服务启动成功（可能有真实连接）');
    } catch (error: any) {
      console.log(`  ✓ 预期的失败: ${error.message}`);
    }

    // 2.3 停止服务
    console.log('  停止服务...');
    await service.stop();
    console.log('  ✓ 服务停止成功');

    // 2.4 重复停止
    console.log('  测试重复停止...');
    await service.stop();
    console.log('  ✓ 重复停止不抛出错误');

    console.log('✅ 测试 2 通过\n');
    testsPassed++;
  } catch (error: any) {
    console.error(`❌ 测试 2 失败: ${error.message}`);
    testsFailed++;
  } finally {
    WindowsOperateService.resetInstance();
  }

  // ==================== 测试 3: 错误处理 ====================
  console.log('⚠️  测试 3: 错误处理');
  console.log('─'.repeat(60));

  try {
    const service = WindowsOperateService.getInstance();

    // 3.1 未启动时调用方法应该抛出错误
    console.log('  测试未启动时调用方法...');

    let errorCaught = false;
    try {
      await service.getDeviceInfo();
    } catch (error: any) {
      if (
        error.message?.includes('未启动') ||
        error.statusCode === 503 ||
        error.message?.includes('not launched')
      ) {
        console.log(`  ✓ 正确抛出错误: ${error.message}`);
        errorCaught = true;
      }
    }

    if (!errorCaught) {
      throw new Error('应该抛出未启动错误');
    }

    // 3.2 测试截图方法
    console.log('  测试截图方法...');
    errorCaught = false;
    try {
      await service.screenshot();
    } catch (error: any) {
      if (
        error.message?.includes('未启动') ||
        error.statusCode === 503 ||
        error.message?.includes('not launched')
      ) {
        console.log(`  ✓ 正确抛出错误: ${error.message}`);
        errorCaught = true;
      }
    }

    if (!errorCaught) {
      throw new Error('应该抛出未启动错误');
    }

    console.log('✅ 测试 3 通过\n');
    testsPassed++;
  } catch (error: any) {
    console.error(`❌ 测试 3 失败: ${error.message}`);
    testsFailed++;
  } finally {
    WindowsOperateService.resetInstance();
  }

  // ==================== 测试 4: ConnectionManager 集成 ====================
  console.log('🔗 测试 4: ConnectionManager 集成');
  console.log('─'.repeat(60));

  try {
    const connectionManager = WindowsClientConnectionManager.getInstance();
    console.log('  ✓ ConnectionManager 单例获取成功');

    const availableClients = connectionManager.getAvailableClients();
    console.log(`  ✓ 可用客户端数量: ${availableClients.length}`);

    const _stats = connectionManager.getStats();

    if (availableClients.length === 0) {
      console.log('  ℹ️  提示: 没有真实的 Windows 客户端连接（这是正常的）');
    }

    console.log('✅ 测试 4 通过\n');
    testsPassed++;
  } catch (error: any) {
    console.error(`❌ 测试 4 失败: ${error.message}`);
    testsFailed++;
  }

  // ==================== 测试 5: 服务配置 ====================
  console.log('⚙️  测试 5: 服务配置');
  console.log('─'.repeat(60));

  try {
    const service = WindowsOperateService.getInstance();

    // 检查服务是否有 agent 属性
    console.log(`  ✓ 服务有 agent 属性: ${service.agent !== undefined}`);

    // 检查服务方法是否存在
    const methods = [
      'start',
      'stop',
      'isStarted',
      'isReady',
      'execute',
      'expect',
      'executeScript',
      'getDeviceInfo',
      'screenshot',
      'checkAndReconnect',
    ];

    for (const method of methods) {
      if (typeof (service as any)[method] !== 'function') {
        throw new Error(`方法 ${method} 不存在`);
      }
    }
    console.log(`  ✓ 所有必需方法都存在 (${methods.length} 个)`);

    console.log('✅ 测试 5 通过\n');
    testsPassed++;
  } catch (error: any) {
    console.error(`❌ 测试 5 失败: ${error.message}`);
    testsFailed++;
  } finally {
    WindowsOperateService.resetInstance();
  }

  // ==================== 打印测试结果 ====================
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                      测试结果                            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(`  总计: ${testsPassed + testsFailed} 个测试`);
  console.log(`  通过: ${testsPassed} 个 ✅`);
  console.log(`  失败: ${testsFailed} 个 ❌`);
  console.log(
    `  成功率: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`,
  );
  console.log('═'.repeat(63));

  if (testsFailed > 0) {
    console.log('\n❌ 部分测试失败，请检查错误信息');
    process.exit(1);
  } else {
    console.log('\n✅ 所有模拟测试通过! WindowsOperateService 基础功能可用');
    console.log('\n📝 注意事项:');
    console.log('  - 这是模拟测试，未测试真实的 Windows 设备操作');
    console.log('  - 完整功能测试需要在 Windows 环境下运行');
    console.log('  - 需要运行 Windows 客户端并连接到服务器');
    console.log('\n🚀 下一步:');
    console.log('  1. 在 Windows 环境下部署服务');
    console.log('  2. 运行 Windows 客户端 (windows-client-example.js)');
    console.log('  3. 运行完整测试: npm run test:windows:full');
    process.exit(0);
  }
}

// 运行测试
mockTest().catch((error) => {
  console.error('\n❌ 测试执行失败:', error);
  process.exit(1);
});

export { mockTest };
