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

  // ==================== 重连机制属性 ====================
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectInterval: number = 5000; // 5秒
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isReconnecting: boolean = false;
  private isStopping: boolean = false; // 标志服务正在停止，防止重连

  // ==================== AgentOverWindows 默认配置 ====================
  private readonly defaultAgentConfig: AgentOverWindowsOpt = {
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
   * 启动服务 - 初始化 AgentOverWindows
   */
  public async start(): Promise<void> {
    if (this.isInitialized && this.agent) {
      console.log('🔄 WindowsOperateService 已启动，跳过重复启动');
      return;
    }

    // 清除停止标志，允许重新启动
    this.isStopping = false;

    console.log('🚀 启动 WindowsOperateService...');

    try {
      // 创建 AgentOverWindows 实例
      await this.createAgent();

      // 初始化连接
      await this.initialize();

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

    // 设置停止标志，防止重连
    this.isStopping = true;

    try {
      // 停止自动重连
      this.stopAutoReconnect();

      // 销毁 agent
      if (this.agent) {
        await this.agent.destroy(true);
        this.agent = null;
      }

      // 重置状态
      this.isInitialized = false;
      this.resetReconnectState();

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
   * 创建 AgentOverWindows 实例
   */
  private async createAgent(): Promise<void> {
    if (this.agent) {
      console.log('🔄 AgentOverWindows 已存在，先销毁旧实例');
      try {
        await this.agent.destroy(true);
      } catch (error) {
        console.warn('销毁旧 AgentOverWindows 时出错:', error);
      }
    }

    console.log('🔧 正在创建 AgentOverWindows，绑定 onTaskStartTip 回调...');

    // 创建 Agent（本地模式，无需连接管理器）
    this.agent = new AgentOverWindows({
      ...this.defaultAgentConfig,
    });

    // 设置任务开始提示回调
    this.setupTaskStartTipCallback();

    console.log('✅ AgentOverWindows 创建完成，onTaskStartTip 已绑定');
  }

  /**
   * 设置任务开始提示回调
   */
  private setupTaskStartTipCallback(): void {
    if (!this.agent) {
      throw new Error('Agent 未创建，无法设置回调');
    }

    // 直接设置回调，不要包装已有的回调
    // 避免形成递归调用链
    this.agent.onTaskStartTip = async (tip: string) => {
      this.handleTaskStartTip(tip);
    };
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

    // 发射事件，让其他地方可以监听到
    this.emit('taskStartTip', tip);
  }

  // ==================== 连接管理相关方法 ====================

  /**
   * 初始化连接（确保只初始化一次）
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('🔄 AgentOverWindows 已经初始化，跳过重复初始化');
      return;
    }

    if (!this.agent) {
      throw new Error('Agent 未创建，请先调用 createAgent()');
    }

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `🔄 尝试初始化 Windows 设备连接 (${attempt}/${maxRetries})...`,
        );

        // 设置 Windows 设备的销毁选项并启动
        await this.agent.setDestroyOptionsAfterConnect();

        this.isInitialized = true;
        console.log('✅ AgentOverWindows 初始化成功');
        return;
      } catch (error) {
        lastError = error as Error;
        console.error(
          `❌ AgentOverWindows 初始化失败 (尝试 ${attempt}/${maxRetries}):`,
          error,
        );

        if (attempt < maxRetries) {
          const delay = attempt * 2000; // 递增延迟：2s, 4s
          console.log(`⏳ ${delay / 1000}秒后重试...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // 所有重试都失败了
    console.error('❌ AgentOverWindows 初始化最终失败，所有重试已用尽');
    throw new Error(
      `初始化失败，已重试${maxRetries}次。最后错误: ${lastError?.message}`,
    );
  }

  // ==================== 重连机制相关方法 ====================

  /**
   * 启动自动重连机制
   */
  private startAutoReconnect(): void {
    if (this.reconnectTimer || this.isReconnecting || this.isStopping) {
      return;
    }

    console.log('🔄 启动自动重连机制...');
    this.reconnectTimer = setInterval(async () => {
      // 如果服务正在停止，不进行重连
      if (this.isStopping) {
        console.log('🛑 服务正在停止，取消自动重连');
        this.stopAutoReconnect();
        return;
      }

      if (this.isInitialized || this.isReconnecting) {
        return;
      }

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log('❌ 已达到最大重连次数，停止自动重连');
        this.stopAutoReconnect();
        return;
      }

      this.isReconnecting = true;
      this.reconnectAttempts++;

      try {
        console.log(
          `🔄 自动重连尝试 ${this.reconnectAttempts}/${this.maxReconnectAttempts}`,
        );
        await this.initialize();

        if (this.isInitialized) {
          console.log('✅ 自动重连成功');
          this.reconnectAttempts = 0;
          this.stopAutoReconnect();
          this.emit('reconnected');
        }
      } catch (error) {
        console.error(
          `❌ 自动重连失败 (${this.reconnectAttempts}/${this.maxReconnectAttempts}):`,
          error,
        );
      } finally {
        this.isReconnecting = false;
      }
    }, this.reconnectInterval);
  }

  /**
   * 停止自动重连
   */
  private stopAutoReconnect(): void {
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * 重置重连状态
   */
  private resetReconnectState(): void {
    this.reconnectAttempts = 0;
    this.isReconnecting = false;
    this.stopAutoReconnect();
  }

  /**
   * 检查连接状态并启动重连
   */
  public async checkAndReconnect(): Promise<boolean> {
    // 如果服务正在停止，不进行重连
    if (this.isStopping) {
      console.log('🛑 服务正在停止，不进行重连检查');
      return false;
    }

    if (this.isInitialized) {
      // Windows 设备连接检查
      const isConnected = await this.quickConnectionCheck();
      if (isConnected) {
        return true;
      }
    }

    console.log('🔄 检测到连接断开，启动重连机制');
    this.isInitialized = false;
    this.startAutoReconnect();
    return false;
  }

  /**
   * 强制重连
   */
  public async forceReconnect(): Promise<void> {
    // 如果服务正在停止，不允许强制重连
    if (this.isStopping) {
      console.log('🛑 服务正在停止，不允许强制重连');
      throw new AppError('服务正在停止，无法重连', 503);
    }

    console.log('🔄 强制重连...');
    this.resetReconnectState();
    this.isInitialized = false;

    try {
      await this.initialize();
      console.log('✅ 强制重连成功');
      this.emit('reconnected');
    } catch (error) {
      console.error('❌ 强制重连失败:', error);
      this.startAutoReconnect();
      throw error;
    }
  }

  /**
   * 重新连接（内部方法）
   */
  private async reconnect(): Promise<void> {
    // 如果服务正在停止，不进行重连
    if (this.isStopping) {
      console.log('🛑 服务正在停止，取消重新连接');
      throw new Error('服务正在停止，无法重新连接');
    }

    try {
      console.log('🔄 尝试重新连接...');
      this.isInitialized = false;

      // 重新创建连接
      await this.createAgent();
      await this.initialize();

      this.isInitialized = true;
      console.log('✅ 重新连接成功');
    } catch (error) {
      console.error('❌ 重新连接失败:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * 超轻量级连接检测 - 仅用于快速检查
   */
  private async quickConnectionCheck(): Promise<boolean> {
    if (!this.agent) {
      return false;
    }

    try {
      // 简单检查 agent 是否已销毁
      return !this.agent.destroyed;
    } catch (_error: any) {
      return false;
    }
  }

  /**
   * 确保连接有效 - 主动连接管理
   */
  private async ensureConnection(): Promise<void> {
    // 如果服务正在停止，不进行连接管理
    if (this.isStopping) {
      throw new Error('服务正在停止，无法确保连接');
    }

    // 如果服务未启动，先启动服务
    if (!this.isStarted()) {
      console.log('🔄 服务未启动，开始启动...');
      await this.start();
      return;
    }

    // 使用轻量级检测检查连接是否真的有效
    const isConnected = await this.quickConnectionCheck();
    if (!isConnected) {
      console.log('🔄 连接已断开，尝试重新连接...');
      await this.reconnect();
    }
  }

  // ==================== 执行相关方法 ====================

  /**
   * 通用重试执行器：抽取公共 withRetry 重试逻辑
   */
  private async runWithRetry<T>(
    _prompt: string,
    maxRetries: number,
    singleAttemptRunner: (attempt: number, maxRetries: number) => Promise<T>,
  ): Promise<T> {
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await singleAttemptRunner(attempt, maxRetries);
        return result;
      } catch (error: any) {
        lastError = error;

        if (this.isConnectionError(error) && attempt < maxRetries) {
          console.log(
            `🔄 检测到连接错误，尝试重新连接 (${attempt}/${maxRetries})`,
          );
          await this.handleConnectionError();
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  }

  /**
   * 检查是否是连接相关的错误
   */
  private isConnectionError(error: any): boolean {
    const errorMessage = error.message || '';
    return (
      errorMessage.includes('connect') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('device') ||
      errorMessage.includes('destroyed')
    );
  }

  /**
   * 处理连接错误
   */
  private async handleConnectionError(): Promise<void> {
    try {
      console.log('🔧 处理连接错误，尝试重新连接...');
      await this.reconnect();

      // 等待一段时间确保连接稳定
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('❌ 处理连接错误失败:', error);
      throw error;
    }
  }

  /**
   * 执行 AI 任务
   * @param prompt - 自然语言任务描述，如 "点击开始菜单"
   * @param maxRetries - 最大重试次数
   */
  async execute(prompt: string, maxRetries: number = 3): Promise<void> {
    // 如果服务未启动，自动启动
    if (!this.isStarted()) {
      console.log('🔄 服务未启动，自动启动 WindowsOperateService...');
      await this.start();
    }

    // 检查连接状态，如果断开则启动重连
    const isConnected = await this.checkAndReconnect();
    if (!isConnected) {
      throw new AppError('Windows 设备连接断开，正在重连中', 503);
    }

    // 确保连接有效
    await this.ensureConnection();

    await this.runWithRetry(prompt, maxRetries, (attempt, max) =>
      this.executeWithRetry(prompt, attempt, max),
    );
  }

  private async executeWithRetry(
    prompt: string,
    _attempt: number,
    _maxRetries: number,
  ): Promise<void> {
    if (!this.agent) {
      throw new AppError('服务启动失败，无法执行任务', 503);
    }

    try {
      console.log(`🚀 开始执行 Windows AI 任务: ${prompt}`);
      console.log(
        `🔍 当前 agent.onTaskStartTip 是否已设置: ${typeof this.agent.onTaskStartTip}`,
      );

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
   * @param maxRetries - 最大重试次数
   */
  async expect(prompt: string, maxRetries: number = 3): Promise<void> {
    // 如果服务未启动，自动启动
    if (!this.isStarted()) {
      console.log('🔄 服务未启动，自动启动 WindowsOperateService...');
      await this.start();
    }

    // 确保连接有效
    await this.ensureConnection();

    await this.runWithRetry(prompt, maxRetries, (attempt, max) =>
      this.expectWithRetry(prompt, attempt, max),
    );
  }

  private async expectWithRetry(
    prompt: string,
    _attempt: number,
    _maxRetries: number,
  ): Promise<void> {
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
   * @param maxRetries - 最大重试次数
   * @param originalCmd - 兜底命令
   * @returns 返回脚本执行结果
   */
  async executeScript(
    yamlContent: string,
    maxRetries: number = 3,
    originalCmd?: string,
  ): Promise<any> {
    // 如果服务未启动，自动启动
    if (!this.isStarted()) {
      console.log('🔄 服务未启动，自动启动 WindowsOperateService...');
      await this.start();
    }

    // 确保连接有效
    await this.ensureConnection();

    try {
      const result = await this.runWithRetry(
        yamlContent,
        maxRetries,
        async (_attempt, _max) => {
          if (!this.agent) {
            throw new AppError('服务启动失败，无法执行脚本', 503);
          }

          try {
            const yamlResult = await this.agent.runYaml(yamlContent);
            serviceLogger.info({ yamlContent }, 'Windows YAML 脚本执行完成');
            return yamlResult;
          } catch (error: any) {
            if (error.message?.includes('ai')) {
              throw new AppError(`AI 执行失败: ${error.message}`, 500);
            }
            throw new AppError(`脚本执行失败: ${error.message}`, 500);
          }
        },
      );
      return result;
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
      throw error;
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
