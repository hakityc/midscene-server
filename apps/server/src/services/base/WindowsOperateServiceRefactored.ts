import { AppError } from '../../utils/error';
import { serviceLogger } from '../../utils/logger';
import AgentOverWindows, {
  type AgentOverWindowsOpt,
} from '../customMidsceneDevice/agentOverWindows';
import { BaseOperateService, OperateServiceState } from './BaseOperateService';

/**
 * WindowsOperateServiceRefactored - Windows 应用操作服务（重构版）
 *
 * 继承自 BaseOperateService，实现 Windows 特定的功能：
 * - Windows 桌面应用操作
 * - 本地 nut-js 实现
 * - 窗口管理
 */
export class WindowsOperateServiceRefactored extends BaseOperateService<AgentOverWindows> {
  // ==================== 单例模式相关 ====================
  private static instance: WindowsOperateServiceRefactored | null = null;

  // ==================== Agent 默认配置 ====================
  private readonly defaultAgentConfig: Omit<
    AgentOverWindowsOpt,
    'onTaskStartTip'
  > = {
    closeAfterDisconnect: false,
    generateReport: true,
    autoPrintReportMsg: true,
    deviceOptions: {
      deviceName: 'Windows Desktop',
      debug: true,
    },
  };

  private constructor() {
    super();
  }

  // ==================== 单例模式方法 ====================

  public static getInstance(): WindowsOperateServiceRefactored {
    if (!WindowsOperateServiceRefactored.instance) {
      WindowsOperateServiceRefactored.instance =
        new WindowsOperateServiceRefactored();
    }
    return WindowsOperateServiceRefactored.instance;
  }

  public static resetInstance(): void {
    if (WindowsOperateServiceRefactored.instance) {
      WindowsOperateServiceRefactored.instance.setState(
        OperateServiceState.STOPPED,
      );
      WindowsOperateServiceRefactored.instance.stop().catch(console.error);
      WindowsOperateServiceRefactored.instance = null;
    }
  }

  // ==================== 实现抽象方法 ====================

  protected getServiceName(): string {
    return 'WindowsOperateService';
  }

  protected async createAgent(): Promise<void> {
    // 销毁旧实例
    if (this.agent) {
      console.log('AgentOverWindows 已存在，先销毁旧实例');
      try {
        await this.agent.destroy(true);
      } catch (error) {
        console.warn('销毁旧 AgentOverWindows 时出错:', error);
      }
    }

    console.log('正在创建并初始化 AgentOverWindows...');

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`尝试创建 Agent (${attempt}/${maxRetries})...`);

        // 创建 Agent，动态传入 onTaskStartTip 回调
        this.agent = new AgentOverWindows({
          ...this.defaultAgentConfig,
          onTaskStartTip: (tip: string) => {
            this.handleTaskStartTip(tip);
          },
        });

        console.log('AgentOverWindows 创建成功');
        return;
      } catch (error) {
        lastError = error as Error;
        console.error(
          `AgentOverWindows 创建失败 (尝试 ${attempt}/${maxRetries}):`,
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
          const delay = attempt * 2000;
          console.log(`${delay / 1000}秒后重试...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    console.error('AgentOverWindows 创建最终失败，所有重试已用尽');
    throw new Error(
      `创建失败，已重试 ${maxRetries} 次。最后错误: ${lastError?.message}`,
    );
  }

  protected async initializeConnection(): Promise<void> {
    if (!this.agent) {
      throw new Error('Agent 未创建，无法初始化连接');
    }

    console.log('启动 WindowsDevice...');
    await this.agent.launch();
    console.log('WindowsDevice 启动成功');
  }

  // ==================== Windows 特定方法 ====================

  /**
   * 连接到指定 Windows 窗口
   */
  async connectWindow(params: {
    windowId?: number;
    windowTitle?: string;
  }): Promise<{ id: number; title: string; width: number; height: number }> {
    try {
      if (!this.agent) {
        throw new Error('Agent 未初始化');
      }

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

  // ==================== 执行方法实现 ====================

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

  async executeScript(
    yamlContent: string,
    _maxRetries?: number,
    originalCmd?: string,
  ): Promise<any> {
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
          return undefined;
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
