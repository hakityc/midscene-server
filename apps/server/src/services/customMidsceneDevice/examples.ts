/**
 * Windows 设备操作示例
 * 
 * 这个文件包含了使用 WindowsDevice、AgentOverWindows 和 WindowsOperateService 的各种示例
 */

import AgentOverWindows from "./agentOverWindows"
import WindowsDevice from "./windowsDevice"
import { WindowsOperateService } from "../windowsOperateService"

// ==================== 示例 1: 直接使用 WindowsDevice ====================

export async function example1_DirectDevice() {
  console.log("\n=== 示例 1: 直接使用 WindowsDevice ===\n")

  // 创建设备
  const device = new WindowsDevice({
    deviceName: "My Windows App",
    debug: true,
  })

  // 启动设备
  await device.launch()

  // 获取屏幕尺寸
  const size = await device.size()
  console.log("屏幕尺寸:", size)

  // 截图
  const screenshot = await device.screenshotBase64()
  console.log("截图长度:", screenshot.length)

  // 获取设备描述
  console.log("设备描述:", device.describe())

  // 查看支持的动作
  const actions = device.actionSpace()
  console.log("支持的动作:", actions.map(a => a.name).join(", "))

  // 销毁设备
  await device.destroy()
}

// ==================== 示例 2: 使用 AgentOverWindows 执行 AI 任务 ====================

export async function example2_BasicAgent() {
  console.log("\n=== 示例 2: 使用 AgentOverWindows 执行 AI 任务 ===\n")

  // 创建 Agent
  const agent = new AgentOverWindows({
    deviceOptions: {
      deviceName: "Test App",
      debug: true,
    },
    generateReport: true,
    autoPrintReportMsg: true,
  })

  // 启动
  await agent.launch()

  // 执行 AI 任务
  await agent.aiAction("点击开始菜单")
  await agent.aiAction("在搜索框输入'notepad'")
  await agent.aiTap("记事本应用图标")

  // 输入文本
  await agent.aiInput("Hello, World!", "文本编辑区域")

  // 执行断言
  await agent.aiAssert("文本编辑区域包含'Hello, World!'")

  // 查询信息
  const windowTitle = await agent.aiString("获取当前窗口标题")
  console.log("窗口标题:", windowTitle)

  // 布尔查询
  const isVisible = await agent.aiBoolean("保存按钮是否可见")
  console.log("保存按钮可见:", isVisible)

  // 销毁
  await agent.destroy()
}

// ==================== 示例 3: 使用 WindowsOperateService (推荐) ====================

export async function example3_ServiceUsage() {
  console.log("\n=== 示例 3: 使用 WindowsOperateService ===\n")

  // 获取服务实例（单例）
  const service = WindowsOperateService.getInstance()

  // 监听任务事件
  service.on("taskStartTip", (tip: string) => {
    console.log("📋 任务开始:", tip)
  })

  // 启动服务
  await service.start()

  // 执行任务
  await service.execute("打开记事本")
  await service.execute("输入'这是一个测试'")
  
  // 执行断言
  await service.expect("记事本窗口已打开")

  // 获取设备信息
  const info = await service.getDeviceInfo()
  console.log("设备信息:", info)

  // 截图
  const screenshot = await service.screenshot()
  console.log("截图获取成功，长度:", screenshot.length)

  // 停止服务
  await service.stop()
}

// ==================== 示例 4: 执行 YAML 脚本 ====================

export async function example4_YamlScript() {
  console.log("\n=== 示例 4: 执行 YAML 脚本 ===\n")

  const service = WindowsOperateService.getInstance()
  await service.start()

  // YAML 脚本
  const yamlScript = `
tasks:
  - name: 打开记事本
    type: action
    prompt: 点击开始菜单，然后点击记事本

  - name: 输入文本
    type: action
    prompt: 在文本框输入"Hello from YAML script"

  - name: 验证内容
    type: assert
    prompt: 文本框包含"Hello from YAML script"

  - name: 保存文件
    type: action
    prompt: 按Ctrl+S保存文件
`

  await service.executeScript(yamlScript)
  
  await service.stop()
}

// ==================== 示例 5: 高级用法 - 窗口管理 ====================

export async function example5_WindowManagement() {
  console.log("\n=== 示例 5: 高级用法 - 窗口管理 ===\n")

  const agent = new AgentOverWindows({
    deviceOptions: { debug: true },
  })

  await agent.launch()

  // 获取所有窗口
  const windows = await agent.getWindowList()
  console.log("当前窗口列表:")
  windows.forEach(w => {
    console.log(`  - ${w.title} (${w.handle}) ${w.isActive ? '✓' : ''}`)
  })

  // 激活特定窗口
  const notepadWindow = windows.find(w => w.title.includes("Notepad"))
  if (notepadWindow) {
    console.log(`激活窗口: ${notepadWindow.title}`)
    await agent.activateWindow(notepadWindow.handle)
  }

  // 剪贴板操作
  await agent.setClipboard("复制的文本内容")
  const clipboardContent = await agent.getClipboard()
  console.log("剪贴板内容:", clipboardContent)

  await agent.destroy()
}

// ==================== 示例 6: 错误处理和重试 ====================

export async function example6_ErrorHandling() {
  console.log("\n=== 示例 6: 错误处理和重试 ===\n")

  const service = WindowsOperateService.getInstance()
  await service.start()

  try {
    // 带重试的任务执行
    await service.execute("执行一个可能失败的任务", 3) // 最多重试3次
    console.log("✅ 任务执行成功")
  } catch (error: any) {
    console.error("❌ 任务执行失败:", error.message)
  }

  // 检查并重连
  const isConnected = await service.checkAndReconnect()
  if (!isConnected) {
    console.log("🔄 连接断开，正在重连...")
  }

  // 强制重连
  try {
    await service.forceReconnect()
    console.log("✅ 重连成功")
  } catch (error: any) {
    console.error("❌ 重连失败:", error.message)
  }

  await service.stop()
}

// ==================== 示例 7: 使用自定义动作 ====================

export async function example7_CustomActions() {
  console.log("\n=== 示例 7: 使用自定义动作 ===\n")

  const { defineAction } = await import("@midscene/core/device")
  const { z } = await import("@midscene/core")

  // 定义自定义动作
  const customActions = [
    defineAction({
      name: "CustomScreenshot",
      description: "Take a custom screenshot with timestamp",
      args: z.object({
        filename: z.string(),
      }),
      fn: async ({ filename }) => {
        console.log(`📸 Taking custom screenshot: ${filename}`)
        // 实现自定义截图逻辑
      },
    }),
  ]

  // 创建带自定义动作的设备
  const device = new WindowsDevice({
    deviceName: "Custom Device",
    debug: true,
    customActions,
  })

  await device.launch()

  // 查看所有动作
  const actions = device.actionSpace()
  console.log("可用动作:", actions.map(a => a.name).join(", "))

  await device.destroy()
}

// ==================== 示例 8: 任务回调和状态监控 ====================

export async function example8_TaskCallbacks() {
  console.log("\n=== 示例 8: 任务回调和状态监控 ===\n")

  const agent = new AgentOverWindows({
    deviceOptions: { debug: true },
    onTaskStartTip: (tip: string) => {
      console.log("🔔 任务提示:", tip)
    },
    generateReport: true,
    autoPrintReportMsg: true,
  })

  await agent.launch()

  // 检查状态
  const status = agent.getStatus()
  console.log("Agent 状态:", status)

  // 执行任务（会触发 onTaskStartTip）
  await agent.aiAction("点击按钮")

  // 记录截图到报告
  await agent.logScreenshot("测试截图", {
    content: "这是一个测试截图，用于记录当前状态"
  })

  await agent.destroy()
}

// ==================== 示例 9: 完整的自动化流程 ====================

export async function example9_CompleteWorkflow() {
  console.log("\n=== 示例 9: 完整的自动化流程 ===\n")

  const service = WindowsOperateService.getInstance()
  
  // 启动服务
  await service.start()

  try {
    // 1. 打开应用
    console.log("步骤 1: 打开计算器")
    await service.execute("打开计算器应用")
    await service.expect("计算器窗口已打开")

    // 2. 执行计算
    console.log("步骤 2: 执行计算")
    await service.execute("点击数字 5")
    await service.execute("点击加号")
    await service.execute("点击数字 3")
    await service.execute("点击等号")

    // 3. 验证结果
    console.log("步骤 3: 验证结果")
    await service.expect("显示结果为 8")

    // 4. 截图保存
    console.log("步骤 4: 保存截图")
    const screenshot = await service.screenshot()
    // 可以保存到文件或上传到服务器

    console.log("✅ 自动化流程执行成功")
  } catch (error: any) {
    console.error("❌ 自动化流程失败:", error.message)
  } finally {
    await service.stop()
  }
}

// ==================== 主函数 - 运行所有示例 ====================

export async function runAllExamples() {
  console.log("🚀 开始运行所有示例...\n")

  try {
    await example1_DirectDevice()
    await example2_BasicAgent()
    await example3_ServiceUsage()
    await example4_YamlScript()
    await example5_WindowManagement()
    await example6_ErrorHandling()
    await example7_CustomActions()
    await example8_TaskCallbacks()
    await example9_CompleteWorkflow()

    console.log("\n✅ 所有示例运行完成")
  } catch (error) {
    console.error("\n❌ 示例运行失败:", error)
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples().catch(console.error)
}

