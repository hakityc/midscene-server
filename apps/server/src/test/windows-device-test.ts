/**
 * Windows Device 测试文件
 *
 * 测试 WindowsDevice、AgentOverWindows 和 WindowsOperateService 的功能
 */

import WindowsDevice from "../services/customMidsceneDevice/windowsDevice"
import AgentOverWindows from "../services/customMidsceneDevice/agentOverWindows"
import { WindowsOperateService } from "../services/windowsOperateService"

// ==================== WindowsDevice 基础测试 ====================

async function testWindowsDevice() {
  console.log("\n🧪 测试 WindowsDevice...\n")

  const device = new WindowsDevice({
    deviceName: "Test Device",
    debug: true,
  })

  try {
    // 测试启动
    console.log("✓ 测试启动...")
    await device.launch()

    // 测试获取尺寸
    console.log("✓ 测试获取尺寸...")
    const size = await device.size()
    console.log(`  屏幕尺寸: ${size.width}x${size.height}`)

    // 测试截图
    console.log("✓ 测试截图...")
    const screenshot = await device.screenshotBase64()
    console.log(`  截图长度: ${screenshot.length}`)

    // 测试描述
    console.log("✓ 测试描述...")
    const description = device.describe()
    console.log(`  描述: ${description}`)

    // 测试动作空间
    console.log("✓ 测试动作空间...")
    const actions = device.actionSpace()
    console.log(`  支持 ${actions.length} 个动作:`, actions.map(a => a.name).join(", "))

    // 测试销毁
    console.log("✓ 测试销毁...")
    await device.destroy()

    console.log("\n✅ WindowsDevice 测试通过\n")
  } catch (error) {
    console.error("\n❌ WindowsDevice 测试失败:", error)
    throw error
  }
}

// ==================== AgentOverWindows 基础测试 ====================

async function testAgentOverWindows() {
  console.log("\n🧪 测试 AgentOverWindows...\n")

  const agent = new AgentOverWindows({
    deviceOptions: {
      deviceName: "Test Agent",
      debug: true,
    },
    generateReport: false,
  })

  try {
    // 测试启动
    console.log("✓ 测试启动...")
    await agent.launch()

    // 测试状态
    console.log("✓ 测试状态...")
    const status = agent.getStatus()
    console.log("  状态:", JSON.stringify(status, null, 2))

    // 测试设备信息
    console.log("✓ 测试设备信息...")
    const info = await agent.getDeviceInfo()
    console.log(`  设备信息: ${info.width}x${info.height}`)

    // 测试截图
    console.log("✓ 测试截图...")
    const screenshot = await agent.screenshot()
    console.log(`  截图长度: ${screenshot.length}`)

    // 测试销毁
    console.log("✓ 测试销毁...")
    await agent.destroy()

    console.log("\n✅ AgentOverWindows 测试通过\n")
  } catch (error) {
    console.error("\n❌ AgentOverWindows 测试失败:", error)
    throw error
  }
}

// ==================== WindowsOperateService 基础测试 ====================

async function testWindowsOperateService() {
  console.log("\n🧪 测试 WindowsOperateService...\n")

  const service = WindowsOperateService.getInstance()

  try {
    // 测试启动
    console.log("✓ 测试启动...")
    await service.start()

    // 测试状态检查
    console.log("✓ 测试状态检查...")
    const isStarted = service.isStarted()
    console.log(`  服务已启动: ${isStarted}`)

    // 测试设备信息
    console.log("✓ 测试设备信息...")
    const info = await service.getDeviceInfo()
    console.log(`  设备信息: ${info.width}x${info.height}`)

    // 测试截图
    console.log("✓ 测试截图...")
    const screenshot = await service.screenshot()
    console.log(`  截图长度: ${screenshot.length}`)

    // 测试停止
    console.log("✓ 测试停止...")
    await service.stop()

    console.log("\n✅ WindowsOperateService 测试通过\n")
  } catch (error) {
    console.error("\n❌ WindowsOperateService 测试失败:", error)
    throw error
  } finally {
    // 确保服务停止
    await service.stop().catch(() => {})
  }
}

// ==================== Agent 生命周期测试 ====================

async function testAgentLifecycle() {
  console.log("\n🧪 测试 Agent 生命周期...\n")

  let agent: AgentOverWindows | null = null

  try {
    // 创建 Agent
    console.log("✓ 创建 Agent...")
    agent = new AgentOverWindows({
      deviceOptions: { debug: false },
      generateReport: false,
    })

    // 测试未启动时的错误
    console.log("✓ 测试未启动错误...")
    try {
      await agent.screenshot()
      throw new Error("应该抛出错误")
    } catch (error: any) {
      if (error.message.includes("not launched")) {
        console.log("  ✅ 正确抛出未启动错误")
      } else {
        throw error
      }
    }

    // 启动
    console.log("✓ 启动 Agent...")
    await agent.launch()

    // 测试重复启动
    console.log("✓ 测试重复启动...")
    await agent.launch() // 应该跳过

    // 销毁
    console.log("✓ 销毁 Agent...")
    await agent.destroy()

    // 测试已销毁时的错误
    console.log("✓ 测试已销毁错误...")
    try {
      await agent.screenshot()
      throw new Error("应该抛出错误")
    } catch (error: any) {
      if (error.message.includes("destroyed")) {
        console.log("  ✅ 正确抛出已销毁错误")
      } else {
        throw error
      }
    }

    // 测试重复销毁
    console.log("✓ 测试重复销毁...")
    await agent.destroy() // 应该跳过

    console.log("\n✅ Agent 生命周期测试通过\n")
  } catch (error) {
    console.error("\n❌ Agent 生命周期测试失败:", error)
    throw error
  } finally {
    if (agent) {
      await agent.destroy().catch(() => {})
    }
  }
}

// ==================== Service 重连测试 ====================

async function testServiceReconnect() {
  console.log("\n🧪 测试 Service 重连...\n")

  const service = WindowsOperateService.getInstance()

  try {
    // 启动服务
    console.log("✓ 启动服务...")
    await service.start()

    // 测试连接检查
    console.log("✓ 测试连接检查...")
    const isConnected = await service.checkAndReconnect()
    console.log(`  连接状态: ${isConnected}`)

    // 测试停止
    await service.stop()

    console.log("\n✅ Service 重连测试通过\n")
  } catch (error) {
    console.error("\n❌ Service 重连测试失败:", error)
    throw error
  } finally {
    await service.stop().catch(() => {})
  }
}

// ==================== 运行所有测试 ====================

async function runAllTests() {
  console.log("═══════════════════════════════════════")
  console.log("  Windows Device 测试套件")
  console.log("═══════════════════════════════════════")

  const tests = [
    { name: "WindowsDevice", fn: testWindowsDevice },
    { name: "AgentOverWindows", fn: testAgentOverWindows },
    { name: "WindowsOperateService", fn: testWindowsOperateService },
    { name: "Agent 生命周期", fn: testAgentLifecycle },
    { name: "Service 重连", fn: testServiceReconnect },
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    try {
      await test.fn()
      passed++
    } catch (error) {
      console.error(`\n❌ 测试 "${test.name}" 失败:`, error)
      failed++
    }
  }

  console.log("\n═══════════════════════════════════════")
  console.log(`  测试结果: ${passed} 通过, ${failed} 失败`)
  console.log("═══════════════════════════════════════\n")

  if (failed > 0) {
    process.exit(1)
  }
}

// 主函数
if (require.main === module) {
  runAllTests().catch((error) => {
    console.error("测试套件执行失败:", error)
    process.exit(1)
  })
}

export {
  testWindowsDevice,
  testAgentOverWindows,
  testWindowsOperateService,
  testAgentLifecycle,
  testServiceReconnect,
  runAllTests,
}

