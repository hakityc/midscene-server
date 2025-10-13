import assert from 'node:assert';
import {
  type DeviceAction,
  getMidsceneLocationSchema,
  type InterfaceType,
  type Size,
  z,
} from '@midscene/core';
import {
  type AbstractInterface,
  type ActionKeyboardPressParam,
  type ActionTapParam,
  defineAction,
  defineActionDoubleClick,
  defineActionHover,
  defineActionKeyboardPress,
  defineActionRightClick,
  defineActionScroll,
  defineActionTap,
} from '@midscene/core/device';
import { windowsNative } from './windowsNativeImpl';

/**
 * Windows 设备配置选项
 */
export interface WindowsDeviceOptions {
  /** 设备名称，用于标识和日志 */
  deviceName?: string;
  /** 是否启用调试模式 */
  debug?: boolean;
  /** 自定义动作列表 */
  customActions?: DeviceAction<any>[];
  /** 窗口句柄（用于指定特定窗口） */
  windowHandle?: string;
  /** 进程 ID（用于指定特定应用） */
  processId?: number;
}

/**
 * WindowsDevice - Windows 桌面应用设备实现
 *
 * 实现 AbstractInterface 接口，提供 Windows 平台的基础操作能力
 * 参考 Midscene Android/iOS 设备实现模式
 *
 * 功能：
 * - 截图
 * - 鼠标操作（点击、双击、右键、悬停）
 * - 键盘输入
 * - 滚动
 * - 窗口管理
 *
 * @example
 * ```ts
 * const device = new WindowsDevice({ deviceName: 'MyApp', debug: true })
 * await device.launch()
 * const screenshot = await device.screenshotBase64()
 * await device.mouseClick(100, 200)
 * ```
 */
export default class WindowsDevice implements AbstractInterface {
  // ==================== 私有属性 ====================
  private cachedScreenshot: string | null = null;
  private cachedSize: Size | null = null;
  private destroyed = false;
  private description: string | undefined;
  private customActions?: DeviceAction<any>[];

  // ==================== 公开属性 ====================
  interfaceType: InterfaceType = 'windows';
  uri: string | undefined;
  options: WindowsDeviceOptions;

  constructor(options: WindowsDeviceOptions = {}) {
    this.options = {
      deviceName: options.deviceName || 'Windows Desktop',
      debug: options.debug || false,
      customActions: options.customActions,
      windowHandle: options.windowHandle,
      processId: options.processId,
    };
    this.customActions = options.customActions;
  }

  // ==================== 生命周期方法 ====================

  /**
   * 启动设备连接
   * 实际实现时，这里应该建立与 Windows 系统的连接
   */
  async launch(): Promise<void> {
    if (this.destroyed) {
      throw new Error(
        'WindowsDevice has been destroyed and cannot be launched',
      );
    }

    if (this.options.debug) {
      console.log(`🚀 Windows device launched: ${this.options.deviceName}`);
    }

    // 初始化设备信息
    await this.initializeDeviceInfo();
  }

  /**
   * 初始化设备信息
   */
  private async initializeDeviceInfo(): Promise<void> {
    const size = await this.size();

    this.description = `
Windows Device: ${this.options.deviceName}
Screen Size: ${size.width}x${size.height} (DPR: ${size.dpr || 1})
${this.options.windowHandle ? `Window Handle: ${this.options.windowHandle}` : ''}
${this.options.processId ? `Process ID: ${this.options.processId}` : ''}
Status: Ready
`;

    if (this.options.debug) {
      console.log(this.description);
    }
  }

  /**
   * 销毁设备连接
   */
  async destroy(): Promise<void> {
    if (this.destroyed) {
      return;
    }

    if (this.options.debug) {
      console.log(`🛑 Windows device destroyed: ${this.options.deviceName}`);
    }

    this.destroyed = true;
    this.cachedScreenshot = null;
    this.cachedSize = null;
  }

  // ==================== 设备能力方法 ====================

  /**
   * 定义动作空间 - 设备支持的所有操作
   * 参考 Android 实现，提供完整的操作能力
   */
  actionSpace(): DeviceAction<any>[] {
    const defaultActions: DeviceAction<any>[] = [
      // 点击操作
      defineActionTap(async (param: ActionTapParam) => {
        const element = param.locate;
        assert(element, 'Element not found, cannot tap');
        await this.mouseClick(element.center[0], element.center[1]);
      }),

      // 双击操作
      defineActionDoubleClick(async (param) => {
        const element = param.locate;
        assert(element, 'Element not found, cannot double click');
        await this.mouseDoubleClick(element.center[0], element.center[1]);
      }),

      // 右键点击
      defineActionRightClick(async (param) => {
        const element = param.locate;
        assert(element, 'Element not found, cannot right click');
        await this.mouseRightClick(element.center[0], element.center[1]);
      }),

      // 悬停操作
      defineActionHover(async (param) => {
        const element = param.locate;
        assert(element, 'Element not found, cannot hover');
        await this.mouseHover(element.center[0], element.center[1]);
      }),

      // 输入文本
      defineAction({
        name: 'Input',
        description: 'Type text into an element',
        paramSchema: z.object({
          value: z.string(),
          locate: getMidsceneLocationSchema(),
        }),
        call: async ({ value, locate }: { value: string; locate: any }) => {
          assert(locate, 'Element not found, cannot input');
          // 先点击元素获取焦点
          await this.mouseClick(locate.center[0], locate.center[1]);
          // 等待焦点切换
          await this.sleep(100);
          // 输入文本
          await this.typeText(value);
        },
      }),

      // 键盘按键
      defineActionKeyboardPress(async (param: ActionKeyboardPressParam) => {
        const key = param.keyName;
        await this.keyPress(key);
      }),

      // 滚动操作
      defineActionScroll(async (param) => {
        const { direction, distance } = param;
        const element = param.locate;

        if (element) {
          // 滚动特定元素区域
          await this.scrollAt(
            element.center[0],
            element.center[1],
            direction,
            distance || 100,
          );
        } else {
          // 全局滚动
          await this.scrollGlobal(direction, distance || 100);
        }
      }),

      // 拖放操作
      defineAction({
        name: 'DragAndDrop',
        description: 'Drag an element and drop to target position',
        paramSchema: z.object({
          from: getMidsceneLocationSchema(),
          to: getMidsceneLocationSchema(),
        }),
        call: async ({ from, to }: { from: any; to: any }) => {
          assert(from && to, 'Source and target elements are required');
          await this.dragAndDrop(
            from.center[0],
            from.center[1],
            to.center[0],
            to.center[1],
          );
        },
      }),
    ];

    // 合并自定义动作
    return this.customActions
      ? [...defaultActions, ...this.customActions]
      : defaultActions;
  }

  /**
   * 获取设备描述信息
   */
  describe(): string {
    return this.description || `Windows Device - ${this.options.deviceName}`;
  }

  /**
   * 获取屏幕尺寸
   */
  async size(): Promise<Size> {
    this.assertNotDestroyed();

    if (!this.cachedSize) {
      // 使用 robotjs 获取真实的屏幕尺寸
      const screenInfo = windowsNative.getScreenSize();
      this.cachedSize = {
        width: screenInfo.width,
        height: screenInfo.height,
        dpr: screenInfo.dpr,
      };

      if (this.options.debug) {
        console.log(
          `📐 Windows device size: ${this.cachedSize.width}x${this.cachedSize.height} (dpr: ${this.cachedSize.dpr})`,
        );
      }
    }
    return this.cachedSize;
  }

  /**
   * 获取屏幕截图（Base64 格式）
   */
  async screenshotBase64(): Promise<string> {
    this.assertNotDestroyed();

    // 使用 robotjs 捕获真实的屏幕截图
    this.cachedScreenshot = windowsNative.captureScreen();

    if (this.options.debug) {
      console.log('📸 Screenshot captured');
    }

    return this.cachedScreenshot;
  }

  // ==================== 鼠标操作方法 ====================

  /**
   * 鼠标单击
   */
  private async mouseClick(x: number, y: number): Promise<void> {
    this.assertNotDestroyed();

    if (this.options.debug) {
      console.log(`🖱️ Mouse click at (${x}, ${y})`);
    }

    windowsNative.mouseClick(x, y);
  }

  /**
   * 鼠标双击
   */
  private async mouseDoubleClick(x: number, y: number): Promise<void> {
    this.assertNotDestroyed();

    if (this.options.debug) {
      console.log(`🖱️ Mouse double click at (${x}, ${y})`);
    }

    windowsNative.mouseDoubleClick(x, y);
  }

  /**
   * 鼠标右键点击
   */
  private async mouseRightClick(x: number, y: number): Promise<void> {
    this.assertNotDestroyed();

    if (this.options.debug) {
      console.log(`🖱️ Mouse right click at (${x}, ${y})`);
    }

    windowsNative.mouseRightClick(x, y);
  }

  /**
   * 鼠标悬停
   */
  private async mouseHover(x: number, y: number): Promise<void> {
    this.assertNotDestroyed();

    if (this.options.debug) {
      console.log(`🖱️ Mouse hover at (${x}, ${y})`);
    }

    windowsNative.mouseHover(x, y);
  }

  /**
   * 拖放操作
   */
  private async dragAndDrop(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
  ): Promise<void> {
    this.assertNotDestroyed();

    if (this.options.debug) {
      console.log(`🖱️ Drag from (${fromX}, ${fromY}) to (${toX}, ${toY})`);
    }

    windowsNative.dragAndDrop(fromX, fromY, toX, toY);
  }

  // ==================== 键盘操作方法 ====================

  /**
   * 输入文本
   */
  private async typeText(text: string): Promise<void> {
    this.assertNotDestroyed();

    if (this.options.debug) {
      console.log(`⌨️ Type text: "${text}"`);
    }

    windowsNative.typeText(text);
  }

  /**
   * 按键操作
   */
  private async keyPress(key: string): Promise<void> {
    this.assertNotDestroyed();

    if (this.options.debug) {
      console.log(`⌨️ Press key: ${key}`);
    }

    windowsNative.keyPress(key);
  }

  // ==================== 滚动操作方法 ====================

  /**
   * 在指定位置滚动
   */
  private async scrollAt(
    x: number,
    y: number,
    direction: 'up' | 'down' | 'left' | 'right',
    distance: number,
  ): Promise<void> {
    this.assertNotDestroyed();

    if (this.options.debug) {
      console.log(`🔄 Scroll ${direction} at (${x}, ${y}) by ${distance}px`);
    }

    windowsNative.scrollAt(x, y, direction, distance);
  }

  /**
   * 全局滚动
   */
  private async scrollGlobal(
    direction: 'up' | 'down' | 'left' | 'right',
    distance: number,
  ): Promise<void> {
    this.assertNotDestroyed();

    if (this.options.debug) {
      console.log(`🔄 Global scroll ${direction} by ${distance}px`);
    }

    windowsNative.scrollGlobal(direction, distance);
  }

  // ==================== 工具方法 ====================

  /**
   * 睡眠等待
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 断言设备未销毁
   */
  private assertNotDestroyed(): void {
    if (this.destroyed) {
      throw new Error(
        `WindowsDevice ${this.options.deviceName} has been destroyed and cannot execute operations`,
      );
    }
  }

  // ==================== 高级功能（可选实现） ====================

  /**
   * 获取窗口列表
   * 注意：需要安装 node-window-manager 才能使用此功能
   */
  async getWindowList(): Promise<
    Array<{
      handle: string;
      title: string;
      processId: number;
      isActive: boolean;
    }>
  > {
    this.assertNotDestroyed();

    if (this.options.debug) {
      console.log('🪟 Get window list');
    }

    // TODO: 需要安装并集成 node-window-manager
    // const { windowManager } = require('node-window-manager');
    // const windows = windowManager.getWindows();
    // return windows.map(w => ({
    //   handle: w.getHWND().toString(),
    //   title: w.getTitle(),
    //   processId: w.processId,
    //   isActive: w === windowManager.getActiveWindow()
    // }));

    console.warn(
      '⚠️ getWindowList not implemented yet, requires node-window-manager',
    );
    return [];
  }

  /**
   * 激活指定窗口
   * 注意：需要安装 node-window-manager 才能使用此功能
   */
  async activateWindow(windowHandle: string): Promise<void> {
    this.assertNotDestroyed();

    if (this.options.debug) {
      console.log(`🪟 Activate window: ${windowHandle}`);
    }

    // TODO: 需要安装并集成 node-window-manager
    // const { windowManager } = require('node-window-manager');
    // const windows = windowManager.getWindows();
    // const targetWindow = windows.find(w => w.getHWND().toString() === windowHandle);
    // if (targetWindow) {
    //   targetWindow.bringToTop();
    // }

    console.warn(
      '⚠️ activateWindow not implemented yet, requires node-window-manager',
    );
  }

  /**
   * 获取剪贴板内容
   */
  async getClipboard(): Promise<string> {
    this.assertNotDestroyed();

    if (this.options.debug) {
      console.log('📋 Get clipboard');
    }

    return windowsNative.getClipboard();
  }

  /**
   * 设置剪贴板内容
   */
  async setClipboard(text: string): Promise<void> {
    this.assertNotDestroyed();

    if (this.options.debug) {
      console.log(`📋 Set clipboard: "${text}"`);
    }

    windowsNative.setClipboard(text);
  }
}
