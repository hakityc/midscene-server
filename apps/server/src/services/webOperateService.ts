import { EventEmitter } from 'node:events';
import type { AgentOpt } from '@midscene/web';
import { AgentOverChromeBridge } from '@midscene/web/bridge-mode';
import { setBrowserConnected } from '../routes/health';
import { AppError } from '../utils/error';
import { serviceLogger } from '../utils/logger';
import {
  formatTaskTip,
  getTaskStageDescription,
} from '../utils/taskTipFormatter';

export class WebOperateService extends EventEmitter {
  // ==================== 单例模式相关 ====================
  private static instance: WebOperateService | null = null;

  // ==================== 核心属性 ====================
  public agent: AgentOverChromeBridge | null = null;
  private isInitialized: boolean = false;

  // ==================== 重连机制属性 ====================
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectInterval: number = 5000; // 5秒
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isReconnecting: boolean = false;
  private isStopping: boolean = false; // 标志服务正在停止，防止重连

  // ==================== 回调机制属性 ====================
  private taskTipCallbacks: Array<
    (tip: string, bridgeError?: Error | null) => void
  > = [];

  // ==================== 错误跟踪属性 ====================
  private taskErrors: Array<{
    taskName: string;
    error: Error;
    timestamp: number;
  }> = [];

  // ==================== AgentOverChromeBridge 默认配置 ====================
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
    aiActionContext: '如果出现任何弹窗，将其关闭',
  };

  private constructor() {
    super();
    // 注意：不在构造函数中初始化 agent，改为延迟初始化
  }

  // ==================== 单例模式方法 ====================

  /**
   * 获取单例实例
   */
  public static getInstance(): WebOperateService {
    if (!WebOperateService.instance) {
      WebOperateService.instance = new WebOperateService();
    }
    return WebOperateService.instance;
  }

  /**
   * 重置单例实例（用于测试或强制重新初始化）
   */
  public static resetInstance(): void {
    if (WebOperateService.instance) {
      WebOperateService.instance.stop().catch(console.error);
      WebOperateService.instance = null;
    }
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
   * 清空错误跟踪
   */
  public clearTaskErrors(): void {
    this.taskErrors = [];
  }

  /**
   * 获取任务错误列表
   */
  public getTaskErrors(): Array<{
    taskName: string;
    error: Error;
    timestamp: number;
  }> {
    return [...this.taskErrors];
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

        console.log(`🎯 WebSocket 监听到任务提示: ${tip}`);

        // 如果有 bridge 错误，先发送警告消息（不是致命错误，任务继续执行）
        if (bridgeError) {
          // 判断错误类型
          const errorType = bridgeError.message.includes('Connection lost')
            ? 'connection_lost'
            : bridgeError.message.includes('timeout')
              ? 'bridge_timeout'
              : 'bridge_error';

          const errorMessage =
            errorType === 'connection_lost'
              ? '⚠️ 浏览器扩展连接已断开，但任务继续在服务端执行'
              : `⚠️ Bridge 通信异常: ${bridgeError.message}`;

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
              errorType,
            },
            'Bridge 调用失败，但任务继续执行',
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
                  type: bridgeError.message.includes('Connection lost')
                    ? 'connection_lost'
                    : bridgeError.message.includes('timeout')
                      ? 'bridge_timeout'
                      : 'bridge_error',
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
          '任务提示回调执行失败，但不影响主任务',
        );
      }
    };
  }

  /**
   * 触发任务提示回调
   * @param tip 任务提示内容
   * @param bridgeError Bridge 调用错误（如果有）
   */
  private triggerTaskTipCallbacks(
    tip: string,
    bridgeError?: Error | null,
  ): void {
    this.taskTipCallbacks.forEach((callback) => {
      try {
        callback(tip, bridgeError);
      } catch (error) {
        console.error('任务提示回调执行失败:', error);
      }
    });
  }

  // ==================== 生命周期方法 ====================

  /**
   * 启动服务 - 初始化 AgentOverChromeBridge
   * @param option 连接选项
   */
  public async start(): Promise<void> {
    if (this.isInitialized && this.agent) {
      console.log('🔄 WebOperateService 已启动，跳过重复启动');
      return;
    }

    // 清除停止标志，允许重新启动
    this.isStopping = false;

    console.log('🚀 启动 WebOperateService...');

    try {
      // 创建 AgentOverChromeBridge 实例
      await this.createAgent();

      // 初始化连接
      await this.initialize();

      console.log('✅ WebOperateService 启动成功');
    } catch (error) {
      console.error('❌ WebOperateService 启动失败:', error);
      throw error;
    }
  }

  /**
   * 停止服务 - 销毁 AgentOverChromeBridge
   */
  public async stop(): Promise<void> {
    console.log('🛑 停止 WebOperateService...');

    // 设置停止标志，防止重连
    this.isStopping = true;

    try {
      // 停止自动重连
      this.stopAutoReconnect();

      // 销毁 agent
      if (this.agent) {
        await this.agent.destroy();
        this.agent = null;
      }

      // 重置状态
      this.isInitialized = false;
      this.resetReconnectState();
      setBrowserConnected(false);

      console.log('✅ WebOperateService 已停止');
    } catch (error) {
      console.error('❌ 停止 WebOperateService 时出错:', error);
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

  // ==================== AgentOverChromeBridge 管理 ====================

  /**
   * 创建 AgentOverChromeBridge 实例
   */
  private async createAgent(): Promise<void> {
    if (this.agent) {
      console.log('🔄 AgentOverChromeBridge 已存在，先销毁旧实例');
      try {
        await this.agent.destroy();
      } catch (error) {
        console.warn('销毁旧 AgentOverChromeBridge 时出错:', error);
      }
    }

    console.log(
      '🔧 正在创建 AgentOverChromeBridge，绑定 onTaskStartTip 回调...',
    );

    this.agent = new AgentOverChromeBridge(this.defaultAgentConfig);

    // 设置任务开始提示回调
    this.setupTaskStartTipCallback();

    console.log('✅ AgentOverChromeBridge 创建完成，onTaskStartTip 已绑定');
  }

  /**
   * 设置任务开始提示回调
   */
  private setupTaskStartTipCallback(): void {
    if (!this.agent) {
      throw new Error('Agent 未创建，无法设置回调');
    }

    // 保存原始回调（来自 @midscene/web 的 showStatusMessage）
    const originalCallback = this.agent.onTaskStartTip;

    // 设置新的回调，同时保留原有功能
    // 注意：这个回调会被 Midscene 内部调用，需要确保永远不抛出未捕获的错误
    this.agent.onTaskStartTip = (tip: string) => {
      // 使用立即执行的包装器来捕获所有可能的错误
      // 包括同步错误、异步错误、以及延迟的 Promise rejection
      const safeCall = async () => {
        let bridgeError: Error | null = null;

        // 调用原始回调（showStatusMessage），捕获所有错误
        if (originalCallback) {
          try {
            // 尝试调用原始回调，但不 await 结果
            // 使用 Promise.resolve 包装以处理可能的同步返回值
            const callPromise = Promise.resolve(
              originalCallback.call(this.agent, tip),
            );

            // 立即为这个 Promise 添加错误处理，避免未捕获的 rejection
            callPromise.catch((error: any) => {
              // 判断是否是连接断开错误（内部错误，不影响任务执行）
              const isConnectionError =
                error?.message?.includes('Connection lost') ||
                error?.message?.includes('client namespace disconnect') ||
                error?.message?.includes('bridge client') ||
                error?.message?.includes('timeout');

              if (isConnectionError) {
                // 这是预期的内部错误，只记录 warn 级别日志，不上报
                serviceLogger.debug(
                  {
                    tip,
                    errorType: 'bridge_connection_lost',
                    error: error?.message,
                  },
                  'Bridge 连接已断开，无法显示状态消息（不影响任务执行）',
                );

                // 保存错误供内部追踪，但标记为非关键错误
                bridgeError =
                  error instanceof Error ? error : new Error(String(error));
              } else {
                // 非连接错误，可能需要关注
                console.warn(`⚠️ 显示状态消息失败:`, error?.message);
                serviceLogger.warn(
                  {
                    tip,
                    error: error?.message,
                    stack: error?.stack,
                  },
                  '显示状态消息失败',
                );

                // 记录到错误跟踪中
                this.taskErrors.push({
                  taskName: tip,
                  error:
                    error instanceof Error ? error : new Error(String(error)),
                  timestamp: Date.now(),
                });
              }
            });
          } catch (syncError: any) {
            // 捕获调用时的同步错误
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

        // 立即调用我们的回调，不等待 showStatusMessage 完成
        // 这样即使 bridge 连接有问题，我们的处理逻辑也能正常执行
        try {
          this.handleTaskStartTip(tip, bridgeError);
        } catch (handlerError: any) {
          // 如果我们自己的处理逻辑失败，记录错误
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

      // 执行安全调用包装器，并捕获任何顶层错误
      safeCall().catch((error: any) => {
        // 最后的安全网：确保任何未预期的错误都被捕获
        console.error('❌ onTaskStartTip 回调执行失败:', error);
        serviceLogger.error(
          {
            tip,
            error: error?.message,
            stack: error?.stack,
          },
          'onTaskStartTip 回调执行失败（最外层捕获）',
        );

        // 尝试通知客户端发生了严重错误
        try {
          this.triggerTaskTipCallbacks(
            tip || '未知任务',
            error instanceof Error ? error : new Error(String(error)),
          );
        } catch (notifyError) {
          // 如果通知也失败了，只记录日志，不再抛出
          console.error('❌ 无法通知客户端错误:', notifyError);
        }
      });

      // 注意：这里不返回 Promise，避免外部等待
      // 所有错误都在内部处理，不会向外传播
    };
  }

  /**
   * 处理任务开始提示的统一方法
   */
  private handleTaskStartTip(tip: string, bridgeError?: Error | null): void {
    try {
      const { formatted, category, icon } = formatTaskTip(tip);
      const stageDescription = getTaskStageDescription(category);

      console.log(`🤖 AI 任务开始: ${tip}`);
      console.log(`${icon} ${formatted} (${stageDescription})`);

      // 如果有 bridge 错误，记录到错误跟踪中
      if (bridgeError) {
        this.taskErrors.push({
          taskName: tip,
          error: bridgeError,
          timestamp: Date.now(),
        });

        console.warn(`⚠️ 记录任务错误: ${tip} - ${bridgeError.message}`);
      }

      serviceLogger.info(
        {
          tip,
          formatted,
          category,
          icon,
          stage: stageDescription,
          bridgeError: bridgeError
            ? {
                message: bridgeError.message,
                type: bridgeError.message.includes('Connection lost')
                  ? 'connection_lost'
                  : 'bridge_error',
              }
            : undefined,
        },
        'AI 任务开始执行',
      );

      // 发射事件，让其他地方可以监听到
      this.emit('taskStartTip', tip, bridgeError);

      // 触发注册的回调，并传递 bridge 错误信息
      this.triggerTaskTipCallbacks(tip, bridgeError);
    } catch (error: any) {
      // 捕获任何错误，防止影响主流程
      console.error('❌ handleTaskStartTip 执行失败:', error);
      serviceLogger.error(
        {
          tip,
          error: error?.message,
          stack: error?.stack,
        },
        'handleTaskStartTip 执行失败',
      );

      // 尝试通知客户端发生了错误
      try {
        this.triggerTaskTipCallbacks(
          tip || '未知任务',
          error instanceof Error ? error : new Error(String(error)),
        );
      } catch (notifyError) {
        // 如果通知也失败了，只记录日志
        console.error(
          '❌ 无法通知客户端 handleTaskStartTip 错误:',
          notifyError,
        );
      }
    }
  }

  // ==================== 连接管理相关方法 ====================

  /**
   * 初始化连接（确保只初始化一次）
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('🔄 AgentOverChromeBridge 已经初始化，跳过重复初始化');
      return;
    }

    if (!this.agent) {
      throw new Error('Agent 未创建，请先调用 createAgent()');
    }

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 尝试初始化连接 (${attempt}/${maxRetries})...`);
        await this.connectLastTab();
        this.isInitialized = true;
        setBrowserConnected(true);
        console.log('✅ AgentOverChromeBridge 初始化成功');
        return;
      } catch (error) {
        lastError = error as Error;
        console.error(
          `❌ AgentOverChromeBridge 初始化失败 (尝试 ${attempt}/${maxRetries}):`,
          error,
        );
        setBrowserConnected(false);

        if (attempt < maxRetries) {
          const delay = attempt * 2000; // 递增延迟：2s, 4s
          console.log(`⏳ ${delay / 1000}秒后重试...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // 所有重试都失败了
    console.error('❌ AgentOverChromeBridge 初始化最终失败，所有重试已用尽');
    setBrowserConnected(false);
    throw new Error(
      `初始化失败，已重试${maxRetries}次。最后错误: ${lastError?.message}`,
    );
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
      serviceLogger.info({ tabs }, '浏览器标签页列表');
      if (tabs.length > 0) {
        const tab = tabs[tabs.length - 1];
        await this.agent.setActiveTabId(tab.id);
        serviceLogger.info({ tab }, '浏览器标签页连接成功');
      }
    } catch (error: any) {
      serviceLogger.error({ error }, '浏览器标签页连接失败');

      // 处理浏览器连接错误
      if (error.message?.includes('connect')) {
        throw new AppError('浏览器连接失败', 503);
      }
      // 处理其他连接错误
      throw new AppError(`浏览器连接错误: ${error.message}`, 500);
    }
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
        setBrowserConnected(false);
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
          setBrowserConnected(true);
          this.emit('reconnected');
        }
      } catch (error) {
        console.error(
          `❌ 自动重连失败 (${this.reconnectAttempts}/${this.maxReconnectAttempts}):`,
          error,
        );
        setBrowserConnected(false);
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
    // 注意：不在这里重置 isStopping，它由 start() 和 stop() 管理
  }

  /**
   * 检查连接状态并启动重连
   */
  public async checkAndReconnect(): Promise<boolean> {
    // 如枟服务正在停止，不进行重连
    if (this.isStopping) {
      console.log('🛑 服务正在停止，不进行重连检查');
      return false;
    }

    if (this.isInitialized) {
      // 先使用超轻量级检测
      const isConnected = await this.quickConnectionCheck();
      if (isConnected) {
        return true;
      }
    }

    console.log('🔄 检测到连接断开，启动重连机制');
    this.isInitialized = false;
    setBrowserConnected(false);
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
    setBrowserConnected(false);

    try {
      await this.initialize();
      console.log('✅ 强制重连成功');
      setBrowserConnected(true);
      this.emit('reconnected');
    } catch (error) {
      console.error('❌ 强制重连失败:', error);
      setBrowserConnected(false);
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
      setBrowserConnected(false);

      // 重新创建连接
      await this.createAgent();
      await this.initialize();

      this.isInitialized = true;
      setBrowserConnected(true);
      console.log('✅ 重新连接成功');
    } catch (error) {
      console.error('❌ 重新连接失败:', error);
      this.isInitialized = false;
      setBrowserConnected(false);
      throw error;
    }
  }

  // ==================== 连接状态检测方法 ====================

  /**
   * 检查连接状态 - 轻量级检测
   */
  private async checkConnectionStatus(): Promise<boolean> {
    if (!this.agent) {
      setBrowserConnected(false);
      return false;
    }

    try {
      // 使用更轻量级的方法：获取浏览器标签页列表
      // 这比evaluateJavaScript更快，不会执行页面脚本
      //@ts-expect-error
      await this.agent.getBrowserTabList({});
      setBrowserConnected(true);
      return true;
    } catch (error: any) {
      const message = error?.message || '';
      // 检测到连接断开的关键词
      if (
        message.includes('no tab is connected') ||
        message.includes('bridge client') ||
        message.includes('Debugger is not attached') ||
        message.includes('tab with id') ||
        message.includes('Connection lost') ||
        message.includes('timeout')
      ) {
        console.log('🔍 检测到连接断开:', message);
        setBrowserConnected(false);
        return false;
      }
      // 其他错误可能是页面问题，不算连接断开
      setBrowserConnected(true);
      return true;
    }
  }

  /**
   * 超轻量级连接检测 - 仅用于快速检查
   */
  private async quickConnectionCheck(): Promise<boolean> {
    if (!this.agent) {
      setBrowserConnected(false);
      return false;
    }

    try {
      // 使用最轻量级的方法：发送状态消息
      // 这几乎不会增加任何延迟
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
      // 如果showStatusMessage失败，回退到getBrowserTabList
      return await this.checkConnectionStatus();
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

  /**
   * 确保连接当前标签页 - 在所有操作前调用
   */
  private async ensureCurrentTabConnection(): Promise<void> {
    try {
      // 先确保服务已初始化
      await this.ensureConnection();

      if (!this.agent) {
        throw new Error('Agent 未初始化');
      }
      console.log('✅ 确保当前标签页连接成功');
    } catch (error: any) {
      console.warn('⚠️ 连接当前标签页时出现警告:', error.message);
      // 如果是"Another debugger is already attached"错误，我们忽略它
      // 因为这意味着连接已经存在
      if (!error.message?.includes('Another debugger is already attached')) {
        this.reconnect().catch(console.error);
        throw error;
      }
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
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('❌ 处理连接错误失败:', error);
      throw error;
    }
  }

  /**
   * 执行 AI 任务
   */
  async execute(prompt: string, maxRetries: number = 3): Promise<void> {
    // 如果服务未启动，自动启动
    if (!this.isStarted()) {
      console.log('🔄 服务未启动，自动启动 WebOperateService...');
      await this.start();
    }

    // 检查连接状态，如果断开则启动重连
    const isConnected = await this.checkAndReconnect();
    if (!isConnected) {
      throw new AppError('浏览器连接断开，正在重连中', 503);
    }

    // 执行前确保连接当前标签页
    await this.ensureCurrentTabConnection();

    await this.runWithRetry(prompt, maxRetries, (attempt, max) =>
      this.executeWithRetry(prompt, attempt, max),
    );
  }

  private async executeWithRetry(
    prompt: string,
    _attempt: number,
    _maxRetries: number,
  ): Promise<void> {
    // 此时应该已经确保服务启动，如果仍然没有agent，说明启动失败
    if (!this.agent) {
      throw new AppError('服务启动失败，无法执行任务', 503);
    }

    try {
      console.log(`🚀 开始执行 AI 任务: ${prompt}`);
      console.log(
        `🔍 当前 agent.onTaskStartTip 是否已设置: ${typeof this.agent.onTaskStartTip}`,
      );

      await this.agent.ai(prompt);
      console.log(`✅ AI 任务执行完成: ${prompt}`);
    } catch (error: any) {
      console.log(`❌ AI 任务执行失败: ${error.message}`);
      if (error.message?.includes('ai')) {
        throw new AppError(`AI 执行失败: ${error.message}`, 500);
      }
      throw new AppError(`任务执行失败: ${error.message}`, 500);
    }
  }

  /**
   * 执行 AI 断言
   */
  async expect(prompt: string, maxRetries: number = 3): Promise<void> {
    // 如果服务未启动，自动启动
    if (!this.isStarted()) {
      console.log('🔄 服务未启动，自动启动 WebOperateService...');
      await this.start();
    }

    // 执行前确保连接当前标签页
    await this.ensureCurrentTabConnection();

    await this.runWithRetry(prompt, maxRetries, (attempt, max) =>
      this.expectWithRetry(prompt, attempt, max),
    );
  }

  private async expectWithRetry(
    prompt: string,
    _attempt: number,
    _maxRetries: number,
  ): Promise<void> {
    // 此时应该已经确保服务启动，如果仍然没有agent，说明启动失败
    if (!this.agent) {
      throw new AppError('服务启动失败，无法执行断言', 503);
    }

    try {
      await this.agent.aiAssert(prompt);
    } catch (error: any) {
      if (error.message?.includes('ai')) {
        throw new AppError(`AI 断言失败: ${error.message}`, 500);
      }
      throw new AppError(`断言执行失败: ${error.message}`, 500);
    }
  }

  /**
   * 运行 YAML 脚本并跟踪错误（自定义包装方法）
   * @param prompt YAML 脚本内容
   * @returns 包含错误信息的执行结果
   */
  private async runYamlWithErrorTracking(prompt: string): Promise<any> {
    if (!this.agent) {
      throw new AppError('Agent 未初始化', 503);
    }

    // 清理之前的错误记录
    this.clearTaskErrors();
    const result = await this.agent.runYaml(prompt);

    // 检查是否有任务错误发生
    const taskErrors = this.getTaskErrors();

    return {
      ...result,
      // 添加错误跟踪信息
      _wrapped: true,
      _timestamp: Date.now(),
      _taskErrors: taskErrors.length > 0 ? taskErrors : undefined,
      _hasErrors: taskErrors.length > 0,
    };
  }

  /**
   * 执行 YAML 脚本
   * @returns 返回脚本执行结果
   */
  async executeScript(
    prompt: string,
    maxRetries: number = 3,
    originalCmd?: string,
  ): Promise<any> {
    // 如果服务未启动，自动启动
    if (!this.isStarted()) {
      console.log('🔄 服务未启动，自动启动 WebOperateService...');
      await this.start();
    }

    // 执行前确保连接当前标签页
    await this.ensureCurrentTabConnection();

    try {
      const result = await this.runWithRetry(
        prompt,
        maxRetries,
        async (_attempt, _max) => {
          // 此时应该已经确保服务启动，如果仍然没有agent，说明启动失败
          if (!this.agent) {
            throw new AppError('服务启动失败，无法执行脚本', 503);
          }

          try {
            // 使用自定义的 runYamlWithErrorTracking 方法
            const yamlResult = await this.runYamlWithErrorTracking(prompt);

            serviceLogger.info(
              {
                prompt,
                result: yamlResult,
              },
              'YAML 脚本执行完成',
            );

            return yamlResult;
          } catch (error: any) {
            // 先不急着上报错误，由外层决定是否兜底和上报
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
          // 兜底成功，不上报错误
          serviceLogger.warn(
            { prompt, originalCmd, originalError: error?.message },
            'YAML 执行失败，但兜底执行成功，忽略原错误',
          );
          return undefined; // 兜底执行没有返回值
        } catch (fallbackErr: any) {
          // 兜底失败，同时上报两个错误
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
      // 未提供 originalCmd，按原逻辑抛错
      throw error;
    }
  }

  /**
   * 评估页面 JavaScript（带主动连接保证）
   */
  public async evaluateJavaScript(
    script: string,
    originalCmd?: string,
  ): Promise<any> {
    try {
      // 如果服务未启动，自动启动
      if (!this.isStarted()) {
        console.log('🔄 服务未启动，自动启动 WebOperateService...');
        await this.start();
      }

      // 执行前确保连接当前标签页
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
      // 如果提供了 originalCmd，则先尝试兜底执行
      if (originalCmd) {
        try {
          await this.execute(originalCmd);
          // 兜底成功，不上报错误
          serviceLogger.warn(
            { script, originalCmd, originalError: error?.message },
            'JS 执行失败，但兜底执行成功，忽略原错误',
          );
          return;
        } catch (fallbackErr: any) {
          // 兜底失败，同时上报两个错误
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
