import { AgentOverChromeBridge } from "@midscene/web/bridge-mode"
import { EventEmitter } from "node:events"
import type { ConnectCurrentTabOption } from "../types/operate"
import { AppError } from "../utils/error"
import { serviceLogger } from "../utils/logger"
import { formatTaskTip, getTaskStageDescription } from "../utils/taskTipFormatter"

export class OperateService extends EventEmitter {
  private static instance: OperateService | null = null
  public agent: AgentOverChromeBridge
  private isInitialized: boolean = false

  private constructor() {
    super()
    console.log("🔧 正在创建 AgentOverChromeBridge，绑定 onTaskStartTip 回调...")
    this.agent = new AgentOverChromeBridge({
      closeNewTabsAfterDisconnect: true,
      closeConflictServer: true, // 自动关闭冲突的服务器
      cacheId: "midscene",
      // 启用实时日志配置
      generateReport: true,
      autoPrintReportMsg: true,
      // 注意：AgentOverChromeBridge 会覆盖 onTaskStartTip，所以我们需要在创建后重新设置
    })

    // 创建后重新设置我们的回调，同时保留原有的 showStatusMessage 功能
    const originalCallback = this.agent.onTaskStartTip
    this.agent.onTaskStartTip = async (tip: string) => {
      // 先调用原始的回调（showStatusMessage）
      if (originalCallback) {
        await originalCallback(tip)
      }
      // 再调用我们的回调
      this.handleTaskStartTip(tip)
    }

    console.log("✅ AgentOverChromeBridge 创建完成，onTaskStartTip 已重新绑定")
  }

  /**
   * 处理任务开始提示的统一方法
   */
  private handleTaskStartTip(tip: string): void {
    const { formatted, category, icon } = formatTaskTip(tip)
    const stageDescription = getTaskStageDescription(category)

    console.log(`🤖 AI 任务开始: ${tip}`)
    console.log(`${icon} ${formatted} (${stageDescription})`)

    serviceLogger.info({
      tip,
      formatted,
      category,
      icon,
      stage: stageDescription
    }, "AI 任务开始执行")

    // 发射事件，让其他地方可以监听到
    this.emit('taskStartTip', tip)
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): OperateService {
    if (!OperateService.instance) {
      OperateService.instance = new OperateService()
    }
    return OperateService.instance
  }

  /**
   * 初始化连接（确保只初始化一次）
   */
  async initialize(
    option: { forceSameTabNavigation: boolean } = {
      forceSameTabNavigation: true,
    }
  ) {
    if (this.isInitialized) {
      console.log("🔄 AgentOverChromeBridge 已经初始化，跳过重复初始化")
      return
    }

    const maxRetries = 3
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 尝试初始化连接 (${attempt}/${maxRetries})...`)
        await this.agent.connectCurrentTab(option)
        this.isInitialized = true
        console.log("✅ AgentOverChromeBridge 初始化成功")
        return
      } catch (error) {
        lastError = error as Error
        console.error(`❌ AgentOverChromeBridge 初始化失败 (尝试 ${attempt}/${maxRetries}):`, error)

        if (attempt < maxRetries) {
          const delay = attempt * 2000 // 递增延迟：2s, 4s
          console.log(`⏳ ${delay/1000}秒后重试...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    // 所有重试都失败了
    console.error("❌ AgentOverChromeBridge 初始化最终失败，所有重试已用尽")
    throw new Error(`初始化失败，已重试${maxRetries}次。最后错误: ${lastError?.message}`)
  }

  /**
   * 检查连接状态 - 真实检测
   */
  private async checkConnectionStatus(): Promise<boolean> {
    try {
      // 执行轻量级检测：检查页面是否可访问
      await this.agent.evaluateJavaScript("document.readyState")
      return true
    } catch (error: any) {
      const message = error?.message || ""
      // 检测到连接断开的关键词
      if (
        message.includes("no tab is connected") ||
        message.includes("bridge client") ||
        message.includes("Debugger is not attached") ||
        message.includes("tab with id")
      ) {
        console.log("🔍 检测到连接断开:", message)
        return false
      }
      // 其他错误可能是页面问题，不算连接断开
      return true
    }
  }


  /**
   * 重新连接
   */
  private async reconnect(): Promise<void> {
    try {
      console.log("🔄 尝试重新连接...")
      this.isInitialized = false

      // 销毁现有连接
      try {
        await this.agent.destroy()
      } catch (error) {
        console.warn("销毁现有连接时出错:", error)
      }

      // 重新创建连接
      console.log("🔧 重连时重新创建 AgentOverChromeBridge，重新绑定 onTaskStartTip...")
      this.agent = new AgentOverChromeBridge({
        closeNewTabsAfterDisconnect: true,
        closeConflictServer: true, // 自动关闭冲突的服务器
        cacheId: "midscene",
        generateReport: true,
        autoPrintReportMsg: true,
      })

      // 重连后重新设置我们的回调，同时保留原有的 showStatusMessage 功能
      const originalCallback = this.agent.onTaskStartTip
      this.agent.onTaskStartTip = async (tip: string) => {
        // 先调用原始的回调（showStatusMessage）
        if (originalCallback) {
          await originalCallback(tip)
        }
        // 再调用我们的回调
        this.handleTaskStartTip(tip)
      }

      console.log("✅ 重连时 AgentOverChromeBridge 重新创建完成，onTaskStartTip 已重新绑定")

      await this.agent.connectCurrentTab({
        forceSameTabNavigation: true,
      })

      this.isInitialized = true
      console.log("✅ 重新连接成功")
    } catch (error) {
      console.error("❌ 重新连接失败:", error)
      this.isInitialized = false
    }
  }

  async connectCurrentTab(option: ConnectCurrentTabOption) {
    try {
      await this.agent.connectCurrentTab(option)
      serviceLogger.info({ option }, "浏览器标签页连接成功")
    } catch (error: any) {
      serviceLogger.error({ error }, "浏览器标签页连接失败")

      // 处理浏览器连接错误
      if (error.message?.includes("connect")) {
        throw new AppError("Failed to connect to browser", 503)
      }
      // 处理其他连接错误
      throw new AppError(`Browser connection error: ${error.message}`, 500)
    }
  }

  /**
   * 通用重试执行器：抽取公共 withRetry 重试逻辑
   */
  private async runWithRetry<T>(
    _prompt: string,
    maxRetries: number,
    singleAttemptRunner: (attempt: number, maxRetries: number) => Promise<T>
  ): Promise<T> {
    let lastError: any = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await singleAttemptRunner(attempt, maxRetries)
        return result
      } catch (error: any) {
        lastError = error

        if (this.isConnectionError(error) && attempt < maxRetries) {
          console.log(`🔄 检测到连接错误，尝试重新连接 (${attempt}/${maxRetries})`)
          await this.handleConnectionError()
          continue
        }

        throw error
      }
    }

    throw lastError
  }

  async execute(prompt: string, maxRetries: number = 3): Promise<void> {
    // 执行前确保连接当前标签页
    await this.ensureCurrentTabConnection()

    await this.runWithRetry(prompt, maxRetries, (attempt, max) => this.executeWithRetry(prompt, attempt, max))
  }

  private async executeWithRetry(prompt: string, _attempt: number, _maxRetries: number): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("AgentOverChromeBridge 未初始化，请先调用 initialize() 方法")
    }

    try {
      console.log(`🚀 开始执行 AI 任务: ${prompt}`)
      console.log(`🔍 当前 agent.onTaskStartTip 是否已设置: ${typeof this.agent.onTaskStartTip}`)


      await this.agent.ai(prompt)
      console.log(`✅ AI 任务执行完成: ${prompt}`)
    } catch (error: any) {
      console.log(`❌ AI 任务执行失败: ${error.message}`)
      if (error.message?.includes("ai")) {
        throw new AppError(`AI execution failed: ${error.message}`, 500)
      }
      throw new AppError(`Operation execution error: ${error.message}`, 500)
    }
  }

  /**
   * 检查是否是连接相关的错误
   */
  private isConnectionError(error: any): boolean {
    const errorMessage = error.message || ""
    return (
      errorMessage.includes("Debugger is not attached") ||
      errorMessage.includes("connect") ||
      errorMessage.includes("bridge client") ||
      errorMessage.includes("tab with id") ||
      errorMessage.includes("connection")
    )
  }

  /**
   * 处理连接错误
   */
  private async handleConnectionError(): Promise<void> {
    try {
      console.log("🔧 处理连接错误，尝试重新连接...")
      await this.reconnect()

      // 等待一段时间确保连接稳定
      await new Promise((resolve) => setTimeout(resolve, 2000))
    } catch (error) {
      console.error("❌ 处理连接错误失败:", error)
      throw error
    }
  }

  async expect(prompt: string, maxRetries: number = 3): Promise<void> {
    // 执行前确保连接当前标签页
    await this.ensureCurrentTabConnection()

    await this.runWithRetry(prompt, maxRetries, (attempt, max) => this.expectWithRetry(prompt, attempt, max))
  }

  private async expectWithRetry(prompt: string, _attempt: number, _maxRetries: number): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("AgentOverChromeBridge 未初始化，请先调用 initialize() 方法")
    }

    try {
      await this.agent.aiAssert(prompt)
    } catch (error: any) {
      if (error.message?.includes("ai")) {
        throw new AppError(`AI assertion failed: ${error.message}`, 500)
      }
      throw new AppError(`Assertion execution error: ${error.message}`, 500)
    }
  }

  async executeScript(prompt: string, maxRetries: number = 3): Promise<void> {
    // 执行前确保连接当前标签页
    await this.ensureCurrentTabConnection()

    await this.runWithRetry(prompt, maxRetries, (attempt, max) => this.executeScriptWithRetry(prompt, attempt, max))
  }

  private async executeScriptWithRetry(prompt: string, _attempt: number, _maxRetries: number): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("AgentOverChromeBridge 未初始化，请先调用 initialize() 方法")
    }

    try {
      await this.agent.runYaml(prompt)
    } catch (error: any) {
      if (error.message?.includes("ai")) {
        throw new AppError(`AI execution failed: ${error.message}`, 500)
      }
      throw new AppError(`Operation execution error: ${error.message}`, 500)
    }
  }

  async destroy() {
    try {
      await this.agent.destroy()
      this.isInitialized = false
      console.log("✅ AgentOverChromeBridge 已销毁")
    } catch (error) {
      console.error("销毁失败:", error)
      throw error
    }
  }

  /**
   * 重置单例实例（用于测试或强制重新初始化）
   */
  public static resetInstance() {
    if (OperateService.instance) {
      OperateService.instance.destroy().catch(console.error)
      OperateService.instance = null
    }
  }

  /**
   * 检查是否已初始化
   */
  public isReady(): boolean {
    return this.isInitialized
  }

  /**
   * 确保连接有效 - 主动连接管理
   */
  private async ensureConnection(): Promise<void> {
    if (!this.isInitialized) {
      console.log("🔄 服务未初始化，开始初始化...")
      await this.initialize({ forceSameTabNavigation: true })
      return
    }

    // 检查连接是否真的有效
    const isConnected = await this.checkConnectionStatus()
    if (!isConnected) {
      console.log("🔄 连接已断开，尝试重新连接...")
      await this.reconnect()
    }
  }

  /**
   * 确保连接当前标签页 - 在所有操作前调用
   */
  private async ensureCurrentTabConnection(): Promise<void> {
    try {
      // 先确保服务已初始化
      await this.ensureConnection()

      // 尝试连接当前标签页，如果已经连接会忽略
      await this.agent.connectCurrentTab({ forceSameTabNavigation: true })
      console.log("✅ 确保当前标签页连接成功")
    } catch (error: any) {
      console.warn("⚠️ 连接当前标签页时出现警告:", error.message)
      // 如果是"Another debugger is already attached"错误，我们忽略它
      // 因为这意味着连接已经存在
      if (!error.message?.includes("Another debugger is already attached")) {
        throw error
      }
    }
  }

  /**
   * 评估页面 JavaScript（带主动连接保证）
   */
  public async evaluateJavaScript(script: string): Promise<any> {
    try {
      // 执行前确保连接当前标签页
      await this.ensureCurrentTabConnection()
      return await this.agent.evaluateJavaScript(script)
    } catch (error) {
      throw new AppError(`JavaScript evaluation failed: ${error}`, 500)
    }
  }
}
