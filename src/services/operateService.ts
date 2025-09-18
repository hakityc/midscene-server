import { AgentOverChromeBridge } from '@midscene/web/bridge-mode';
import type { ConnectCurrentTabOption } from '../types/operate';
import { AppError } from '../utils/error';
import { serviceLogger } from '../utils/logger';

export class OperateService {
  private static instance: OperateService | null = null;
  public agent: AgentOverChromeBridge;
  private isInitialized: boolean = false;
  private connectionCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.agent = new AgentOverChromeBridge({
      closeNewTabsAfterDisconnect: true,
      cacheId: 'midscene',
      // 启用实时日志配置
      generateReport: true,
      autoPrintReportMsg: true,
      onTaskStartTip: (tip: string) => {
        console.log(`🤖 AI 任务开始: ${tip}`);
        serviceLogger.info({ tip }, 'AI 任务开始执行');
      },
    });
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): OperateService {
    if (!OperateService.instance) {
      OperateService.instance = new OperateService();
    }
    return OperateService.instance;
  }

  /**
   * 初始化连接（确保只初始化一次）
   */
  async initialize(
    option: { forceSameTabNavigation: boolean } = {
      forceSameTabNavigation: true,
    },
  ) {
    if (this.isInitialized) {
      console.log('🔄 AgentOverChromeBridge 已经初始化，跳过重复初始化');
      return;
    }

    try {
      await this.agent.connectCurrentTab(option);
      this.isInitialized = true;
      this.startConnectionMonitoring();
      console.log('✅ AgentOverChromeBridge 初始化成功');
    } catch (error) {
      console.error('❌ AgentOverChromeBridge 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 检查连接状态
   */
  private async checkConnectionStatus(): Promise<boolean> {
    try {
      // 尝试执行一个简单的操作来检测连接状态
      // 这里可以调用一个轻量级的API来测试连接
      return true; // 简化实现，实际应该测试真实的连接状态
    } catch {
      return false;
    }
  }

  /**
   * 启动连接监控
   */
  private startConnectionMonitoring() {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }

    // 每30秒检查一次连接状态
    this.connectionCheckInterval = setInterval(async () => {
      if (this.isInitialized) {
        const isConnected = await this.checkConnectionStatus();
        if (!isConnected) {
          console.log('🔍 检测到连接断开，准备重新连接...');
          await this.reconnect();
        }
      }
    }, 30000);
  }

  /**
   * 重新连接
   */
  private async reconnect(): Promise<void> {
    try {
      console.log('🔄 尝试重新连接...');
      this.isInitialized = false;

      // 销毁现有连接
      try {
        await this.agent.destroy();
      } catch (error) {
        console.warn('销毁现有连接时出错:', error);
      }

      // 重新创建连接
      this.agent = new AgentOverChromeBridge({
        closeNewTabsAfterDisconnect: true,
        cacheId: 'midscene',
        generateReport: true,
        autoPrintReportMsg: true,
        onTaskStartTip: (tip: string) => {
          console.log(`🤖 AI 任务开始: ${tip}`);
          serviceLogger.info({ tip }, 'AI 任务开始执行');
        },
      });

      await this.agent.connectCurrentTab({
        forceSameTabNavigation: true,
      });

      this.isInitialized = true;
      console.log('✅ 重新连接成功');
    } catch (error) {
      console.error('❌ 重新连接失败:', error);
      this.isInitialized = false;
    }
  }

  async connectCurrentTab(option: ConnectCurrentTabOption) {
    try {
      await this.agent.connectCurrentTab(option);
      serviceLogger.info({ option }, '浏览器标签页连接成功');
    } catch (error: any) {
      serviceLogger.error({ error }, '浏览器标签页连接失败');

      // 处理浏览器连接错误
      if (error.message?.includes('connect')) {
        throw new AppError('Failed to connect to browser', 503);
      }
      // 处理其他连接错误
      throw new AppError(`Browser connection error: ${error.message}`, 500);
    }
  }

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
          console.log(`🔄 检测到连接错误，尝试重新连接 (${attempt}/${maxRetries})`);
          await this.handleConnectionError();
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  }

  async execute(prompt: string, maxRetries: number = 3): Promise<void> {
    await this.runWithRetry(prompt, maxRetries, (attempt, max) =>
      this.executeWithRetry(prompt, attempt, max),
    );
  }

  private async executeWithRetry(prompt: string, _attempt: number, _maxRetries: number): Promise<void> {
    if (!this.isInitialized) {
      throw new Error(
        'AgentOverChromeBridge 未初始化，请先调用 initialize() 方法',
      );
    }

    try {
      await this.agent.ai(prompt);
    } catch (error: any) {
      if (error.message?.includes('ai')) {
        throw new AppError(`AI execution failed: ${error.message}`, 500);
      }
      throw new AppError(`Operation execution error: ${error.message}`, 500);
    }
  }

  /**
   * 检查是否是连接相关的错误
   */
  private isConnectionError(error: any): boolean {
    const errorMessage = error.message || '';
    return (
      errorMessage.includes('Debugger is not attached') ||
      errorMessage.includes('connect') ||
      errorMessage.includes('bridge client') ||
      errorMessage.includes('tab with id') ||
      errorMessage.includes('connection')
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
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('❌ 处理连接错误失败:', error);
      throw error;
    }
  }

  async expect(prompt: string, maxRetries: number = 3): Promise<void> {
    await this.runWithRetry(prompt, maxRetries, (attempt, max) =>
      this.expectWithRetry(prompt, attempt, max),
    );
  }

  private async expectWithRetry(prompt: string, _attempt: number, _maxRetries: number): Promise<void> {
    if (!this.isInitialized) {
      throw new Error(
        'AgentOverChromeBridge 未初始化，请先调用 initialize() 方法',
      );
    }

    try {
      await this.agent.aiAssert(prompt);
    } catch (error: any) {
      if (error.message?.includes('ai')) {
        throw new AppError(`AI assertion failed: ${error.message}`, 500);
      }
      throw new AppError(`Assertion execution error: ${error.message}`, 500);
    }
  }

  async executeScript(prompt: string, maxRetries: number = 3): Promise<void> {
    await this.runWithRetry(prompt, maxRetries, (attempt, max) =>
      this.executeScriptWithRetry(prompt, attempt, max),
    );
  }

  private async executeScriptWithRetry(prompt: string, _attempt: number, _maxRetries: number): Promise<void> {
    if (!this.isInitialized) {
      throw new Error(
        'AgentOverChromeBridge 未初始化，请先调用 initialize() 方法',
      );
    }

    try {
      await this.agent.runYaml(prompt);
    } catch (error: any) {
      if (error.message?.includes('ai')) {
        throw new AppError(`AI execution failed: ${error.message}`, 500);
      }
      throw new AppError(`Operation execution error: ${error.message}`, 500);
    }
  }

  async destroy() {
    try {
      // 停止连接监控
      if (this.connectionCheckInterval) {
        clearInterval(this.connectionCheckInterval);
        this.connectionCheckInterval = null;
      }

      await this.agent.destroy();
      this.isInitialized = false;
      console.log('✅ AgentOverChromeBridge 已销毁');
    } catch (error) {
      console.error('销毁失败:', error);
      throw error;
    }
  }

  /**
   * 重置单例实例（用于测试或强制重新初始化）
   */
  public static resetInstance() {
    if (OperateService.instance) {
      OperateService.instance.destroy().catch(console.error);
      OperateService.instance = null;
    }
  }

  /**
   * 检查是否已初始化
   */
  public isReady(): boolean {
    return this.isInitialized;
  }
}
