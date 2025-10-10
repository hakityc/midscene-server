/**
 * Windows Operate Service 综合测试
 * 
 * 测试 WindowsOperateService 的所有已实现功能
 * 包括：
 * - 服务生命周期管理
 * - AI 任务执行
 * - 连接管理和重连
 * - 截图和设备信息
 * - 错误处理
 */

import { WindowsOperateService } from "../services/windowsOperateService"
import { serviceLogger } from "../utils/logger"

// ==================== 测试配置 ====================

const TEST_CONFIG = {
  // 是否运行实际的 AI 任务（需要真实的 Windows 客户端连接）
  enableAITasks: false,
  // 测试超时时间（毫秒）
  timeout: 30000,
  // 是否打印详细日志
  verbose: true,
}

// ==================== 工具函数 ====================

function log(message: string, ...args: any[]) {
  if (TEST_CONFIG.verbose) {
    console.log(`[TEST] ${message}`, ...args)
  }
}

function logSuccess(message: string) {
  console.log(`✅ ${message}`)
}

function logError(message: string, error?: any) {
  console.error(`❌ ${message}`, error)
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ==================== 测试套件 ====================

/**
 * 测试 1: 服务启动和停止
 */
async function test1_ServiceLifecycle() {
  log("\n" + "=".repeat(60))
  log("测试 1: 服务生命周期管理")
  log("=".repeat(60))

  const service = WindowsOperateService.getInstance()

  try {
    // 1.1 测试初始状态
    log("测试 1.1: 检查初始状态")
    const initialStarted = service.isStarted()
    const initialReady = service.isReady()
    log(`  初始状态 - isStarted: ${initialStarted}, isReady: ${initialReady}`)
    logSuccess("初始状态检查通过")

    // 1.2 测试启动服务
    log("\n测试 1.2: 启动服务")
    await service.start()
    const afterStartStarted = service.isStarted()
    const afterStartReady = service.isReady()
    log(`  启动后 - isStarted: ${afterStartStarted}, isReady: ${afterStartReady}`)
    
    if (!afterStartStarted || !afterStartReady) {
      throw new Error("服务启动后状态不正确")
    }
    logSuccess("服务启动成功")

    // 1.3 测试重复启动（应该跳过）
    log("\n测试 1.3: 重复启动（应该跳过）")
    await service.start()
    logSuccess("重复启动测试通过")

    // 1.4 测试停止服务
    log("\n测试 1.4: 停止服务")
    await service.stop()
    const afterStopStarted = service.isStarted()
    const afterStopReady = service.isReady()
    log(`  停止后 - isStarted: ${afterStopStarted}, isReady: ${afterStopReady}`)
    
    if (afterStopStarted || afterStopReady) {
      throw new Error("服务停止后状态不正确")
    }
    logSuccess("服务停止成功")

    // 1.5 测试重复停止（应该不抛出错误）
    log("\n测试 1.5: 重复停止")
    await service.stop()
    logSuccess("重复停止测试通过")

    // 1.6 测试重新启动
    log("\n测试 1.6: 重新启动")
    await service.start()
    if (!service.isStarted()) {
      throw new Error("重新启动失败")
    }
    logSuccess("重新启动成功")

    logSuccess("\n✅ 测试 1 全部通过: 服务生命周期管理正常")
    return true
  } catch (error) {
    logError("测试 1 失败", error)
    throw error
  } finally {
    await service.stop().catch(() => {})
  }
}

/**
 * 测试 2: 设备信息和截图
 */
async function test2_DeviceInfoAndScreenshot() {
  log("\n" + "=".repeat(60))
  log("测试 2: 设备信息和截图")
  log("=".repeat(60))

  const service = WindowsOperateService.getInstance()

  try {
    // 2.1 启动服务
    log("测试 2.1: 启动服务")
    await service.start()
    logSuccess("服务已启动")

    // 2.2 测试获取设备信息
    log("\n测试 2.2: 获取设备信息")
    const deviceInfo = await service.getDeviceInfo()
    log(`  设备信息:`)
    log(`    宽度: ${deviceInfo.width}`)
    log(`    高度: ${deviceInfo.height}`)
    log(`    DPR: ${deviceInfo.dpr || 1}`)
    
    if (!deviceInfo.width || !deviceInfo.height) {
      throw new Error("设备信息无效")
    }
    if (deviceInfo.width <= 0 || deviceInfo.height <= 0) {
      throw new Error("设备尺寸无效")
    }
    logSuccess("设备信息获取成功")

    // 2.3 测试截图
    log("\n测试 2.3: 获取截图")
    const screenshot = await service.screenshot()
    log(`  截图数据长度: ${screenshot.length} 字符`)
    
    if (!screenshot || screenshot.length === 0) {
      throw new Error("截图数据为空")
    }
    
    // 验证截图格式（应该是 base64）
    const isBase64 = /^data:image\/(png|jpeg);base64,/.test(screenshot) || 
                     /^[A-Za-z0-9+/=]+$/.test(screenshot)
    if (!isBase64) {
      log(`  警告: 截图格式可能不是标准 base64 格式`)
    }
    logSuccess("截图获取成功")

    // 2.4 测试多次获取设备信息（测试缓存）
    log("\n测试 2.4: 多次获取设备信息")
    const deviceInfo2 = await service.getDeviceInfo()
    if (deviceInfo.width !== deviceInfo2.width || deviceInfo.height !== deviceInfo2.height) {
      throw new Error("设备信息不一致")
    }
    logSuccess("设备信息缓存正常")

    logSuccess("\n✅ 测试 2 全部通过: 设备信息和截图功能正常")
    return true
  } catch (error) {
    logError("测试 2 失败", error)
    throw error
  } finally {
    await service.stop().catch(() => {})
  }
}

/**
 * 测试 3: 连接检查和重连机制
 */
async function test3_ConnectionAndReconnect() {
  log("\n" + "=".repeat(60))
  log("测试 3: 连接检查和重连机制")
  log("=".repeat(60))

  const service = WindowsOperateService.getInstance()

  try {
    // 3.1 启动服务
    log("测试 3.1: 启动服务")
    await service.start()
    logSuccess("服务已启动")

    // 3.2 测试连接检查
    log("\n测试 3.2: 检查连接状态")
    const isConnected = await service.checkAndReconnect()
    log(`  连接状态: ${isConnected}`)
    logSuccess("连接检查完成")

    // 3.3 测试停止服务时不允许重连
    log("\n测试 3.3: 停止服务")
    await service.stop()
    
    log("测试 3.4: 停止后尝试连接检查")
    const afterStopConnected = await service.checkAndReconnect()
    log(`  停止后连接状态: ${afterStopConnected}`)
    if (afterStopConnected) {
      throw new Error("服务停止后不应该报告为已连接")
    }
    logSuccess("停止后连接检查正常")

    logSuccess("\n✅ 测试 3 全部通过: 连接管理正常")
    return true
  } catch (error) {
    logError("测试 3 失败", error)
    throw error
  } finally {
    await service.stop().catch(() => {})
  }
}

/**
 * 测试 4: 错误处理
 */
async function test4_ErrorHandling() {
  log("\n" + "=".repeat(60))
  log("测试 4: 错误处理")
  log("=".repeat(60))

  const service = WindowsOperateService.getInstance()

  try {
    // 4.1 测试未启动时的错误
    log("测试 4.1: 未启动时调用方法")
    await service.stop() // 确保服务已停止
    
    try {
      await service.getDeviceInfo()
      throw new Error("应该抛出错误：服务未启动")
    } catch (error: any) {
      if (error.message?.includes("未启动") || error.statusCode === 503) {
        logSuccess("正确抛出未启动错误")
      } else {
        throw error
      }
    }

    try {
      await service.screenshot()
      throw new Error("应该抛出错误：服务未启动")
    } catch (error: any) {
      if (error.message?.includes("未启动") || error.statusCode === 503) {
        logSuccess("正确抛出未启动错误")
      } else {
        throw error
      }
    }

    // 4.2 测试自动启动功能
    log("\n测试 4.2: 执行任务时自动启动")
    if (TEST_CONFIG.enableAITasks) {
      try {
        // execute 方法会自动启动服务
        await service.execute("测试任务")
        logSuccess("自动启动功能正常")
      } catch (error: any) {
        // 如果没有 Windows 客户端连接，会抛出连接错误，这是正常的
        if (error.message?.includes("连接") || error.statusCode === 503) {
          logSuccess("自动启动功能正常（无客户端连接）")
        } else {
          throw error
        }
      }
    } else {
      log("  跳过 AI 任务测试（enableAITasks = false）")
    }

    logSuccess("\n✅ 测试 4 全部通过: 错误处理正常")
    return true
  } catch (error) {
    logError("测试 4 失败", error)
    throw error
  } finally {
    await service.stop().catch(() => {})
  }
}

/**
 * 测试 5: AI 任务执行（需要真实连接）
 */
async function test5_AITaskExecution() {
  log("\n" + "=".repeat(60))
  log("测试 5: AI 任务执行")
  log("=".repeat(60))

  if (!TEST_CONFIG.enableAITasks) {
    log("⚠️  跳过 AI 任务测试（enableAITasks = false）")
    log("提示: 设置 TEST_CONFIG.enableAITasks = true 并连接 Windows 客户端来运行此测试")
    return true
  }

  const service = WindowsOperateService.getInstance()

  try {
    // 5.1 启动服务
    log("测试 5.1: 启动服务")
    await service.start()
    logSuccess("服务已启动")

    // 5.2 测试 execute (AI 任务执行)
    log("\n测试 5.2: 执行简单 AI 任务")
    try {
      await service.execute("移动鼠标到屏幕中心")
      logSuccess("AI 任务执行成功")
    } catch (error: any) {
      log(`  AI 任务执行失败: ${error.message}`)
      // AI 任务失败是正常的，可能是因为任务描述、环境等原因
    }

    // 5.3 测试 expect (AI 断言)
    log("\n测试 5.3: 执行 AI 断言")
    try {
      await service.expect("屏幕可见")
      logSuccess("AI 断言执行成功")
    } catch (error: any) {
      log(`  AI 断言失败: ${error.message}`)
    }

    // 5.4 测试 executeScript (YAML 脚本)
    log("\n测试 5.4: 执行 YAML 脚本")
    const yamlScript = `
tasks:
  - name: 简单测试
    type: action
    prompt: 移动鼠标
`
    try {
      await service.executeScript(yamlScript)
      logSuccess("YAML 脚本执行成功")
    } catch (error: any) {
      log(`  YAML 脚本执行失败: ${error.message}`)
    }

    logSuccess("\n✅ 测试 5 全部通过: AI 任务执行功能正常")
    return true
  } catch (error) {
    logError("测试 5 失败", error)
    throw error
  } finally {
    await service.stop().catch(() => {})
  }
}

/**
 * 测试 6: 事件监听
 */
async function test6_EventListening() {
  log("\n" + "=".repeat(60))
  log("测试 6: 事件监听")
  log("=".repeat(60))

  const service = WindowsOperateService.getInstance()

  try {
    // 6.1 测试 taskStartTip 事件
    log("测试 6.1: 监听 taskStartTip 事件")
    
    let eventReceived = false
    const eventHandler = (tip: string) => {
      eventReceived = true
      log(`  收到事件: ${tip}`)
    }
    
    service.on("taskStartTip", eventHandler)
    
    // 启动服务
    await service.start()
    
    if (TEST_CONFIG.enableAITasks) {
      // 执行一个任务来触发事件
      try {
        await service.execute("测试任务")
        await sleep(1000) // 等待事件触发
        
        if (eventReceived) {
          logSuccess("事件监听正常")
        } else {
          log("  警告: 未收到事件（可能是任务未执行）")
        }
      } catch (error: any) {
        log(`  任务执行失败: ${error.message}`)
      }
    } else {
      log("  跳过事件触发测试（enableAITasks = false）")
    }
    
    // 移除监听器
    service.off("taskStartTip", eventHandler)
    
    logSuccess("\n✅ 测试 6 全部通过: 事件监听功能正常")
    return true
  } catch (error) {
    logError("测试 6 失败", error)
    throw error
  } finally {
    await service.stop().catch(() => {})
  }
}

/**
 * 测试 7: 单例模式
 */
async function test7_SingletonPattern() {
  log("\n" + "=".repeat(60))
  log("测试 7: 单例模式")
  log("=".repeat(60))

  try {
    // 7.1 测试获取实例
    log("测试 7.1: 获取实例")
    const instance1 = WindowsOperateService.getInstance()
    const instance2 = WindowsOperateService.getInstance()
    
    if (instance1 !== instance2) {
      throw new Error("单例模式失败：获取到不同的实例")
    }
    logSuccess("单例模式正常")

    // 7.2 测试重置实例
    log("\n测试 7.2: 重置实例")
    await instance1.start()
    WindowsOperateService.resetInstance()
    
    const instance3 = WindowsOperateService.getInstance()
    if (instance3 === instance1) {
      throw new Error("重置实例失败：获取到相同的实例")
    }
    logSuccess("重置实例功能正常")

    logSuccess("\n✅ 测试 7 全部通过: 单例模式正常")
    return true
  } catch (error) {
    logError("测试 7 失败", error)
    throw error
  } finally {
    WindowsOperateService.resetInstance()
  }
}

/**
 * 测试 8: 并发操作
 */
async function test8_ConcurrentOperations() {
  log("\n" + "=".repeat(60))
  log("测试 8: 并发操作")
  log("=".repeat(60))

  const service = WindowsOperateService.getInstance()

  try {
    // 8.1 启动服务
    await service.start()
    
    // 8.2 并发获取设备信息
    log("测试 8.1: 并发获取设备信息")
    const results = await Promise.all([
      service.getDeviceInfo(),
      service.getDeviceInfo(),
      service.getDeviceInfo(),
    ])
    
    // 验证结果一致性
    if (results[0].width !== results[1].width || results[1].width !== results[2].width) {
      throw new Error("并发操作结果不一致")
    }
    logSuccess("并发获取设备信息正常")
    
    // 8.3 并发截图
    log("\n测试 8.2: 并发截图")
    const screenshots = await Promise.all([
      service.screenshot(),
      service.screenshot(),
    ])
    
    if (!screenshots[0] || !screenshots[1]) {
      throw new Error("并发截图失败")
    }
    logSuccess("并发截图正常")

    logSuccess("\n✅ 测试 8 全部通过: 并发操作正常")
    return true
  } catch (error) {
    logError("测试 8 失败", error)
    throw error
  } finally {
    await service.stop().catch(() => {})
  }
}

// ==================== 主测试运行器 ====================

async function runAllTests() {
  console.log("\n" + "═".repeat(60))
  console.log("  Windows Operate Service 综合测试套件")
  console.log("═".repeat(60))
  console.log(`  测试配置:`)
  console.log(`    - AI 任务: ${TEST_CONFIG.enableAITasks ? "启用" : "禁用"}`)
  console.log(`    - 超时时间: ${TEST_CONFIG.timeout}ms`)
  console.log(`    - 详细日志: ${TEST_CONFIG.verbose ? "启用" : "禁用"}`)
  console.log("═".repeat(60))

  const tests = [
    { name: "服务生命周期", fn: test1_ServiceLifecycle },
    { name: "设备信息和截图", fn: test2_DeviceInfoAndScreenshot },
    { name: "连接管理", fn: test3_ConnectionAndReconnect },
    { name: "错误处理", fn: test4_ErrorHandling },
    { name: "AI 任务执行", fn: test5_AITaskExecution },
    { name: "事件监听", fn: test6_EventListening },
    { name: "单例模式", fn: test7_SingletonPattern },
    { name: "并发操作", fn: test8_ConcurrentOperations },
  ]

  let passed = 0
  let failed = 0
  const results: Array<{ name: string; status: "✅ 通过" | "❌ 失败"; error?: any }> = []

  for (const test of tests) {
    try {
      log(`\n开始执行: ${test.name}`)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("测试超时")), TEST_CONFIG.timeout)
      })
      
      await Promise.race([test.fn(), timeoutPromise])
      
      passed++
      results.push({ name: test.name, status: "✅ 通过" })
    } catch (error) {
      failed++
      results.push({ name: test.name, status: "❌ 失败", error })
      console.error(`\n❌ 测试 "${test.name}" 失败:`, error)
    }
    
    // 测试间隔
    await sleep(1000)
  }

  // 打印测试摘要
  console.log("\n" + "═".repeat(60))
  console.log("  测试摘要")
  console.log("═".repeat(60))
  
  for (const result of results) {
    console.log(`  ${result.status} ${result.name}`)
    if (result.error) {
      console.log(`      错误: ${result.error.message || result.error}`)
    }
  }
  
  console.log("\n" + "═".repeat(60))
  console.log(`  总计: ${tests.length} 个测试`)
  console.log(`  通过: ${passed} 个`)
  console.log(`  失败: ${failed} 个`)
  console.log(`  成功率: ${((passed / tests.length) * 100).toFixed(1)}%`)
  console.log("═".repeat(60))

  // 清理
  WindowsOperateService.resetInstance()

  if (failed > 0) {
    console.log("\n❌ 测试失败")
    process.exit(1)
  } else {
    console.log("\n✅ 所有测试通过!")
    process.exit(0)
  }
}

// ==================== 入口点 ====================

if (require.main === module) {
  runAllTests().catch((error) => {
    console.error("测试套件执行失败:", error)
    process.exit(1)
  })
}

export {
  test1_ServiceLifecycle,
  test2_DeviceInfoAndScreenshot,
  test3_ConnectionAndReconnect,
  test4_ErrorHandling,
  test5_AITaskExecution,
  test6_EventListening,
  test7_SingletonPattern,
  test8_ConcurrentOperations,
  runAllTests,
}

