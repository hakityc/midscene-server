import { AgentOverChromeBridge } from "@midscene/web/bridge-mode"
import { AppError } from "../utils/error"
import type { ConnectCurrentTabOption } from "../types/operate"
import { serviceLogger } from "../utils/logger"

export class OperateService {
  private static instance: OperateService | null = null
  private agent: AgentOverChromeBridge
  private isInitialized: boolean = false

  private constructor() {
    this.agent = new AgentOverChromeBridge({
      closeNewTabsAfterDisconnect: true,
      cacheId: "midscene",
    })
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
  async initialize(option: { forceSameTabNavigation: boolean } = { forceSameTabNavigation: true }) {
    if (this.isInitialized) {
      console.log("🔄 AgentOverChromeBridge 已经初始化，跳过重复初始化")
      return
    }

    try {
      await this.agent.connectCurrentTab(option)
      this.isInitialized = true
      console.log("✅ AgentOverChromeBridge 初始化成功")
    } catch (error) {
      console.error("❌ AgentOverChromeBridge 初始化失败:", error)
      throw error
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

  async execute(prompt: string) {
    if (!this.isInitialized) {
      throw new Error("AgentOverChromeBridge 未初始化，请先调用 initialize() 方法")
    }

    try {
      await this.agent.ai(prompt)
      serviceLogger.info({ prompt }, "AI执行成功")
    } catch (error: any) {
      // 处理AI执行错误
      if (error.message?.includes("ai")) {
        serviceLogger.error({ error }, "AI执行失败")
        throw new AppError(`AI execution failed: ${error.message}`, 500)
      }
      // 处理其他执行错误
      serviceLogger.error({ error }, "操作执行错误")
      throw new AppError(`Operation execution error: ${error.message}`, 500)
    }
  }

  async expect(prompt: string) {
    if (!this.isInitialized) {
      throw new Error("AgentOverChromeBridge 未初始化，请先调用 initialize() 方法")
    }
    try {
      await this.agent.aiAssert(prompt)
      serviceLogger.info({ prompt }, "AI断言成功")
    } catch (error: any) {
      // 处理AI断言错误
      if (error.message?.includes("ai")) {
        serviceLogger.error({ error }, "AI断言失败")
        throw new AppError(`AI assertion failed: ${error.message}`, 500)
      }
      // 处理其他断言错误
      serviceLogger.error({ error }, "断言执行错误")
      throw new AppError(`Assertion execution error: ${error.message}`, 500)
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
    return this.isInitialized;
  }
}
