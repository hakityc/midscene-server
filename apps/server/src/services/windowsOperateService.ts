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
import { ossService } from './ossService';

// ==================== 服务状态枚举 ====================
enum WindowsServiceState {
  STOPPED = 'stopped', // 服务已停止
  STARTING = 'starting', // 正在启动
  RUNNING = 'running', // 正常运行
  STOPPING = 'stopping', // 正在停止
}

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
  private state: WindowsServiceState = WindowsServiceState.STOPPED;

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

  // ==================== 状态管理辅助方法 ====================

  /**
   * 设置服务状态
   * @param newState 新状态
   */
  private setState(newState: WindowsServiceState): void {
    const oldState = this.state;
    this.state = newState;
    serviceLogger.info(
      { oldState, newState },
      `Windows State transition: ${oldState} -> ${newState}`,
    );
  }

  /**
   * 检查当前状态
   * @param state 要检查的状态
   * @returns 是否匹配
   */
  private isState(state: WindowsServiceState): boolean {
    return this.state === state;
  }

  /**
   * 获取当前状态
   * @returns 当前状态
   */
  public getState(): WindowsServiceState {
    return this.state;
  }

  /**
   * 等待状态变化
   * @param currentState 当前状态
   * @param timeout 超时时间（毫秒）
   */
  private async waitForStateChange(
    currentState: WindowsServiceState,
    timeout: number,
  ): Promise<void> {
    const startTime = Date.now();

    while (this.isState(currentState) && Date.now() - startTime < timeout) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (this.isState(currentState)) {
      throw new Error(`等待状态变化超时: ${currentState}`);
    }

    if (this.isState(WindowsServiceState.RUNNING)) {
      serviceLogger.info('Windows 服务启动完成（等待其他启动完成）');
      return;
    }

    if (this.isState(WindowsServiceState.STOPPED)) {
      throw new Error('Windows 服务启动失败');
    }
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
      WindowsOperateService.instance.setState(WindowsServiceState.STOPPED);
      WindowsOperateService.instance
        .stop()
        .catch((error) =>
          serviceLogger.error({ error }, '重置实例时停止服务失败'),
        );
      WindowsOperateService.instance = null;
    }
  }

  // ==================== 生命周期方法 ====================

  /**
   * 启动服务 - 创建并初始化 AgentOverWindows
   */
  public async start(): Promise<void> {
    // 如果已运行，直接返回
    if (this.isState(WindowsServiceState.RUNNING) && this.agent) {
      serviceLogger.info('WindowsOperateService 已启动，跳过重复启动');
      return;
    }

    // 如果正在启动中，等待启动完成
    if (this.isState(WindowsServiceState.STARTING)) {
      serviceLogger.info('WindowsOperateService 正在启动中，等待启动完成...');
      await this.waitForStateChange(WindowsServiceState.STARTING, 30000);
      return;
    }

    // 如果正在停止中，先等待停止完成
    if (this.isState(WindowsServiceState.STOPPING)) {
      serviceLogger.info('WindowsOperateService 正在停止中，等待停止完成...');
      await this.waitForStateChange(WindowsServiceState.STOPPING, 10000);
    }

    this.setState(WindowsServiceState.STARTING);

    serviceLogger.info('启动 WindowsOperateService...');

    try {
      // 创建并初始化 AgentOverWindows（合并了创建和初始化流程）
      await this.createAgent();

      this.setState(WindowsServiceState.RUNNING);
      serviceLogger.info('WindowsOperateService 启动成功');
    } catch (error) {
      this.setState(WindowsServiceState.STOPPED);
      serviceLogger.error({ error }, 'WindowsOperateService 启动失败');
      throw error;
    }
  }

  /**
   * 停止服务 - 销毁 AgentOverWindows
   */
  public async stop(): Promise<void> {
    serviceLogger.info('停止 WindowsOperateService...');

    if (this.isState(WindowsServiceState.STOPPED)) {
      serviceLogger.info('服务已经停止');
      return;
    }

    this.setState(WindowsServiceState.STOPPING);

    try {
      // 销毁 agent
      if (this.agent) {
        await this.agent.destroy(true);
        this.agent = null;
      }

      serviceLogger.info('WindowsOperateService 已停止');
    } catch (error) {
      serviceLogger.error({ error }, '停止 WindowsOperateService 时出错');
      throw error;
    } finally {
      // 确保状态总是被重置为 STOPPED
      this.setState(WindowsServiceState.STOPPED);
    }
  }

  /**
   * 检查服务是否已启动
   */
  public isStarted(): boolean {
    return this.isState(WindowsServiceState.RUNNING) && this.agent !== null;
  }

  /**
   * 检查是否已初始化（向后兼容）
   */
  public isReady(): boolean {
    return this.isState(WindowsServiceState.RUNNING) && this.agent !== null;
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
    // 销毁旧实例
    if (this.agent) {
      serviceLogger.info('AgentOverWindows 已存在，先销毁旧实例');
      try {
        await this.agent.destroy(true);
      } catch (error) {
        serviceLogger.warn({ error }, '销毁旧 AgentOverWindows 时出错');
      }
    }

    serviceLogger.info('正在创建并初始化 AgentOverWindows...');

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        serviceLogger.info(
          { attempt, maxRetries },
          `尝试创建 Agent (${attempt}/${maxRetries})...`,
        );

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

        serviceLogger.info('AgentOverWindows 创建并初始化成功');
        return;
      } catch (error) {
        lastError = error as Error;
        serviceLogger.error(
          { error, attempt, maxRetries },
          `AgentOverWindows 创建失败 (尝试 ${attempt}/${maxRetries})`,
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
          serviceLogger.info({ delay }, `${delay / 1000}秒后重试...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // 所有重试都失败了
    serviceLogger.error('AgentOverWindows 创建最终失败，所有重试已用尽');
    throw new Error(
      `创建失败，已重试 ${maxRetries} 次。最后错误: ${lastError?.message}`,
    );
  }

  /**
   * 处理任务开始提示的统一方法
   */
  private handleTaskStartTip(tip: string, error?: Error | null): void {
    try {
      const { formatted, category, icon, content, hint } = formatTaskTip(tip);
      const stageDescription = getTaskStageDescription(category);

      serviceLogger.info(
        { tip, icon, formatted, stageDescription },
        'Windows AI 任务开始',
      );
      if (content) {
        serviceLogger.info({ content }, '详细内容');
      }

      serviceLogger.info(
        {
          tip,
          formatted,
          category,
          icon,
          content,
          hint,
          stage: stageDescription,
          error: error
            ? {
                message: error.message,
                type: 'task_error',
              }
            : undefined,
        },
        'Windows AI 任务开始执行',
      );

      // 发射事件，让其他地方可以监听到
      this.emit('taskStartTip', tip, error);

      // 触发注册的回调，并传递错误信息
      this.triggerTaskTipCallbacks(tip, error);
    } catch (handlerError: any) {
      // 捕获任何错误，防止影响主流程
      serviceLogger.error(
        {
          tip,
          error: handlerError?.message,
          stack: handlerError?.stack,
        },
        'handleTaskStartTip 执行失败',
      );

      // 尝试通知客户端发生了错误
      try {
        this.triggerTaskTipCallbacks(
          tip || '未知任务',
          handlerError instanceof Error
            ? handlerError
            : new Error(String(handlerError)),
        );
      } catch (notifyError) {
        // 如果通知也失败了，只记录日志
        serviceLogger.error(
          { notifyError },
          '无法通知客户端 handleTaskStartTip 错误',
        );
      }
    }
  }

  /**
   * 触发任务提示回调
   * @param tip 任务提示内容
   * @param error 任务错误（如果有）
   */
  private triggerTaskTipCallbacks(tip: string, error?: Error | null): void {
    this.taskTipCallbacks.forEach((callback) => {
      try {
        callback(tip, error);
      } catch (callbackError) {
        serviceLogger.error({ callbackError }, '任务提示回调执行失败');
      }
    });
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
      content: string;
      hint: string;
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
        // 格式化任务提示（完整提取所有字段）
        const { formatted, category, icon, content, hint } = formatTaskTip(tip);
        const timestamp = new Date().toLocaleTimeString('zh-CN', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        serviceLogger.info({ tip }, 'WebSocket 监听到 Windows 任务提示');

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

        // 发送格式化后的用户友好消息（icon 已独立，不需要移除 emoji）
        const response = createSuccessResponseWithMeta(
          message,
          formatted,
          {
            originalTip: tip,
            category,
            timestamp,
            stage: getTaskStageDescription(category),
            icon, // 添加独立的 icon 字段
            content, // 添加原始详细内容
            hint, // 添加补充提示
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
   * 生成并上传 report 到 OSS
   * 在 AI 任务执行完成后调用
   */
  private async generateAndUploadReport(): Promise<void> {
    if (!this.agent) {
      serviceLogger.warn('Agent 未初始化，跳过 report 上传');
      return;
    }

    // 如果 agent 已销毁，静默跳过（可能是 stop() 被提前调用）
    if (this.agent.destroyed) {
      serviceLogger.info('Agent 已销毁，跳过 report 生成和上传');
      return;
    }

    try {
      // 生成 report 文件
      this.agent.writeOutActionDumps();

      const reportFile = this.agent.reportFile;
      if (!reportFile) {
        serviceLogger.warn('Report 文件未生成，跳过上传');
        return;
      }
      // 上传到 OSS
      const reportUrl = await ossService.uploadReport(reportFile);

      if (reportUrl) {
        serviceLogger.info(
          {
            reportUrl,
            type: 'REPORT_UPLOADED', // 添加类型标记
            timestamp: Date.now(),
          },
          '📊 Windows Report 已生成并上传，查看地址',
        );
      } else {
        serviceLogger.warn('Windows Report 上传失败或 OSS 未启用');
      }
    } catch (error: any) {
      // 检查是否是 agent 已销毁的错误
      if (error?.message?.includes('PageAgent has been destroyed')) {
        serviceLogger.info(
          'Agent 已在 report 生成过程中被销毁，跳过 report 保存（可能是服务正在停止）',
        );
        return;
      }

      // 其他错误：上传失败不应该影响主流程，只记录日志
      serviceLogger.error({ error }, '❌ Windows Report 上传过程出错');
    }
  }

  // ==================== 窗口管理方法 ====================

  /**
   * 连接到指定 Windows 窗口
   * 连接后，所有截图和操作都将针对该窗口
   */
  async connectWindow(params: {
    windowId?: number;
    windowTitle?: string;
  }): Promise<{ id: number; title: string; width: number; height: number }> {
    try {
      if (!this.agent) {
        throw new Error('Agent 未初始化');
      }

      // 调用 agent 的 device.connectWindow
      const device = this.agent.page;
      if (!device || typeof device.connectWindow !== 'function') {
        throw new AppError('当前设备不支持窗口连接功能', 400);
      }

      const windowInfo = await device.connectWindow(params);

      serviceLogger.info(
        {
          windowId: windowInfo.id,
          windowTitle: windowInfo.title,
        },
        '窗口连接成功',
      );

      return windowInfo;
    } catch (error: any) {
      serviceLogger.error({ error }, '窗口连接失败');
      throw new AppError(`窗口连接失败: ${error.message}`, 500);
    }
  }

  /**
   * 断开窗口连接
   */
  async disconnectWindow(): Promise<void> {
    try {
      if (!this.agent) {
        throw new Error('Agent 未初始化');
      }

      const device = this.agent.page;
      if (device && typeof device.disconnectWindow === 'function') {
        device.disconnectWindow();
        serviceLogger.info('窗口连接已断开');
      }
    } catch (error: any) {
      serviceLogger.error({ error }, '断开窗口连接失败');
      throw new AppError(`断开窗口连接失败: ${error.message}`, 500);
    }
  }

  /**
   * 获取所有窗口列表
   */
  async getWindowList(): Promise<
    Array<{
      id: number;
      title: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }>
  > {
    try {
      if (!this.agent) {
        throw new Error('Agent 未初始化');
      }

      const device = this.agent.page;
      if (!device || typeof device.getWindowList !== 'function') {
        throw new AppError('当前设备不支持窗口列表功能', 400);
      }

      return await device.getWindowList();
    } catch (error: any) {
      serviceLogger.error({ error }, '获取窗口列表失败');
      throw new AppError(`获取窗口列表失败: ${error.message}`, 500);
    }
  }

  // ==================== AI 执行方法 ====================

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

      // 执行完成后生成并上传 report
      await this.generateAndUploadReport();
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

      // 执行完成后生成并上传 report
      await this.generateAndUploadReport();

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
