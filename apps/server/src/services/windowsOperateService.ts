import { EventEmitter } from 'node:events';
import { AppError } from '../utils/error';
import { serviceLogger } from '../utils/logger';
import {
  formatTaskTip,
  getTaskStageDescription,
} from '../utils/taskTipFormatter';
import AgentOverWindows, {
  type AgentOverWindowsOpt,
} from './customMidsceneDevice/agentOverWindows';

/**
 * WindowsOperateService - Windows 应用操作服务
 *
 * 提供 Windows 桌面应用的 AI 自动化操作能力
 * 使用本地 nut-js 实现，无需远程 Windows 客户端
 * 设计参考 WebOperateService，适配 Windows 平台特性
 */
export class WindowsOperateService extends EventEmitter {
  // ==================== 单例模式相关 ====================
  private static instance: WindowsOperateService | null = null;

  // ==================== 核心属性 ====================
  public agent: AgentOverWindows | null = null;
  private isInitialized: boolean = false;

  // ==================== 回调机制属性 ====================
  private taskTipCallbacks: Array<
    (tip: string, bridgeError?: Error | null) => void
  > = [];

  // ==================== AgentOverWindows 默认配置 ====================
  // 注意：不要在这里使用箭头函数引用 this，会导致上下文问题
  // onTaskStartTip 回调会在 createAgent() 方法中动态创建
  private readonly defaultAgentConfig: Omit<
    AgentOverWindowsOpt,
    'onTaskStartTip'
  > = {
    closeAfterDisconnect: false,
    generateReport: true,
    autoPrintReportMsg: true,
    deviceOptions: {
      deviceName: 'Windows Desktop',
      debug: true, // 开发阶段启用调试
    },
  };

  private constructor() {
    super();
    // 延迟初始化 agent
  }

  // ==================== 单例模式方法 ====================

  /**
   * 获取单例实例
   */
  public static getInstance(): WindowsOperateService {
    if (!WindowsOperateService.instance) {
      WindowsOperateService.instance = new WindowsOperateService();
    }
    return WindowsOperateService.instance;
  }

  /**
   * 重置单例实例（用于测试或强制重新初始化）
   */
  public static resetInstance(): void {
    if (WindowsOperateService.instance) {
      WindowsOperateService.instance.stop().catch(console.error);
      WindowsOperateService.instance = null;
    }
  }

  // ==================== 生命周期方法 ====================

  /**
   * 启动服务 - 创建并初始化 AgentOverWindows
   */
  public async start(): Promise<void> {
    if (this.isInitialized && this.agent) {
      console.log('🔄 WindowsOperateService 已启动，跳过重复启动');
      return;
    }

    console.log('🚀 启动 WindowsOperateService...');

    try {
      // 创建并初始化 AgentOverWindows（合并了创建和初始化流程）
      await this.createAgent();

      console.log('✅ WindowsOperateService 启动成功');
    } catch (error) {
      console.error('❌ WindowsOperateService 启动失败:', error);
      throw error;
    }
  }

  /**
   * 停止服务 - 销毁 AgentOverWindows
   */
  public async stop(): Promise<void> {
    console.log('🛑 停止 WindowsOperateService...');

    try {
      // 销毁 agent
      if (this.agent) {
        await this.agent.destroy(true);
        this.agent = null;
      }

      // 重置状态
      this.isInitialized = false;

      console.log('✅ WindowsOperateService 已停止');
    } catch (error) {
      console.error('❌ 停止 WindowsOperateService 时出错:', error);
      throw error;
    }
  }

  /**
   * 检查服务是否已启动
   */
  public isStarted(): boolean {
    return this.isInitialized && this.agent !== null;
  }

  /**
   * 检查是否已初始化（向后兼容）
   */
  public isReady(): boolean {
    return this.isInitialized && this.agent !== null;
  }

  /**
   * 销毁服务（向后兼容）
   */
  async destroy(): Promise<void> {
    return this.stop();
  }

  // ==================== AgentOverWindows 管理 ====================

  /**
   * 创建并初始化 AgentOverWindows 实例
   * 合并了创建和初始化流程，简化代码
   */
  private async createAgent(): Promise<void> {
    // 如果已经初始化，直接返回
    if (this.isInitialized && this.agent) {
      console.log('🔄 AgentOverWindows 已初始化，跳过重复创建');
      return;
    }

    // 销毁旧实例
    if (this.agent) {
      console.log('🔄 AgentOverWindows 已存在，先销毁旧实例');
      try {
        await this.agent.destroy(true);
      } catch (error) {
        console.warn('销毁旧 AgentOverWindows 时出错:', error);
      }
    }

    console.log('🔧 正在创建并初始化 AgentOverWindows...');

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 尝试创建 Agent (${attempt}/${maxRetries})...`);

        // 创建 Agent（本地模式）
        // onTaskStartTip 在这里动态传入，确保 this 正确绑定
        this.agent = new AgentOverWindows({
          ...this.defaultAgentConfig,
          onTaskStartTip: (tip: string) => {
            this.handleTaskStartTip(tip);
          },
        });

        // 立即启动 Agent
        await this.agent.launch();

        this.isInitialized = true;
        console.log('✅ AgentOverWindows 创建并初始化成功');
        return;
      } catch (error) {
        lastError = error as Error;
        console.error(
          `❌ AgentOverWindows 创建失败 (尝试 ${attempt}/${maxRetries}):`,
          error,
        );

        // 清理失败的 agent
        if (this.agent) {
          try {
            await this.agent.destroy(true);
          } catch {
            // 忽略清理错误
          }
          this.agent = null;
        }

        if (attempt < maxRetries) {
          const delay = attempt * 2000; // 递增延迟：2s, 4s
          console.log(`⏳ ${delay / 1000}秒后重试...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // 所有重试都失败了
    console.error('❌ AgentOverWindows 创建最终失败，所有重试已用尽');
    throw new Error(
      `创建失败，已重试 ${maxRetries} 次。最后错误: ${lastError?.message}`,
    );
  }

  /**
   * 处理任务开始提示的统一方法
   */
  private handleTaskStartTip(tip: string): void {
    const { formatted, category, icon } = formatTaskTip(tip);
    const stageDescription = getTaskStageDescription(category);

    console.log(`🤖 AI 任务开始: ${tip}`);
    console.log(`${icon} ${formatted} (${stageDescription})`);

    serviceLogger.info(
      {
        tip,
        formatted,
        category,
        icon,
        stage: stageDescription,
      },
      'Windows AI 任务开始执行',
    );

    // 触发所有注册的回调
    for (const callback of this.taskTipCallbacks) {
      try {
        callback(tip);
      } catch (error) {
        console.warn('taskTipCallback 执行出错:', error);
      }
    }

    // 发射事件，让其他地方可以监听到
    this.emit('taskStartTip', tip);
  }

  // ==================== 回调机制方法 ====================

  /**
   * 注册任务提示回调
   * @param callback 任务提示回调函数
   */
  public onTaskTip(
    callback: (tip: string, bridgeError?: Error | null) => void,
  ): void {
    this.taskTipCallbacks.push(callback);
  }

  /**
   * 移除任务提示回调
   * @param callback 要移除的回调函数
   */
  public offTaskTip(
    callback: (tip: string, bridgeError?: Error | null) => void,
  ): void {
    const index = this.taskTipCallbacks.indexOf(callback);
    if (index > -1) {
      this.taskTipCallbacks.splice(index, 1);
    }
  }

  /**
   * 清空所有任务提示回调
   */
  public clearTaskTipCallbacks(): void {
    this.taskTipCallbacks = [];
  }

  /**
   * 创建任务提示回调（封装通用逻辑，供 WebSocket handler 使用）
   * @param config 配置对象
   * @returns 配置好的任务提示回调函数
   */
  public createTaskTipCallback<T>(config: {
    send: (response: any) => boolean;
    message: T;
    connectionId: string;
    wsLogger: any;
    createSuccessResponseWithMeta: (
      message: T,
      data: any,
      meta: any,
      action?: any,
    ) => any;
    createErrorResponse: (
      message: T,
      error: Error,
      errorMessage: string,
    ) => any;
    formatTaskTip: (tip: string) => {
      formatted: string;
      icon: string;
      category: string;
    };
    getTaskStageDescription: (category: string) => string;
    WebSocketAction: any;
  }): (tip: string, bridgeError?: Error | null) => void {
    const {
      send,
      message,
      connectionId,
      wsLogger,
      createSuccessResponseWithMeta,
      createErrorResponse,
      formatTaskTip,
      getTaskStageDescription,
      WebSocketAction,
    } = config;

    return (tip: string, bridgeError?: Error | null) => {
      try {
        // 格式化任务提示
        const { formatted, category } = formatTaskTip(tip);
        const timestamp = new Date().toLocaleTimeString('zh-CN', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        console.log(`🎯 WebSocket 监听到 Windows 任务提示: ${tip}`);

        // 如果有错误，先发送警告消息
        if (bridgeError) {
          const errorMessage = `⚠️ 任务执行异常: ${bridgeError.message}`;
          const errorResponse = createErrorResponse(
            message,
            bridgeError,
            errorMessage,
          );
          send(errorResponse);

          wsLogger.warn(
            {
              connectionId,
              tip,
              error: bridgeError.message,
              stack: bridgeError.stack,
            },
            'Windows 任务执行出现异常，但任务继续执行',
          );
        }

        // 发送格式化后的用户友好消息（移除 emoji）
        const response = createSuccessResponseWithMeta(
          message,
          formatted
            .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
            .trim(),
          {
            originalTip: tip,
            category,
            timestamp,
            stage: getTaskStageDescription(category),
            bridgeError: bridgeError
              ? {
                  message: bridgeError.message,
                  type: 'task_error',
                }
              : undefined,
          },
          WebSocketAction.CALLBACK_AI_STEP,
        );
        send(response);
      } catch (error) {
        // 捕获回调执行过程中的任何错误，避免影响主流程
        wsLogger.warn(
          {
            connectionId,
            tip,
            error,
          },
          'Windows 任务提示回调执行失败，但不影响主任务',
        );
      }
    };
  }

  // ==================== 执行相关方法 ====================

  /**
   * 执行 AI 任务
   * @param prompt - 自然语言任务描述，如 "点击开始菜单"
   */
  async execute(prompt: string): Promise<void> {
    // 如果服务未启动，自动启动
    if (!this.isStarted()) {
      console.log('🔄 服务未启动，自动启动 WindowsOperateService...');
      await this.start();
    }

    if (!this.agent) {
      throw new AppError('服务启动失败，无法执行任务', 503);
    }

    try {
      console.log(`🚀 开始执行 Windows AI 任务: ${prompt}`);

      // 使用 aiAction 方法执行任务
      await this.agent.aiAction(prompt);
      console.log(`✅ Windows AI 任务执行完成: ${prompt}`);
    } catch (error: any) {
      console.log(`❌ Windows AI 任务执行失败: ${error.message}`);
      if (error.message?.includes('ai')) {
        throw new AppError(`AI 执行失败: ${error.message}`, 500);
      }
      throw new AppError(`任务执行失败: ${error.message}`, 500);
    }
  }

  /**
   * 执行 AI 断言
   * @param prompt - 断言描述，如 "窗口标题是'记事本'"
   */
  async expect(prompt: string): Promise<void> {
    // 如果服务未启动，自动启动
    if (!this.isStarted()) {
      console.log('🔄 服务未启动，自动启动 WindowsOperateService...');
      await this.start();
    }

    if (!this.agent) {
      throw new AppError('服务启动失败，无法执行断言', 503);
    }

    try {
      await this.agent.aiAssert(prompt);
      console.log(`✅ Windows AI 断言成功: ${prompt}`);
    } catch (error: any) {
      console.log(`❌ Windows AI 断言失败: ${error.message}`);
      if (error.message?.includes('ai')) {
        throw new AppError(`AI 断言失败: ${error.message}`, 500);
      }
      throw new AppError(`断言执行失败: ${error.message}`, 500);
    }
  }

  /**
   * 执行 YAML 脚本
   * @param yamlContent - YAML 脚本内容
   * @param originalCmd - 兜底命令
   * @returns 返回脚本执行结果
   */
  async executeScript(yamlContent: string, originalCmd?: string): Promise<any> {
    // 如果服务未启动，自动启动
    if (!this.isStarted()) {
      console.log('🔄 服务未启动，自动启动 WindowsOperateService...');
      await this.start();
    }

    if (!this.agent) {
      throw new AppError('服务启动失败，无法执行脚本', 503);
    }

    try {
      const yamlResult = await this.agent.runYaml(yamlContent);
      serviceLogger.info({ yamlContent }, 'Windows YAML 脚本执行完成');
      return yamlResult;
    } catch (error: any) {
      // 如果提供了 originalCmd，则先尝试兜底执行
      if (originalCmd) {
        try {
          await this.execute(originalCmd);
          serviceLogger.warn(
            { yamlContent, originalCmd, originalError: error?.message },
            'YAML 执行失败，但兜底执行成功，忽略原错误',
          );
          return undefined; // 兜底执行没有返回值
        } catch (fallbackErr: any) {
          serviceLogger.error(
            {
              yamlContent,
              originalCmd,
              originalError: error,
              fallbackError: fallbackErr,
            },
            'YAML 执行失败，兜底执行也失败',
          );
          throw new AppError(
            `YAML 脚本执行失败: ${error?.message} | 兜底失败: ${fallbackErr?.message}`,
            500,
          );
        }
      }

      // 没有兜底命令，直接抛出错误
      if (error.message?.includes('ai')) {
        throw new AppError(`AI 执行失败: ${error.message}`, 500);
      }
      throw new AppError(`脚本执行失败: ${error.message}`, 500);
    }
  }

  /**
   * 获取 Windows 设备信息
   */
  public async getDeviceInfo(): Promise<{
    width: number;
    height: number;
    dpr?: number;
  }> {
    if (!this.agent) {
      throw new AppError('服务未启动', 503);
    }

    try {
      const size = await this.agent.interface.size();
      return size;
    } catch (error: any) {
      throw new AppError(`获取设备信息失败: ${error.message}`, 500);
    }
  }

  /**
   * 截图
   */
  public async screenshot(): Promise<string> {
    if (!this.agent) {
      throw new AppError('服务未启动', 503);
    }

    try {
      const screenshot = await this.agent.interface.screenshotBase64();
      return screenshot;
    } catch (error: any) {
      throw new AppError(`截图失败: ${error.message}`, 500);
    }
  }
}
