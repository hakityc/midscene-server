import { Agent, type AgentOpt } from '@midscene/core/agent';
import WindowsDevice, { type WindowsDeviceOptions } from './windowsDevice';

/**
 * AgentOverWindows 构造函数选项
 */
export interface AgentOverWindowsOpt extends AgentOpt {
  /** Windows 设备选项 */
  deviceOptions?: WindowsDeviceOptions;
  /** 是否在销毁时清理资源 */
  closeAfterDisconnect?: boolean;
}

/**
 * AgentOverWindows - Windows 平台的 Midscene Agent 实现
 *
 * 继承自 Agent 基类，提供 Windows 桌面应用的 AI 自动化能力
 * 使用 nut-js 直接在本地执行 Windows 操作
 *
 * 设计参考：
 * - AndroidAgent: packages/android/src/agent.ts
 * - AgentOverChromeBridge: packages/web/src/bridge-mode/agent-cli-side.ts
 *
 * 核心特性：
 * - 完整的 AI 任务执行能力（继承自 Agent）
 * - 本地 Windows 操作（通过 nut-js）
 * - Windows 特定的窗口管理
 * - 生命周期管理
 * - 错误处理和重试机制
 *
 * 使用示例：
 * ```ts
 * // 基础使用
 * const agent = new AgentOverWindows({
 *   deviceOptions: { deviceName: 'MyApp', debug: true }
 * })
 *
 * // 启动设备
 * await agent.launch()
 *
 * // 执行 AI 任务
 * await agent.aiAction('点击开始按钮')
 * await agent.aiTap('确定按钮')
 * await agent.aiInput('Hello World', '搜索框')
 *
 * // 执行查询
 * const title = await agent.aiString('获取当前窗口标题')
 * const isVisible = await agent.aiBoolean('开始菜单是否可见')
 *
 * // 执行断言
 * await agent.aiAssert('窗口标题包含"记事本"')
 *
 * // 等待条件
 * await agent.aiWaitFor('对话框出现', { timeoutMs: 5000 })
 *
 * // 执行 YAML 脚本
 * const yaml = `
 * tasks:
 *   - name: 打开应用
 *     type: action
 *     prompt: 点击开始菜单
 * `
 * await agent.runYaml(yaml)
 *
 * // 清理
 * await agent.destroy()
 * ```
 *
 * 高级使用：
 * ```ts
 * // 使用任务回调
 * const agent = new AgentOverWindows({
 *   onTaskStartTip: (tip) => {
 *     console.log('任务开始:', tip)
 *   },
 *   generateReport: true,
 *   autoPrintReportMsg: true
 * })
 *
 * // 获取窗口列表
 * const windows = await agent.getWindowList()
 *
 * // 激活特定窗口
 * await agent.activateWindow(windows[0].handle)
 *
 * // 截图
 * await agent.logScreenshot('测试截图', { content: '这是一个测试' })
 * ```
 */
export default class AgentOverWindows extends Agent<WindowsDevice> {
  // ==================== 私有属性 ====================
  private destroyAfterDisconnectFlag?: boolean;

  // ==================== 构造函数 ====================

  constructor(opts?: AgentOverWindowsOpt) {
    // 创建 WindowsDevice 实例（本地模式，使用 nut-js）
    const windowsDevice = new WindowsDevice(opts?.deviceOptions);

    // 调用父类构造函数
    // Agent 会自动初始化：
    // - insight: AI 能力
    // - taskExecutor: 任务执行器
    // - dump: 执行记录
    // - modelConfigManager: 模型配置管理
    //
    // 直接传递 opts，不做额外的回调包装
    // 这样可以避免多层嵌套和 this 上下文问题
    super(windowsDevice, opts);

    // 保存配置
    this.destroyAfterDisconnectFlag = opts?.closeAfterDisconnect;
  }

  // ==================== 生命周期方法 ====================

  /**
   * 启动 Windows 设备
   *
   * 这个方法应该在创建 Agent 后立即调用
   * 相当于 Android 的 launch() 方法
   */
  async launch(): Promise<void> {
    try {
      // 启动 Windows 设备（WindowsDevice 内部会处理重复启动的情况）
      await this.interface.launch();

      console.log('✅ WindowsDevice launched successfully');
    } catch (error) {
      console.error('❌ Failed to launch WindowsDevice:', error);
      throw error;
    }
  }

  /**
   * 设置销毁选项并启动设备
   *
   * 这是一个便捷方法，结合了启动和配置
   * 参考 AgentOverChromeBridge.setDestroyOptionsAfterConnect()
   */
  async setDestroyOptionsAfterConnect(): Promise<void> {
    await this.launch();
  }

  /**
   * 销毁 Agent 实例并清理资源
   *
   * @param closeAfterDisconnect - 是否在断开连接后关闭设备
   */
  async destroy(closeAfterDisconnect?: boolean): Promise<void> {
    if (this.destroyed) {
      console.log('⚠️ Agent already destroyed, skipping');
      return;
    }

    const shouldClose = closeAfterDisconnect ?? this.destroyAfterDisconnectFlag;

    try {
      if (shouldClose) {
        // 销毁 Windows 设备
        await this.interface.destroy();
        console.log('✅ WindowsDevice destroyed');
      }

      // 标记为已销毁
      this.destroyed = true;

      console.log('✅ AgentOverWindows destroyed');
    } catch (error) {
      console.error('❌ Failed to destroy AgentOverWindows:', error);
      throw error;
    }
  }

  // ==================== AI 任务方法 ====================

  /**
   * 执行 AI 动作
   *
   * 这是一个高级方法，支持自然语言描述的任务
   * 内部会自动处理截图、AI 分析、动作执行等流程
   *
   * @param prompt - 任务描述，如 "点击开始菜单"、"打开记事本"
   * @param options - 执行选项
   * @returns 执行结果或 YAML 流程
   *
   * @example
   * ```ts
   * // 简单任务
   * await agent.aiAction('点击确定按钮')
   *
   * // 复杂任务
   * await agent.aiAction('在搜索框输入"Hello"并点击搜索')
   *
   * // 带返回值的任务
   * const result = await agent.aiAction('提取表格数据')
   * console.log(result?.result)
   * ```
   */
  async aiAction(
    prompt: string,
    options?: any,
  ): Promise<
    | {
        result: Record<string, any>;
      }
    | {
        yamlFlow?: import('@midscene/core').MidsceneYamlFlowItem[];
      }
    | undefined
  > {
    // 使用基类的 ai 方法执行任务
    // ai 方法会：
    // 1. 调用 taskExecutor 分析任务
    // 2. 生成执行计划
    // 3. 通过 interface (WindowsDevice) 执行动作（WindowsDevice 内部会检查状态）
    // 4. 记录执行过程到 dump
    // 5. 生成报告
    return await this.ai(prompt, options?.type);
  }

  // ==================== Windows 特定方法 ====================

  /**
   * 获取 Windows 窗口列表
   *
   * @returns 窗口列表，包含句柄、标题、进程 ID 等信息
   *
   * @example
   * ```ts
   * const windows = await agent.getWindowList()
   * console.log('当前窗口:', windows)
   * // [
   * //   { handle: '0x123', title: 'Notepad', processId: 1234, isActive: true },
   * //   { handle: '0x456', title: 'Chrome', processId: 5678, isActive: false }
   * // ]
   * ```
   */
  async getWindowList(): Promise<
    Array<{
      handle: string;
      title: string;
      processId: number;
      isActive: boolean;
    }>
  > {
    // WindowsDevice 内部会检查状态
    return await this.interface.getWindowList();
  }

  /**
   * 激活指定窗口
   *
   * @param windowHandle - 窗口句柄
   *
   * @example
   * ```ts
   * const windows = await agent.getWindowList()
   * const notepadWindow = windows.find(w => w.title.includes('Notepad'))
   * if (notepadWindow) {
   *   await agent.activateWindow(notepadWindow.handle)
   * }
   * ```
   */
  async activateWindow(windowHandle: string): Promise<void> {
    // WindowsDevice 内部会检查状态
    await this.interface.activateWindow(windowHandle);
  }

  /**
   * 获取剪贴板内容
   *
   * @returns 剪贴板文本内容
   *
   * @example
   * ```ts
   * const clipboardText = await agent.getClipboard()
   * console.log('剪贴板内容:', clipboardText)
   * ```
   */
  async getClipboard(): Promise<string> {
    // WindowsDevice 内部会检查状态
    return await this.interface.getClipboard();
  }

  /**
   * 设置剪贴板内容
   *
   * @param text - 要设置的文本
   *
   * @example
   * ```ts
   * await agent.setClipboard('Hello World')
   * // 然后可以通过 Ctrl+V 粘贴
   * await agent.aiKeyboardPress('v', undefined, { modifier: 'control' })
   * ```
   */
  async setClipboard(text: string): Promise<void> {
    // WindowsDevice 内部会检查状态
    await this.interface.setClipboard(text);
  }

  /**
   * 获取设备信息
   *
   * @returns 屏幕尺寸和 DPR
   *
   * @example
   * ```ts
   * const info = await agent.getDeviceInfo()
   * console.log(`屏幕尺寸: ${info.width}x${info.height}`)
   * ```
   */
  async getDeviceInfo(): Promise<{
    width: number;
    height: number;
    dpr?: number;
  }> {
    // WindowsDevice 内部会检查状态
    return await this.interface.size();
  }

  /**
   * 截图
   *
   * @returns Base64 格式的截图数据
   *
   * @example
   * ```ts
   * const screenshot = await agent.screenshot()
   * // screenshot 格式: "data:image/png;base64,iVBORw0KGgo..."
   *
   * // 保存到文件
   * const fs = require('fs')
   * const base64Data = screenshot.replace(/^data:image\/png;base64,/, '')
   * fs.writeFileSync('screenshot.png', base64Data, 'base64')
   * ```
   */
  async screenshot(): Promise<string> {
    // WindowsDevice 内部会检查状态
    return await this.interface.screenshotBase64();
  }

  // ==================== 便捷方法 ====================

  /**
   * 快速执行任务（aiAction 的简写）
   *
   * @param prompt - 任务描述
   */
  async execute(prompt: string): Promise<void> {
    await this.aiAction(prompt);
  }

  /**
   * 快速执行断言（aiAssert 的简写）
   *
   * @param assertion - 断言描述
   */
  async expect(assertion: string): Promise<void> {
    await this.aiAssert(assertion);
  }

  // ==================== 工具方法 ====================

  /**
   * 获取 Agent 状态信息
   *
   * @returns 状态信息对象
   */
  getStatus(): {
    isDestroyed: boolean;
    deviceName: string;
    interfaceType: string;
  } {
    return {
      isDestroyed: this.destroyed,
      deviceName: this.interface.options.deviceName || 'Unknown',
      interfaceType: this.interface.interfaceType,
    };
  }
}
