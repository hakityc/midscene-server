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
