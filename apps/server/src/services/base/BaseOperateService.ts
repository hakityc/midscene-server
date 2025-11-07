import { EventEmitter } from 'node:events';
import type { AgentOverChromeBridge } from '@midscene/web/bridge-mode';
import { serviceLogger } from '../../utils/logger';
import {
  formatTaskTip,
  getTaskStageDescription,
} from '../../utils/taskTipFormatter';
import type AgentOverWindows from '../customMidsceneDevice/agentOverWindows';
import { ossService } from '../ossService';
import dayjs from 'dayjs';

// ==================== 统一的服务状态枚举 ====================
export enum OperateServiceState {
  STOPPED = 'stopped',
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping',
  RECONNECTING = 'reconnecting', // 仅 Web 使用，Windows 可以忽略
}

// ==================== 类型定义 ====================

/**
 * Agent 类型联合
 */
export type AgentType = AgentOverChromeBridge | AgentOverWindows;

/**
 * 任务提示回调类型
 */
export type TaskTipCallback = (
  tip: string,
  bridgeError?: Error | null,
  stepIndex?: number,
) => void;

/**
 * 任务错误记录
 */
export interface TaskError {
  taskName: string;
  error: Error;
  timestamp: number;
}

/**
 * TaskTipCallback 配置接口 - 简化版
 */
export interface TaskTipCallbackConfig<T = any> {
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
  createErrorResponse: (message: T, error: Error, errorMessage: string) => any;
  WebSocketAction: any;
}

/**
 * BaseOperateService - 操作服务基类
 *
 * 提供 Web 和 Windows 服务的公共功能：
 * - 状态管理
 * - 回调机制
 * - 生命周期管理
 * - Report 生成和上传
 */
export abstract class BaseOperateService<
  TAgent extends AgentType,
> extends EventEmitter {
  // ==================== 核心属性 ====================
  public agent: TAgent | null = null;
  protected state: OperateServiceState = OperateServiceState.STOPPED;

  // ==================== 回调机制属性 ====================
  protected taskTipCallbacks: TaskTipCallback[] = [];

  // ==================== 错误跟踪属性 ====================
  protected taskErrors: TaskError[] = [];

  // ==================== 抽象方法（子类必须实现） ====================

  /**
   * 创建 Agent 实例
   * 子类需要实现自己的 Agent 创建逻辑
   */
  protected abstract createAgent(): Promise<void>;

  /**
   * 初始化连接
   * 子类需要实现自己的连接初始化逻辑
   */
  protected abstract initializeConnection(): Promise<void>;

  /**
   * 获取服务名称（用于日志）
   */
  protected abstract getServiceName(): string;

  // ==================== 状态管理方法 ====================

  /**
   * 设置服务状态
   */
  protected setState(newState: OperateServiceState): void {
    const oldState = this.state;
    this.state = newState;
    serviceLogger.info(
      { oldState, newState, service: this.getServiceName() },
      `${this.getServiceName()}: State transition: ${oldState} -> ${newState}`,
    );
  }

  /**
   * 检查当前状态
   */
  protected isState(state: OperateServiceState): boolean {
    return this.state === state;
  }

  /**
   * 获取当前状态
   */
  public getState(): OperateServiceState {
    return this.state;
  }

  /**
   * 等待状态变化
   */
  protected async waitForStateChange(
    currentState: OperateServiceState,
    timeout: number,
  ): Promise<void> {
    const startTime = Date.now();

    while (this.isState(currentState) && Date.now() - startTime < timeout) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (this.isState(currentState)) {
      throw new Error(
        `${this.getServiceName()}: 等待状态变化超时: ${currentState}`,
      );
    }

    if (this.isState(OperateServiceState.RUNNING)) {
      serviceLogger.info(
        `${this.getServiceName()}: 服务启动完成（等待其他启动完成）`,
      );
      return;
    }

    if (this.isState(OperateServiceState.STOPPED)) {
      throw new Error(`${this.getServiceName()}: 服务启动失败`);
    }
  }

  // ==================== 生命周期方法 ====================

  /**
   * 启动服务
   */
  public async start(): Promise<void> {
    // 如果已运行，直接返回
    if (this.isState(OperateServiceState.RUNNING) && this.agent) {
      serviceLogger.info(`${this.getServiceName()} 已启动，跳过重复启动`);
      return;
    }

    // 如果正在启动中，等待启动完成
    if (this.isState(OperateServiceState.STARTING)) {
      serviceLogger.info(
        `${this.getServiceName()} 正在启动中，等待启动完成...`,
      );
      await this.waitForStateChange(OperateServiceState.STARTING, 30000);
      return;
    }

    // 如果正在停止中，先等待停止完成
    if (this.isState(OperateServiceState.STOPPING)) {
      serviceLogger.info(
        `${this.getServiceName()} 正在停止中，等待停止完成...`,
      );
      await this.waitForStateChange(OperateServiceState.STOPPING, 10000);
    }

    this.setState(OperateServiceState.STARTING);
    serviceLogger.info(`启动 ${this.getServiceName()}...`);

    try {
      // 创建 Agent 实例
      await this.createAgent();

      // 初始化连接
      await this.initializeConnection();

      this.setState(OperateServiceState.RUNNING);
      serviceLogger.info(`${this.getServiceName()} 启动成功`);
    } catch (error) {
      this.setState(OperateServiceState.STOPPED);
      serviceLogger.error({ error }, `${this.getServiceName()} 启动失败`);
      throw error;
    }
  }

  /**
   * 停止服务
   */
  public async stop(): Promise<void> {
    serviceLogger.info(`停止 ${this.getServiceName()}...`);

    if (this.isState(OperateServiceState.STOPPED)) {
      serviceLogger.info('服务已经停止');
      return;
    }

    this.setState(OperateServiceState.STOPPING);

    try {
      // 销毁 agent
      if (this.agent) {
        await this.destroyAgent();
        this.agent = null;
      }

      serviceLogger.info(`${this.getServiceName()} 已停止`);
    } catch (error) {
      serviceLogger.error({ error }, `停止 ${this.getServiceName()} 时出错`);
      throw error;
    } finally {
      // 确保状态总是被重置为 STOPPED
      this.setState(OperateServiceState.STOPPED);
    }
  }

  /**
   * 销毁 Agent（子类可以重写）
   */
  protected async destroyAgent(): Promise<void> {
    if (this.agent && 'destroy' in this.agent) {
      await (this.agent as any).destroy(true);
    }
  }

  /**
   * 检查服务是否已启动
   */
  public isStarted(): boolean {
    return this.isState(OperateServiceState.RUNNING) && this.agent !== null;
  }

  /**
   * 检查是否已初始化（向后兼容）
   */
  public isReady(): boolean {
    return this.isStarted();
  }

  /**
   * 销毁服务（向后兼容）
   */
  async destroy(): Promise<void> {
    return this.stop();
  }

  // ==================== 回调机制方法 ====================

  /**
   * 注册任务提示回调
   */
  public onTaskTip(callback: TaskTipCallback): void {
    this.taskTipCallbacks.push(callback);
  }

  /**
   * 移除任务提示回调
   */
  public offTaskTip(callback: TaskTipCallback): void {
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
  public getTaskErrors(): TaskError[] {
    return [...this.taskErrors];
  }

  /**
   * 触发任务提示回调
   */
  protected triggerTaskTipCallbacks(
    tip: string,
    bridgeError?: Error | null,
    stepIndex?: number,
  ): void {
    this.taskTipCallbacks.forEach((callback) => {
      try {
        callback(tip, bridgeError, stepIndex);
      } catch (error) {
        serviceLogger.error({ error }, '任务提示回调执行失败');
      }
    });
  }

  /**
   * 处理任务开始提示的统一方法
   */
  protected handleTaskStartTip(
    tip: string,
    bridgeError?: Error | null,
    stepIndex?: number,
  ): void {
    try {
      const { formatted, category, icon, content, hint } = formatTaskTip(tip);
      const stageDescription = getTaskStageDescription(category);

      console.log(`🤖 AI 任务开始: ${tip}`);
      console.log(`${icon} ${formatted} (${stageDescription})`);
      if (content) {
        console.log(`📝 详细内容: ${content}`);
      }

      // 如果有错误，记录到错误跟踪中
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
          content,
          hint,
          stage: stageDescription,
          stepIndex,
          bridgeError: bridgeError
            ? {
                message: bridgeError.message,
                type: bridgeError.message.includes('Connection lost')
                  ? 'connection_lost'
                  : 'bridge_error',
              }
            : undefined,
        },
        `${this.getServiceName()}: AI 任务开始执行`,
      );

      // 发射事件
      this.emit('taskStartTip', tip, bridgeError);

      // 触发注册的回调
      this.triggerTaskTipCallbacks(tip, bridgeError, stepIndex);
    } catch (error: any) {
      console.error('❌ handleTaskStartTip 执行失败:', error);
      serviceLogger.error(
        {
          tip,
          error: error?.message,
          stack: error?.stack,
        },
        'handleTaskStartTip 执行失败',
      );

      try {
        this.triggerTaskTipCallbacks(
          tip || '未知任务',
          error instanceof Error ? error : new Error(String(error)),
          stepIndex,
        );
      } catch (notifyError) {
        console.error('❌ 无法通知客户端错误:', notifyError);
      }
    }
  }

  /**
   * 创建任务提示回调（简化版）
   *
   * 使用依赖注入简化参数传递
   */
  public createTaskTipCallback<T>(
    config: TaskTipCallbackConfig<T>,
  ): TaskTipCallback {
    const {
      send,
      message,
      connectionId,
      wsLogger,
      createSuccessResponseWithMeta,
      createErrorResponse,
      WebSocketAction,
    } = config;

    return (tip: string, bridgeError?: Error | null, stepIndex?: number) => {
      try {
        const { formatted, category, icon, content, hint } = formatTaskTip(tip);
        const timestamp = dayjs().format('HH:mm:ss');

        console.log(`🎯 WebSocket 监听到任务提示: ${tip}`);

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
            '任务执行出现异常，但任务继续执行',
          );
        }

        // 发送格式化后的消息
        const response = createSuccessResponseWithMeta(
          message,
          formatted,
          {
            originalTip: tip,
            category,
            timestamp,
            stage: getTaskStageDescription(category),
            icon,
            content,
            hint,
            stepIndex,
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

  // ==================== 任务前后钩子 ====================

  /**
   * 任务执行前的钩子
   * 用于在每次任务开始前进行必要的初始化操作
   *
   * 主要功能：
   * 1. 重置 agent dump，确保每个任务的报告独立
   * 2. 预留扩展点，方便后续添加其他前置逻辑
   *
   * @param taskType 任务类型，用于日志记录和区分不同任务
   */
  protected async beforeOperate(taskType: string): Promise<void> {
    if (!this.agent) {
      serviceLogger.warn('Agent 未初始化，跳过 beforeOperate 钩子');
      return;
    }

    try {
      // 重置 dump，确保每个任务的报告独立
      if (
        'resetDump' in this.agent &&
        typeof this.agent.resetDump === 'function'
      ) {
        (this.agent as any).resetDump();
        serviceLogger.info(
          { taskType },
          '✨ 已重置 Agent dump，开始新任务（报告将独立生成）',
        );
      }

      // 预留扩展点：后续可以在这里添加其他前置逻辑
      // 例如：
      // - 设置任务开始时间
      // - 记录任务上下文信息
      // - 清理临时资源
      // - 更新任务状态
    } catch (error) {
      // beforeOperate 失败不应该阻塞任务执行
      serviceLogger.warn(
        { error, taskType },
        '⚠️ beforeOperate 钩子执行失败，但不影响任务继续',
      );
    }
  }

  /**
   * 任务执行后的钩子
   * 用于在每次任务完成后进行清理和上报操作
   *
   * 主要功能：
   * 1. 生成并上传报告到 OSS
   * 2. 预留扩展点，方便后续添加其他后置逻辑
   *
   * @param taskType 任务类型，用于日志记录和区分不同任务
   * @param success 任务是否成功执行（可选，默认 true）
   * @param error 任务执行错误（可选）
   */
  protected async afterOperate(
    taskType: string,
    success: boolean = true,
    error?: Error,
  ): Promise<void> {
    try {
      // 1. 生成并上传报告
      await this.generateAndUploadReport();

      // 2. 预留扩展点：后续可以在这里添加其他后置逻辑
      // 例如：
      // - 记录任务执行时长
      // - 上报任务执行状态统计
      // - 发送任务完成通知
      // - 清理临时文件
      // - 更新任务历史记录

      if (!success && error) {
        serviceLogger.warn(
          { taskType, error: error.message },
          '⚠️ 任务执行失败，但 afterOperate 钩子正常完成',
        );
      }
    } catch (hookError: any) {
      // afterOperate 失败不应该抛出异常，避免覆盖原始错误
      serviceLogger.error(
        { hookError, taskType, success },
        '❌ afterOperate 钩子执行失败',
      );
    }
  }

  // ==================== Report 相关方法 ====================

  /**
   * 生成并上传 report 到 OSS
   */
  protected async generateAndUploadReport(): Promise<void> {
    if (!this.agent) {
      serviceLogger.warn('Agent 未初始化，跳过 report 上传');
      return;
    }

    // 检查 agent 是否已销毁
    if ('destroyed' in this.agent && this.agent.destroyed) {
      serviceLogger.info('Agent 已销毁，跳过 report 生成和上传');
      return;
    }

    try {
      // 生成 report 文件
      if ('writeOutActionDumps' in this.agent) {
        (this.agent as any).writeOutActionDumps();
      }

      const reportFile =
        'reportFile' in this.agent ? (this.agent as any).reportFile : null;
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
            type: 'REPORT_UPLOADED',
            timestamp: Date.now(),
          },
          `📊 ${this.getServiceName()} Report 已生成并上传，查看地址`,
        );
      } else {
        serviceLogger.warn('Report 上传失败或 OSS 未启用');
      }
    } catch (error: any) {
      // 检查是否是 agent 已销毁的错误
      if (error?.message?.includes('PageAgent has been destroyed')) {
        serviceLogger.info(
          'Agent 已在 report 生成过程中被销毁，跳过 report 保存（可能是服务正在停止）',
        );
        return;
      }

      serviceLogger.error({ error }, '❌ Report 上传过程出错');
    }
  }

  // ==================== 抽象执行方法（子类必须实现） ====================

  /**
   * 执行 AI 任务
   */
  abstract execute(prompt: string, maxRetries?: number): Promise<void>;

  /**
   * 执行 AI 断言
   */
  abstract expect(prompt: string, maxRetries?: number): Promise<void>;

  /**
   * 执行脚本
   */
  abstract executeScript(
    script: string,
    maxRetries?: number,
    originalCmd?: string,
  ): Promise<any>;
}
