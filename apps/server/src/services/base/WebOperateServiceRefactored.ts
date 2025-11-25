import type { AgentOpt } from '@midscene/web';
import { AgentOverChromeBridge } from '@midscene/web/bridge-mode';
import { setBrowserConnected } from '../../routes/health';
import { AppError } from '../../utils/error';
import { serviceLogger } from '../../utils/logger';
import type { StepMetadata } from '../../websocket/utils/scriptParamsParser';
import {
  bufferToBase64DataUri,
  type ScreenshotSegment,
  stitchSegments,
} from '../image/stitchBySharp';
import {
  BaseOperateService,
  OperateServiceState,
  type TaskTipCallback,
  type TaskTipCallbackConfig,
} from './BaseOperateService';

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
  };

  // ==================== 自定义 tip 映射 ====================
  private stepMetadataMap: Map<number, StepMetadata> = new Map();

  // ==================== 最后标签页跟踪 ====================
  private lastConnectedTabId: number | null = null;

  private constructor() {
    super();
  }

  // 统一为 service 日志补充分状态字段
  private withState(extra?: Record<string, any>) {
    return { state: (this as any).state, ...(extra || {}) };
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
      serviceLogger.info(
        this.withState(),
        'AgentOverChromeBridge 已存在，先销毁旧实例',
      );
      try {
        await this.agent.destroy();
      } catch (error) {
        serviceLogger.warn(
          this.withState({ error }),
          '销毁旧 AgentOverChromeBridge 时出错',
        );
      }
    }

    serviceLogger.info(this.withState(), '正在创建 AgentOverChromeBridge...');

    this.agent = new AgentOverChromeBridge(this.defaultAgentConfig);

    // 设置任务开始提示回调
    this.setupTaskStartTipCallback();

    serviceLogger.info(this.withState(), 'AgentOverChromeBridge 创建完成');
  }

  protected async initializeConnection(): Promise<void> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        serviceLogger.info(
          this.withState({ attempt, maxRetries }),
          `尝试初始化连接 (${attempt}/${maxRetries})...`,
        );
        await this.connectLastTab();
        setBrowserConnected(true);
        serviceLogger.info(
          this.withState(),
          'AgentOverChromeBridge 初始化成功',
        );
        return;
      } catch (error) {
        lastError = error as Error;
        serviceLogger.error(
          this.withState({ error, attempt, maxRetries }),
          `AgentOverChromeBridge 初始化失败 (尝试 ${attempt}/${maxRetries})`,
        );
        setBrowserConnected(false);

        if (attempt < maxRetries) {
          const delay = attempt * 2000;
          serviceLogger.info(
            this.withState({ delay }),
            `${delay / 1000}秒后重试...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    serviceLogger.error(
      this.withState(),
      'AgentOverChromeBridge 初始化最终失败，所有重试已用尽',
    );
    setBrowserConnected(false);

    const finalMessage = `初始化失败，已重试${maxRetries}次。最后错误: ${
      lastError?.message ?? '未知错误'
    }`;
    const restartError = new AppError(finalMessage, 500);
    (restartError as any).restartRequired = true;
    (restartError as any).lastError = lastError;
    throw restartError;
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
    this.clearStepMetadata();
    this.lastConnectedTabId = null;
  }

  // ==================== Web 特定方法 ====================

  /**
   * 设置自定义 tip 映射
   */
  public setStepMetadata(stepMetadata: Map<number, StepMetadata>): void {
    this.stepMetadataMap = stepMetadata;
  }

  public clearStepMetadata(): void {
    this.stepMetadataMap.clear();
  }

  protected resolveCustomTip(stepIndex: number, tip: string): string {
    const metadata = this.stepMetadataMap.get(stepIndex);
    if (!metadata) {
      return tip;
    }
    return metadata.customTip || tip;
  }

  public override createTaskTipCallback<T>(
    config: TaskTipCallbackConfig<T>,
  ): TaskTipCallback {
    const baseCallback = super.createTaskTipCallback(config);

    return (
      tip: string,
      bridgeError: Error | null | undefined = undefined,
      stepIndex?: number,
    ) => {
      const resolvedStepIndex = this.acquireStepIndex(stepIndex);
      const finalTip = this.resolveCustomTip(resolvedStepIndex, tip);
      serviceLogger.info(
        {
          originalTip: tip,
          finalTip,
          stepIndex: resolvedStepIndex,
        },
        'Resolved task tip for callback',
      );
        
      baseCallback(finalTip, bridgeError, resolvedStepIndex);
    };
  }

  /**
   * 设置任务开始提示回调
   */
  private setupTaskStartTipCallback(): void {
    if (!this.agent) {
      throw new Error('Agent 未创建，无法设置回调');
    }

    const originalCallback = this.agent.onTaskStartTip;

    this.agent.onTaskStartTip = (tip: string) => {
      const resolvedStepIndex = this.acquireStepIndex();

      console.log(
        `[DEBUG] onTaskStartTip 生成 stepIndex:`,
        resolvedStepIndex,
        `tip:`,
        tip,
      );

      const finalTip = this.resolveCustomTip(resolvedStepIndex, tip);

      const safeCall = async () => {
        let bridgeError: Error | null = null;

        if (originalCallback) {
          try {
            Promise.resolve(
              (originalCallback as any).call(this.agent, finalTip),
            ).catch((error: any) => {
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
                serviceLogger.warn(
                  {
                    tip: finalTip,
                    error: error?.message,
                    stack: error?.stack,
                  },
                  '显示状态消息失败',
                );

                this.taskErrors.push({
                  taskName: finalTip,
                  error:
                    error instanceof Error ? error : new Error(String(error)),
                  timestamp: Date.now(),
                });
              }
            });
          } catch (syncError: any) {
            serviceLogger.warn(
              {
                tip: finalTip,
                error: syncError?.message,
                stack: syncError?.stack,
              },
              '调用原始回调时发生同步错误',
            );
          }
        }

        try {
          this.handleTaskStartTip(finalTip, bridgeError, resolvedStepIndex);
        } catch (handlerError: any) {
          serviceLogger.error(
            {
              tip: finalTip,
              error: handlerError?.message,
              stack: handlerError?.stack,
            },
            'handleTaskStartTip 执行失败',
          );
        }
      };

      safeCall().catch((error: any) => {
        serviceLogger.error(
          {
            tip: finalTip,
            error: error?.message,
            stack: error?.stack,
          },
          'onTaskStartTip 回调执行失败（最外层捕获）',
        );

        try {
          this.triggerTaskTipCallbacks(
            finalTip || '未知任务',
            error instanceof Error ? error : new Error(String(error)),
            resolvedStepIndex,
          );
        } catch (notifyError) {
          serviceLogger.error({ notifyError }, '无法通知客户端错误');
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
      const tabs = await (this.agent as any).getBrowserTabList({});
      serviceLogger.info(
        this.withState({ tabList: JSON.stringify(tabs) }),
        '浏览器标签页列表',
      );
      if (tabs.length > 0) {
        const tab = tabs[tabs.length - 1];
        const targetTabId = Number.parseInt(tab.id, 10);

        const agentPage = (this.agent as any).page;
        let currentActiveTabId: number | null = null;

        if (agentPage && typeof agentPage.getActiveTabId === 'function') {
          try {
            currentActiveTabId = await agentPage.getActiveTabId();
          } catch (getActiveTabError: any) {
            serviceLogger.warn(
              this.withState({
                tab: JSON.stringify(tab),
                getActiveTabError:
                  getActiveTabError?.message ?? String(getActiveTabError),
              }),
              '获取当前激活标签页失败，继续尝试连接目标标签页',
            );
          }
        }

        if (
          typeof currentActiveTabId === 'number' &&
          Number.isFinite(currentActiveTabId) &&
          targetTabId === currentActiveTabId
        ) {
          serviceLogger.info(
            this.withState({ tab: JSON.stringify(tab) }),
            '目标标签页已处于激活状态，跳过重新连接',
          );
          this.lastConnectedTabId = targetTabId;
          return;
        }

        await this.agent.setActiveTabId(tab.id);
        this.lastConnectedTabId = targetTabId;
        serviceLogger.info(
          this.withState({ tab: JSON.stringify(tab) }),
          '浏览器标签页连接成功',
        );
      }
    } catch (error: any) {
      serviceLogger.error(this.withState({ error }), '浏览器标签页连接失败');

      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : JSON.stringify(error ?? {}) || '未知错误';

      if (errorMessage?.includes('connect')) {
        throw new AppError('浏览器连接失败', 503);
      }
      throw new AppError(`浏览器连接错误: ${errorMessage}`, 500);
    }
  }

  // ==================== 重连机制方法 ====================

  private startAutoReconnect(): void {
    if (this.reconnectTimer || this.isState(OperateServiceState.STOPPING)) {
      return;
    }

    serviceLogger.info(this.withState(), '启动自动重连机制...');
    this.reconnectTimer = setInterval(async () => {
      if (
        this.isState(OperateServiceState.STOPPING) ||
        this.isState(OperateServiceState.STOPPED)
      ) {
        serviceLogger.info(this.withState(), '服务已停止，取消自动重连');
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
        serviceLogger.warn(
          this.withState(),
          '已达到最大重连次数，停止自动重连',
        );
        this.stopAutoReconnect();
        setBrowserConnected(false);

        return;
      }

      this.setState(OperateServiceState.RECONNECTING);
      this.reconnectAttempts++;

      try {
        serviceLogger.info(
          this.withState({
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts,
          }),
          `自动重连尝试 ${this.reconnectAttempts}/${this.maxReconnectAttempts}`,
        );
        await this.initializeConnection();

        if (this.isState(OperateServiceState.RECONNECTING)) {
          serviceLogger.info(this.withState(), '自动重连成功');
          this.reconnectAttempts = 0;
          this.stopAutoReconnect();
          this.setState(OperateServiceState.RUNNING);
          setBrowserConnected(true);
          this.emit('reconnected');
        }
      } catch (error) {
        serviceLogger.error(
          this.withState({
            error,
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts,
          }),
          `自动重连失败 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
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
      serviceLogger.info(this.withState(), '服务正在停止，不进行重连检查');
      return false;
    }

    if (this.isState(OperateServiceState.RUNNING)) {
      const isConnected = await this.quickConnectionCheck();
      if (isConnected) {
        return true;
      }
    }

    serviceLogger.warn(this.withState(), '检测到连接断开，启动重连机制');
    this.setState(OperateServiceState.STOPPED);
    setBrowserConnected(false);
    this.startAutoReconnect();
    return false;
  }

  public async forceReconnect(): Promise<void> {
    if (this.isState(OperateServiceState.STOPPING)) {
      serviceLogger.warn('服务正在停止，不允许强制重连');
      throw new AppError('服务正在停止，无法重连', 503);
    }

    serviceLogger.info(this.withState(), '强制重连...');
    this.resetReconnectState();
    this.setState(OperateServiceState.STOPPED);
    setBrowserConnected(false);

    try {
      await this.initializeConnection();
      serviceLogger.info(this.withState(), '强制重连成功');
      this.setState(OperateServiceState.RUNNING);
      setBrowserConnected(true);
      this.emit('reconnected');
    } catch (error) {
      serviceLogger.error(this.withState({ error }), '强制重连失败');
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
        serviceLogger.info(this.withState(), '服务未启动，开始启动...');
        await this.start();
        return;
      }

      if (!this.agent) {
        throw new Error('Agent 未初始化');
      }

      // 检查最后标签页是否变化
      try {
        const tabs = await (this.agent as any).getBrowserTabList({});
        if (tabs.length > 0) {
          const latestTab = tabs[tabs.length - 1];
          const latestTabId = Number.parseInt(latestTab.id, 10);

          if (
            this.lastConnectedTabId !== null &&
            this.lastConnectedTabId !== latestTabId
          ) {
            serviceLogger.info(
              this.withState({
                lastConnectedTabId: this.lastConnectedTabId,
                latestTabId,
              }),
              `最后标签页已变化 (${this.lastConnectedTabId} -> ${latestTabId})，重新连接`,
            );
            await this.connectLastTab();
          } else if (this.lastConnectedTabId === null) {
            // 首次连接，设置 lastConnectedTabId
            this.lastConnectedTabId = latestTabId;
            serviceLogger.info(
              this.withState({ latestTabId }),
              '首次设置最后标签页ID',
            );
          } else {
            // lastConnectedTabId 与 latestTabId 相同，无需处理
            serviceLogger.debug(
              this.withState({ tabId: latestTabId }),
              '最后标签页未变化，跳过重新连接',
            );
          }
        }
      } catch (tabCheckError: any) {
        serviceLogger.warn(
          this.withState({ error: tabCheckError?.message }),
          '检查最后标签页时出错，继续执行连接检查',
        );
      }

      const isConnected = await this.quickConnectionCheck();
      if (!isConnected) {
        serviceLogger.warn('连接已断开，尝试重新连接...');
        await this.forceReconnect();
      }

      serviceLogger.info(this.withState(), '确保当前标签页连接成功');
    } catch (error: any) {
      serviceLogger.warn(
        this.withState({ error: error.message }),
        '连接当前标签页时出现警告',
      );
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
      serviceLogger.info(
        this.withState(),
        '服务未启动，自动启动 WebOperateService...',
      );
      await this.start();
    }

    const isConnected = await this.checkAndReconnect();
    if (!isConnected) {
      throw new AppError('浏览器连接断开，正在重连中', 503);
    }

    await this.ensureCurrentTabConnection();

    // 任务开始前钩子：重置 dump，确保报告独立
    await this.beforeOperate('execute');

    let lastError: any = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!this.agent) {
          throw new AppError('服务启动失败，无法执行任务', 503);
        }

        serviceLogger.info({ prompt }, '开始执行 AI 任务');
        await this.agent.ai(prompt);
        serviceLogger.info({ prompt }, 'AI 任务执行完成');

        // 任务完成后钩子：生成并上传 report
        await this.afterOperate('execute', true);
        return;
      } catch (error: any) {
        lastError = error;
        serviceLogger.error(
          this.withState({ prompt, error: error.message }),
          'AI 任务执行失败',
        );

        if (this.isConnectionError(error) && attempt < maxRetries) {
          serviceLogger.warn(
            this.withState({ attempt, maxRetries }),
            `检测到连接错误，尝试重新连接 (${attempt}/${maxRetries})`,
          );
          await this.forceReconnect();
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }

        // 任务失败也上传报告，记录失败状态
        await this.afterOperate('execute', false, error);

        if (error.message?.includes('ai')) {
          throw new AppError(`AI 执行失败: ${error.message}`, 500);
        }
        throw new AppError(`任务执行失败: ${error.message}`, 500);
      }
    }

    // 所有重试都失败，上传报告
    await this.afterOperate('execute', false, lastError);
    throw lastError;
  }

  async expect(prompt: string, maxRetries: number = 3): Promise<void> {
    if (!this.isStarted()) {
      serviceLogger.info(
        this.withState(),
        '服务未启动，自动启动 WebOperateService...',
      );
      await this.start();
    }

    await this.ensureCurrentTabConnection();

    // 任务开始前钩子：重置 dump，确保报告独立
    await this.beforeOperate('expect');

    let lastError: any = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!this.agent) {
          throw new AppError('服务启动失败，无法执行断言', 503);
        }

        await this.agent.aiAssert(prompt);

        // 断言成功，上传报告
        await this.afterOperate('expect', true);
        return;
      } catch (error: any) {
        lastError = error;

        if (this.isConnectionError(error) && attempt < maxRetries) {
          serviceLogger.warn(
            this.withState({ attempt, maxRetries }),
            `检测到连接错误，尝试重新连接 (${attempt}/${maxRetries})`,
          );
          await this.forceReconnect();
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }

        // 断言失败也上传报告
        await this.afterOperate('expect', false, error);

        if (error.message?.includes('ai')) {
          throw new AppError(`AI 断言失败: ${error.message}`, 500);
        }
        throw new AppError(`断言执行失败: ${error.message}`, 500);
      }
    }

    // 所有重试都失败，上传报告
    await this.afterOperate('expect', false, lastError);
    throw lastError;
  }

  async executeScript(
    prompt: string,
    maxRetries: number = 3,
    originalCmd?: string,
  ): Promise<any> {
    if (!this.isStarted()) {
      serviceLogger.info(
        this.withState(),
        '服务未启动，自动启动 WebOperateService...',
      );
      await this.start();
    }

    await this.ensureCurrentTabConnection();

    // 任务开始前钩子：重置 dump，确保报告独立
    await this.beforeOperate('executeScript');

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

          // 任务完成后钩子：生成并上传 report
          await this.afterOperate('executeScript', true);

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
            serviceLogger.warn(
              this.withState({ attempt, maxRetries }),
              `检测到连接错误，尝试重新连接 (${attempt}/${maxRetries})`,
            );
            await this.forceReconnect();
            await new Promise((resolve) => setTimeout(resolve, 2000));
            continue;
          }

          // 脚本执行失败，上传报告
          await this.afterOperate('executeScript', false, error);

          if (error.message?.includes('ai')) {
            throw new AppError(`AI 执行失败: ${error.message}`, 500);
          }
          throw new AppError(`脚本执行失败: ${error.message}`, 500);
        }
      }

      // 所有重试都失败，上传报告
      await this.afterOperate('executeScript', false, lastError);
      throw lastError;
    } catch (error: any) {
      if (originalCmd) {
        try {
          await this.execute(originalCmd);
          serviceLogger.warn(
            this.withState({
              prompt,
              originalCmd,
              originalError: error?.message,
            }),
            'YAML 执行失败，但兜底执行成功，忽略原错误',
          );
          return undefined;
        } catch (fallbackErr: any) {
          serviceLogger.error(
            this.withState({
              prompt,
              originalCmd,
              originalError: error,
              fallbackError: fallbackErr,
            }),
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
        serviceLogger.info(
          this.withState(),
          '服务未启动，自动启动 WebOperateService...',
        );
        await this.start();
      }

      await this.ensureCurrentTabConnection();

      if (!this.agent) {
        throw new AppError('服务启动失败，无法执行脚本', 503);
      }

      serviceLogger.info(this.withState({ script }), '当前执行脚本');
      const evaluateResult = await this.agent.evaluateJavaScript(script);
      serviceLogger.info(
        this.withState({ evaluateResult }),
        'evaluateJavaScript 执行完成',
      );

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
            this.withState({
              script,
              originalCmd,
              originalError: error?.message,
            }),
            'JS 执行失败，但兜底执行成功，忽略原错误',
          );
          return;
        } catch (fallbackErr: any) {
          serviceLogger.error(
            this.withState({
              script,
              originalCmd,
              originalError: error,
              fallbackError: fallbackErr,
            }),
            'JS 执行失败，兜底执行也失败',
          );
          throw new AppError(`JavaScript 执行失败`, 500);
        }
      }
      throw new AppError(`JavaScript 执行失败`, 500);
    }
  }

  /**
   * 截图
   */
  async screenshot(params?: {
    fullPage?: boolean;
    locate?: any;
    stickyHeaderHeight?: number; // 粘滞头高度（像素），默认 120
  }): Promise<{
    imageBase64: string;
    locateRect?: { left: number; top: number; width: number; height: number };
  }> {
    if (!this.isStarted()) {
      serviceLogger.info(
        this.withState(),
        '服务未启动，自动启动 WebOperateService...',
      );
      await this.start();
    }

    await this.ensureCurrentTabConnection();

    if (!this.agent) {
      throw new AppError('服务启动失败，无法执行截图', 503);
    }

    // 截图前确保波纹动画被禁用（避免截图过程中的视觉干扰）
    try {
      await this.setRippleEnabled(false);
    } catch (error) {
      // 如果设置失败，记录警告但不中断截图流程
      serviceLogger.warn(
        this.withState({ error }),
        '禁用波纹动画失败，继续执行截图',
      );
    }

    try {
      serviceLogger.info(this.withState({ params }), '开始截图');
      const result = await this.agent.screenshot(params);

      // 检查返回的是段图数组还是 base64 字符串
      const resultWithSegments = result as {
        imageBase64?: string;
        segments?: ScreenshotSegment[];
        locateRect?: any;
      };
      if (
        resultWithSegments.segments &&
        Array.isArray(resultWithSegments.segments)
      ) {
        serviceLogger.info(
          this.withState({ segmentCount: resultWithSegments.segments.length }),
          '检测到滚动截屏段图数据，开始拼接',
        );

        try {
          // 使用 sharp 拼接
          const stickyHeaderHeight = params?.stickyHeaderHeight ?? 0;
          const stitched = await stitchSegments(resultWithSegments.segments, {
            stickyHeaderHeight, // 粘滞头高度，用于裁剪后续片段
            format: 'jpeg',
            quality: 90,
          });

          const imageBase64 = bufferToBase64DataUri(
            stitched.imageBuffer,
            'jpeg',
          );

          serviceLogger.info(
            this.withState({
              imageSize: imageBase64.length,
              finalDimensions: `${stitched.width}x${stitched.height}`,
              segmentCount: stitched.segmentCount,
            }),
            '滚动截屏拼接完成',
          );

          return {
            imageBase64,
            locateRect: resultWithSegments.locateRect,
          };
        } catch (stitchError: any) {
          serviceLogger.error(
            this.withState({
              stitchError: stitchError?.message || String(stitchError),
            }),
            '拼接段图失败',
          );
          throw new AppError(
            `拼接段图失败: ${stitchError?.message || String(stitchError)}`,
            500,
          );
        }
      }

      // 正常返回 base64 字符串，但需要校验不为空
      const imageBase64 = result.imageBase64 || '';
      if (!imageBase64 || imageBase64.trim() === '') {
        serviceLogger.warn(
          this.withState({ params }),
          '截图返回为空 base64，尝试回退为视口截图',
        );

        try {
          const fallback = await this.agent.screenshot({
            ...params,
            fullPage: false,
          });

          const fallbackBase64 = fallback.imageBase64 || '';
          if (!fallbackBase64 || fallbackBase64.trim() === '') {
            throw new Error('视口截图回退仍然返回空 base64');
          }

          serviceLogger.info(
            this.withState({ imageSize: fallbackBase64.length }),
            '回退视口截图成功',
          );

          return {
            imageBase64: fallbackBase64,
            locateRect: fallback.locateRect,
          };
        } catch (fallbackErr: any) {
          serviceLogger.error(
            this.withState({
              fallbackError: fallbackErr?.message,
            }),
            '回退视口截图失败',
          );
          throw new AppError(
            `截图失败且回退失败: ${
              fallbackErr?.message || String(fallbackErr)
            }`,
            500,
          );
        }
      }

      serviceLogger.info(
        this.withState({
          imageSize: imageBase64.length,
          hasLocateRect: !!result.locateRect,
        }),
        '截图完成',
      );
      return {
        imageBase64,
        locateRect: result.locateRect,
      };
    } catch (error: any) {
      const errorMessage =
        error?.message ||
        error?.toString() ||
        String(error) ||
        'Unknown screenshot error';
      serviceLogger.error(
        this.withState({
          error: errorMessage,
          errorName: error?.name,
          stack: error?.stack,
          errorType: typeof error,
          errorStringified: JSON.stringify(error),
          params,
        }),
        '截图失败',
      );
      throw new AppError(`截图失败: ${errorMessage}`, 500);
    }
  }

  /**
   * 设置波纹动画（water-flow）的启用状态
   * @param enabled 是否启用波纹动画
   */
  async setRippleEnabled(enabled: boolean): Promise<void> {
    if (!this.agent) {
      throw new AppError('Agent 未初始化，无法设置波纹动画状态', 500);
    }

    // 兼容性检查：如果方法不存在（旧版本包），静默跳过
    const agent = this.agent as any;
    if (typeof agent.setRippleEnabled !== 'function') {
      serviceLogger.warn(
        this.withState({ enabled }),
        'Agent.setRippleEnabled 方法不存在（可能是旧版本包），跳过波纹动画设置',
      );
      return;
    }

    try {
      await agent.setRippleEnabled(enabled);
      serviceLogger.info(
        this.withState({ enabled }),
        `波纹动画已${enabled ? '启用' : '禁用'}`,
      );
    } catch (error: any) {
      serviceLogger.error(
        this.withState({ error: error?.message || String(error), enabled }),
        '设置波纹动画状态失败',
      );
      throw new AppError(
        `设置波纹动画状态失败: ${error?.message || String(error)}`,
        500,
      );
    }
  }

  async setAiContext(context: string): Promise<void> {
    if (!this.agent) {
      throw new AppError('服务未启动', 503);
    }

    await this.agent.setAIActionContext(context);
  }
}
