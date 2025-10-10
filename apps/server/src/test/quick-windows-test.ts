/**
 * Windows 操作服务快速测试
 *
 * 这个脚本提供快速的功能验证，不需要真实的 Windows 客户端连接
 * 主要测试：
 * - 服务初始化
 * - 基础 API 调用
 * - 错误处理
 */

import { WindowsOperateService } from "../services/windowsOperateService"
import WindowsDevice from "../services/customMidsceneDevice/windowsDevice"
import AgentOverWindows from "../services/customMidsceneDevice/agentOverWindows"

console.log("╔═══════════════════════════════════════════════════════════╗")
console.log("║        Windows Operate Service 快速功能测试             ║")
console.log("╚═══════════════════════════════════════════════════════════╝\n")

async function quickTest() {
  let testsPassed = 0
  let testsFailed = 0

  // ==================== 测试 1: WindowsDevice 基础功能 ====================
  console.log("📦 测试 1: WindowsDevice 基础功能")
  console.log("─".repeat(60))

  try {
    const device = new WindowsDevice({
      deviceName: "Quick Test Device",
      debug: true,
    })

    console.log("  ✓ WindowsDevice 实例创建成功")

    // 启动设备
    await device.launch()
    console.log("  ✓ 设备启动成功")

    // 获取尺寸
    const size = await device.size()
    console.log(`  ✓ 屏幕尺寸: ${size.width}x${size.height} (DPR: ${size.dpr || 1})`)

    // 获取截图
    const screenshot = await device.screenshotBase64()
    console.log(`  ✓ 截图获取成功 (${screenshot.length} 字符)`)

    // 获取动作空间
    const actions = device.actionSpace()
    console.log(`  ✓ 支持 ${actions.length} 个动作: ${actions.map(a => a.name).join(", ")}`)

    // 销毁设备
    await device.destroy()
    console.log("  ✓ 设备销毁成功")

    console.log("✅ 测试 1 通过\n")
    testsPassed++
  } catch (error: any) {
    console.error(`❌ 测试 1 失败: ${error.message}`)
    console.error(error)
    testsFailed++
  }

  // ==================== 测试 2: AgentOverWindows 基础功能 ====================
  console.log("🤖 测试 2: AgentOverWindows 基础功能")
  console.log("─".repeat(60))

  try {
    const agent = new AgentOverWindows({
      deviceOptions: {
        deviceName: "Quick Test Agent",
        debug: false,
      },
      generateReport: false,
    })

    console.log("  ✓ AgentOverWindows 实例创建成功")

    // 启动 Agent
    await agent.launch()
    console.log("  ✓ Agent 启动成功")

    // 获取状态
    const status = agent.getStatus()
    console.log(`  ✓ Agent 状态: launched=${status.isLaunched}, destroyed=${status.isDestroyed}`)

    // 获取设备信息
    const info = await agent.getDeviceInfo()
    console.log(`  ✓ 设备信息: ${info.width}x${info.height}`)

    // 截图
    const screenshot = await agent.screenshot()
    console.log(`  ✓ 截图获取成功 (${screenshot.length} 字符)`)

    // 销毁 Agent
    await agent.destroy()
    console.log("  ✓ Agent 销毁成功")

    console.log("✅ 测试 2 通过\n")
    testsPassed++
  } catch (error: any) {
    console.error(`❌ 测试 2 失败: ${error.message}`)
    console.error(error)
    testsFailed++
  }

  // ==================== 测试 3: WindowsOperateService 基础功能 ====================
  console.log("🔧 测试 3: WindowsOperateService 基础功能")
  console.log("─".repeat(60))

  try {
    const service = WindowsOperateService.getInstance()
    console.log("  ✓ 服务单例获取成功")

    // 启动服务
    await service.start()
    console.log("  ✓ 服务启动成功")

    // 检查状态
    const isStarted = service.isStarted()
    const isReady = service.isReady()
    console.log(`  ✓ 服务状态: started=${isStarted}, ready=${isReady}`)

    // 获取设备信息
    const deviceInfo = await service.getDeviceInfo()
    console.log(`  ✓ 设备信息: ${deviceInfo.width}x${deviceInfo.height}`)

    // 截图
    const screenshot = await service.screenshot()
    console.log(`  ✓ 截图获取成功 (${screenshot.length} 字符)`)

    // 连接检查
    const isConnected = await service.checkAndReconnect()
    console.log(`  ✓ 连接检查: ${isConnected}`)

    // 停止服务
    await service.stop()
    console.log("  ✓ 服务停止成功")

    console.log("✅ 测试 3 通过\n")
    testsPassed++
  } catch (error: any) {
    console.error(`❌ 测试 3 失败: ${error.message}`)
    console.error(error)
    testsFailed++
  } finally {
    // 清理
    WindowsOperateService.resetInstance()
  }

  // ==================== 测试 4: 错误处理 ====================
  console.log("⚠️  测试 4: 错误处理")
  console.log("─".repeat(60))

  try {
    const service = WindowsOperateService.getInstance()

    // 测试未启动时调用方法
    let errorCaught = false
    try {
      await service.getDeviceInfo()
    } catch (error: any) {
      if (error.message?.includes("未启动") || error.statusCode === 503) {
        console.log("  ✓ 正确抛出未启动错误")
        errorCaught = true
      }
    }

    if (!errorCaught) {
      throw new Error("应该抛出未启动错误")
    }

    // 测试重复停止
    await service.stop()
    await service.stop()
    console.log("  ✓ 重复停止不抛出错误")

    console.log("✅ 测试 4 通过\n")
    testsPassed++
  } catch (error: any) {
    console.error(`❌ 测试 4 失败: ${error.message}`)
    console.error(error)
    testsFailed++
  } finally {
    WindowsOperateService.resetInstance()
  }

  // ==================== 测试 5: 单例模式 ====================
  console.log("🔒 测试 5: 单例模式")
  console.log("─".repeat(60))

  try {
    const instance1 = WindowsOperateService.getInstance()
    const instance2 = WindowsOperateService.getInstance()

    if (instance1 !== instance2) {
      throw new Error("单例模式失败")
    }
    console.log("  ✓ 获取到相同的实例")

    WindowsOperateService.resetInstance()
    const instance3 = WindowsOperateService.getInstance()

    if (instance3 === instance1) {
      throw new Error("重置实例失败")
    }
    console.log("  ✓ 重置实例成功")

    console.log("✅ 测试 5 通过\n")
    testsPassed++
  } catch (error: any) {
    console.error(`❌ 测试 5 失败: ${error.message}`)
    console.error(error)
    testsFailed++
  } finally {
    WindowsOperateService.resetInstance()
  }

  // ==================== 打印测试结果 ====================
  console.log("╔═══════════════════════════════════════════════════════════╗")
  console.log("║                      测试结果                            ║")
  console.log("╚═══════════════════════════════════════════════════════════╝")
  console.log(`  总计: ${testsPassed + testsFailed} 个测试`)
  console.log(`  通过: ${testsPassed} 个 ✅`)
  console.log(`  失败: ${testsFailed} 个 ❌`)
  console.log(`  成功率: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`)
  console.log("═".repeat(63))

  if (testsFailed > 0) {
    console.log("\n❌ 部分测试失败，请检查错误信息")
    process.exit(1)
  } else {
    console.log("\n✅ 所有测试通过! WindowsOperateService 可用")
    console.log("\n提示:")
    console.log("  - 运行完整测试: npm run test:windows:full")
    console.log("  - 测试 AI 功能: 需要连接 Windows 客户端并启用 enableAITasks")
    process.exit(0)
  }
}

// 运行测试
if (require.main === module) {
  quickTest().catch((error) => {
    console.error("\n❌ 测试执行失败:", error)
    process.exit(1)
  })
}

export { quickTest }

