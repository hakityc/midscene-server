import type { AgentOpt } from '@midscene/web';
import { AgentOverChromeBridge } from '@midscene/web/bridge-mode';
import { setBrowserConnected } from '../../routes/health';
import { AppError } from '../../utils/error';
import { serviceLogger } from '../../utils/logger';
import { BaseOperateService, OperateServiceState } from './BaseOperateService';

/**
 * WebOperateService - Web 浏览器操作服务（重构版）
 *
 * 继承自 BaseOperateService，实现 Web 特定的功能：
 * - Chrome 浏览器连接管理
 * - 自动重连机制
 * - 标签页操作
 */
export class WebOperateServiceRefactored extends BaseOperateService<AgentOverChromeBridge> {
  // ==================== 单例模式相关 ====================
  private static instance: WebOperateServiceRefactored | null = null;

  // ==================== 重连机制属性 ====================
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectInterval: number = 5000;
  private reconnectTimer: NodeJS.Timeout | null = null;

  // ==================== Agent 默认配置 ====================
  private readonly defaultAgentConfig: Partial<
    AgentOpt & {
      closeNewTabsAfterDisconnect?: boolean;
      serverListeningTimeout?: number | false;
      closeConflictServer?: boolean;
    }
  > = {
    closeNewTabsAfterDisconnect: false,
    closeConflictServer: true,
    cacheId: 'midscene',
    generateReport: true,
    autoPrintReportMsg: true,
    aiActionContext: '如果当前需要用户登录或者扫码，抛出异常，提示用户手动操作',
  };

  private constructor() {
    super();
  }

  // ==================== 单例模式方法 ====================

  public static getInstance(): WebOperateServiceRefactored {
    if (!WebOperateServiceRefactored.instance) {
      WebOperateServiceRefactored.instance = new WebOperateServiceRefactored();
    }
    return WebOperateServiceRefactored.instance;
  }

  public static resetInstance(): void {
    if (WebOperateServiceRefactored.instance) {
      WebOperateServiceRefactored.instance.setState(
        OperateServiceState.STOPPED,
      );
      WebOperateServiceRefactored.instance.stop().catch(console.error);
      WebOperateServiceRefactored.instance = null;
    }
  }

  // ==================== 实现抽象方法 ====================

  protected getServiceName(): string {
    return 'WebOperateService';
  }

  protected async createAgent(): Promise<void> {
    if (this.agent) {
      console.log('🔄 AgentOverChromeBridge 已存在，先销毁旧实例');
      try {
        await this.agent.destroy();
      } catch (error) {
        console.warn('销毁旧 AgentOverChromeBridge 时出错:', error);
      }
    }

    console.log('🔧 正在创建 AgentOverChromeBridge...');

    this.agent = new AgentOverChromeBridge(this.defaultAgentConfig);

    // 设置任务开始提示回调
    this.setupTaskStartTipCallback();

    console.log('✅ AgentOverChromeBridge 创建完成');
  }

  protected async initializeConnection(): Promise<void> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`尝试初始化连接 (${attempt}/${maxRetries})...`);
        await this.connectLastTab();
        setBrowserConnected(true);
        console.log('AgentOverChromeBridge 初始化成功');
        return;
      } catch (error) {
        lastError = error as Error;
        console.error(
          `AgentOverChromeBridge 初始化失败 (尝试 ${attempt}/${maxRetries}):`,
          error,
        );
        setBrowserConnected(false);

        if (attempt < maxRetries) {
          const delay = attempt * 2000;
          console.log(`${delay / 1000}秒后重试...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    console.error('AgentOverChromeBridge 初始化最终失败，所有重试已用尽');
    setBrowserConnected(false);
    throw new Error(
      `初始化失败，已重试${maxRetries}次。最后错误: ${lastError?.message}`,
    );
  }

  protected async destroyAgent(): Promise<void> {
    // 停止自动重连
    this.stopAutoReconnect();

    if (this.agent) {
      await this.agent.destroy();
    }

    // 重置状态
    this.resetReconnectState();
    setBrowserConnected(false);
  }

  // ==================== Web 特定方法 ====================

  /**
   * 设置任务开始提示回调
   */
  private setupTaskStartTipCallback(): void {
    if (!this.agent) {
      throw new Error('Agent 未创建，无法设置回调');
    }

    const originalCallback = this.agent.onTaskStartTip;

    this.agent.onTaskStartTip = (tip: string) => {
      const safeCall = async () => {
        let bridgeError: Error | null = null;

        if (originalCallback) {
          try {
            Promise.resolve(originalCallback.call(this.agent, tip)).catch(
              (error: any) => {
                const isConnectionError =
                  error?.message?.includes('Connection lost') ||
                  error?.message?.includes('client namespace disconnect') ||
                  error?.message?.includes('bridge client') ||
                  error?.message?.includes('transport close') ||
                  error?.message?.includes('timeout');

                if (isConnectionError) {
                  bridgeError =
                    error instanceof Error ? error : new Error(String(error));
                } else {
                  console.warn(`⚠️ 显示状态消息失败:`, error?.message);
                  serviceLogger.warn(
                    {
                      tip,
                      error: error?.message,
                      stack: error?.stack,
                    },
                    '显示状态消息失败',
                  );

                  this.taskErrors.push({
                    taskName: tip,
                    error:
                      error instanceof Error ? error : new Error(String(error)),
                    timestamp: Date.now(),
                  });
                }
              },
            );
          } catch (syncError: any) {
            console.warn('⚠️ 调用原始回调时发生同步错误:', syncError?.message);
            serviceLogger.warn(
              {
                tip,
                error: syncError?.message,
                stack: syncError?.stack,
              },
              '调用原始回调时发生同步错误',
            );
          }
        }

        try {
          this.handleTaskStartTip(tip, bridgeError);
        } catch (handlerError: any) {
          console.error('❌ handleTaskStartTip 执行失败:', handlerError);
          serviceLogger.error(
            {
              tip,
              error: handlerError?.message,
              stack: handlerError?.stack,
            },
            'handleTaskStartTip 执行失败',
          );
        }
      };

      safeCall().catch((error: any) => {
        console.error('❌ onTaskStartTip 回调执行失败:', error);
        serviceLogger.error(
          {
            tip,
            error: error?.message,
            stack: error?.stack,
          },
          'onTaskStartTip 回调执行失败（最外层捕获）',
        );

        try {
          this.triggerTaskTipCallbacks(
            tip || '未知任务',
            error instanceof Error ? error : new Error(String(error)),
          );
        } catch (notifyError) {
          console.error('❌ 无法通知客户端错误:', notifyError);
        }
      });
    };
  }

  /**
   * 连接当前标签页
   */
  async connectLastTab(): Promise<void> {
    try {
      if (!this.agent) {
        throw new Error('Agent 未初始化');
      }
      //@ts-expect-error
      const tabs = await this.agent.getBrowserTabList({});
      serviceLogger.info({ tabList: JSON.stringify(tabs) }, '浏览器标签页列表');
      if (tabs.length > 0) {
        const tab = tabs[tabs.length - 1];
        await this.agent.setActiveTabId(tab.id);
        serviceLogger.info(
          { tab: JSON.stringify(tab) },
          '浏览器标签页连接成功',
        );
      }
    } catch (error: any) {
      serviceLogger.error({ error }, '浏览器标签页连接失败');

      if (error.message?.includes('connect')) {
        throw new AppError('浏览器连接失败', 503);
      }
      throw new AppError(`浏览器连接错误: ${error.message}`, 500);
    }
  }

  // ==================== 重连机制方法 ====================

  private startAutoReconnect(): void {
    if (this.reconnectTimer || this.isState(OperateServiceState.STOPPING)) {
      return;
    }

    console.log('启动自动重连机制...');
    this.reconnectTimer = setInterval(async () => {
      if (
        this.isState(OperateServiceState.STOPPING) ||
        this.isState(OperateServiceState.STOPPED)
      ) {
        console.log('服务已停止，取消自动重连');
        this.stopAutoReconnect();
        return;
      }

      if (
        this.isState(OperateServiceState.RUNNING) ||
        this.isState(OperateServiceState.RECONNECTING)
      ) {
        return;
      }

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log('已达到最大重连次数，停止自动重连');
        this.stopAutoReconnect();
        setBrowserConnected(false);
        return;
      }

      this.setState(OperateServiceState.RECONNECTING);
      this.reconnectAttempts++;

      try {
        console.log(
          `自动重连尝试 ${this.reconnectAttempts}/${this.maxReconnectAttempts}`,
        );
        await this.initializeConnection();

        if (this.isState(OperateServiceState.RECONNECTING)) {
          console.log('自动重连成功');
          this.reconnectAttempts = 0;
          this.stopAutoReconnect();
          this.setState(OperateServiceState.RUNNING);
          setBrowserConnected(true);
          this.emit('reconnected');
        }
      } catch (error) {
        console.error(
          `自动重连失败 (${this.reconnectAttempts}/${this.maxReconnectAttempts}):`,
          error,
        );
        this.setState(OperateServiceState.STOPPED);
        setBrowserConnected(false);
      }
    }, this.reconnectInterval);
  }

  private stopAutoReconnect(): void {
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private resetReconnectState(): void {
    this.reconnectAttempts = 0;
    this.stopAutoReconnect();
  }

  public async checkAndReconnect(): Promise<boolean> {
    if (this.isState(OperateServiceState.STOPPING)) {
      console.log('服务正在停止，不进行重连检查');
      return false;
    }

    if (this.isState(OperateServiceState.RUNNING)) {
      const isConnected = await this.quickConnectionCheck();
      if (isConnected) {
        return true;
      }
    }

    console.log('检测到连接断开，启动重连机制');
    this.setState(OperateServiceState.STOPPED);
    setBrowserConnected(false);
    this.startAutoReconnect();
    return false;
  }

  public async forceReconnect(): Promise<void> {
    if (this.isState(OperateServiceState.STOPPING)) {
      console.log('服务正在停止，不允许强制重连');
      throw new AppError('服务正在停止，无法重连', 503);
    }

    console.log('强制重连...');
    this.resetReconnectState();
    this.setState(OperateServiceState.STOPPED);
    setBrowserConnected(false);

    try {
      await this.initializeConnection();
      console.log('强制重连成功');
      this.setState(OperateServiceState.RUNNING);
      setBrowserConnected(true);
      this.emit('reconnected');
    } catch (error) {
      console.error('强制重连失败:', error);
      this.setState(OperateServiceState.STOPPED);
      setBrowserConnected(false);
      this.startAutoReconnect();
      throw error;
    }
  }

  private async quickConnectionCheck(): Promise<boolean> {
    if (!this.agent) {
      setBrowserConnected(false);
      return false;
    }

    try {
      await this.agent.page.showStatusMessage('ping');
      setBrowserConnected(true);
      return true;
    } catch (error: any) {
      const message = error?.message || '';
      if (
        message.includes('Connection lost') ||
        message.includes('timeout') ||
        message.includes('bridge client')
      ) {
        setBrowserConnected(false);
        return false;
      }
      return true;
    }
  }

  private async ensureCurrentTabConnection(): Promise<void> {
    try {
      if (!this.isStarted()) {
        console.log('服务未启动，开始启动...');
        await this.start();
        return;
      }

      const isConnected = await this.quickConnectionCheck();
      if (!isConnected) {
        console.log('连接已断开，尝试重新连接...');
        await this.forceReconnect();
      }

      if (!this.agent) {
        throw new Error('Agent 未初始化');
      }
      console.log('✅ 确保当前标签页连接成功');
    } catch (error: any) {
      console.warn('⚠️ 连接当前标签页时出现警告:', error.message);
      if (!error.message?.includes('Another debugger is already attached')) {
        throw error;
      }
    }
  }

  // ==================== 执行方法实现 ====================

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

  async execute(prompt: string, maxRetries: number = 3): Promise<void> {
    if (!this.isStarted()) {
      console.log('🔄 服务未启动，自动启动 WebOperateService...');
      await this.start();
    }

    const isConnected = await this.checkAndReconnect();
    if (!isConnected) {
      throw new AppError('浏览器连接断开，正在重连中', 503);
    }

    await this.ensureCurrentTabConnection();

    let lastError: any = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!this.agent) {
          throw new AppError('服务启动失败，无法执行任务', 503);
        }

        console.log(`🚀 开始执行 AI 任务: ${prompt}`);
        await this.agent.ai(prompt);
        console.log(`✅ AI 任务执行完成: ${prompt}`);

        // 执行完成后生成并上传 report
        await this.generateAndUploadReport();
        return;
      } catch (error: any) {
        lastError = error;
        console.log(`❌ AI 任务执行失败: ${error.message}`);

        if (this.isConnectionError(error) && attempt < maxRetries) {
          console.log(
            `🔄 检测到连接错误，尝试重新连接 (${attempt}/${maxRetries})`,
          );
          await this.forceReconnect();
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }

        if (error.message?.includes('ai')) {
          throw new AppError(`AI 执行失败: ${error.message}`, 500);
        }
        throw new AppError(`任务执行失败: ${error.message}`, 500);
      }
    }

    throw lastError;
  }

  async expect(prompt: string, maxRetries: number = 3): Promise<void> {
    if (!this.isStarted()) {
      console.log('🔄 服务未启动，自动启动 WebOperateService...');
      await this.start();
    }

    await this.ensureCurrentTabConnection();

    let lastError: any = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!this.agent) {
          throw new AppError('服务启动失败，无法执行断言', 503);
        }

        await this.agent.aiAssert(prompt);
        return;
      } catch (error: any) {
        lastError = error;

        if (this.isConnectionError(error) && attempt < maxRetries) {
          console.log(
            `🔄 检测到连接错误，尝试重新连接 (${attempt}/${maxRetries})`,
          );
          await this.forceReconnect();
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }

        if (error.message?.includes('ai')) {
          throw new AppError(`AI 断言失败: ${error.message}`, 500);
        }
        throw new AppError(`断言执行失败: ${error.message}`, 500);
      }
    }

    throw lastError;
  }

  async executeScript(
    prompt: string,
    maxRetries: number = 3,
    originalCmd?: string,
  ): Promise<any> {
    if (!this.isStarted()) {
      console.log('🔄 服务未启动，自动启动 WebOperateService...');
      await this.start();
    }

    await this.ensureCurrentTabConnection();

    try {
      let lastError: any = null;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          if (!this.agent) {
            throw new AppError('服务启动失败，无法执行脚本', 503);
          }

          this.clearTaskErrors();
          const yamlResult = await this.agent.runYaml(prompt);

          const taskErrors = this.getTaskErrors();

          serviceLogger.info(
            { prompt, result: yamlResult },
            'YAML 脚本执行完成',
          );

          // 执行完成后生成并上传 report
          await this.generateAndUploadReport();

          return {
            ...yamlResult,
            _wrapped: true,
            _timestamp: Date.now(),
            _taskErrors: taskErrors.length > 0 ? taskErrors : undefined,
            _hasErrors: taskErrors.length > 0,
          };
        } catch (error: any) {
          lastError = error;

          if (this.isConnectionError(error) && attempt < maxRetries) {
            console.log(
              `🔄 检测到连接错误，尝试重新连接 (${attempt}/${maxRetries})`,
            );
            await this.forceReconnect();
            await new Promise((resolve) => setTimeout(resolve, 2000));
            continue;
          }

          if (error.message?.includes('ai')) {
            throw new AppError(`AI 执行失败: ${error.message}`, 500);
          }
          throw new AppError(`脚本执行失败: ${error.message}`, 500);
        }
      }

      throw lastError;
    } catch (error: any) {
      if (originalCmd) {
        try {
          await this.execute(originalCmd);
          serviceLogger.warn(
            { prompt, originalCmd, originalError: error?.message },
            'YAML 执行失败，但兜底执行成功，忽略原错误',
          );
          return undefined;
        } catch (fallbackErr: any) {
          serviceLogger.error(
            {
              prompt,
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
   * 评估页面 JavaScript
   */
  public async evaluateJavaScript(
    script: string,
    originalCmd?: string,
  ): Promise<any> {
    try {
      if (!this.isStarted()) {
        console.log('🔄 服务未启动，自动启动 WebOperateService...');
        await this.start();
      }

      await this.ensureCurrentTabConnection();

      if (!this.agent) {
        throw new AppError('服务启动失败，无法执行脚本', 503);
      }

      serviceLogger.info(`当前执行脚本：${script}`);
      const evaluateResult = await this.agent.evaluateJavaScript(script);
      serviceLogger.info(evaluateResult, 'evaluateJavaScript 执行完成');

      const type = evaluateResult?.exceptionDetails?.exception?.subtype;
      if (type === 'error') {
        throw new AppError(`JavaScript 执行失败: ${evaluateResult}`, 500);
      }

      return evaluateResult;
    } catch (error: any) {
      if (originalCmd) {
        try {
          await this.execute(originalCmd);
          serviceLogger.warn(
            { script, originalCmd, originalError: error?.message },
            'JS 执行失败，但兜底执行成功，忽略原错误',
          );
          return;
        } catch (fallbackErr: any) {
          serviceLogger.error(
            {
              script,
              originalCmd,
              originalError: error,
              fallbackError: fallbackErr,
            },
            'JS 执行失败，兜底执行也失败',
          );
          throw new AppError(`JavaScript 执行失败`, 500);
        }
      }
      throw new AppError(`JavaScript 执行失败`, 500);
    }
  }
}
