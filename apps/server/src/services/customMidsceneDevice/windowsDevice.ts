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
  type ActionInputParam,
  type ActionKeyboardPressParam,
  type ActionTapParam,
  defineAction,
  defineActionDoubleClick,
  defineActionHover,
  defineActionInput,
  defineActionKeyboardPress,
  defineActionRightClick,
  defineActionScroll,
  defineActionTap,
} from '@midscene/core/device';
import sharp from 'sharp';
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
  /** 截图配置 */
  screenshot?: {
    /** 截图格式：'png' | 'jpeg'，默认 'jpeg' */
    format?: 'png' | 'jpeg';
    /** JPEG 质量 (1-100)，仅当 format 为 'jpeg' 时有效，默认 90 */
    quality?: number;
    /** 截图模式：'screen'（全屏） | 'window'（窗口），默认 'screen' */
    mode?: 'screen' | 'window';
    /** 当 mode 为 'window' 时，指定窗口 ID */
    windowId?: number;
    /** 当 mode 为 'window' 时，可以通过窗口标题匹配（支持部分匹配） */
    windowTitle?: string;
  };
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
  private isLaunched = false;
  private description: string | undefined;
  private customActions?: DeviceAction<any>[];

  // 当前连接的窗口信息（持久化模式）
  private connectedWindow: {
    id: number;
    title: string;
    x: number; // 窗口在屏幕上的 X 坐标（用于坐标转换）
    y: number; // 窗口在屏幕上的 Y 坐标（用于坐标转换）
    width: number; // 窗口物理宽度（来自 node-screenshots）
    height: number; // 窗口物理高度（来自 node-screenshots）
    logicalWidth?: number; // 窗口逻辑宽度（计算得出）
    logicalHeight?: number; // 窗口逻辑高度（计算得出）
  } | null = null;

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

    if (this.isLaunched) {
      if (this.options.debug) {
        console.log('⚠️ WindowsDevice already launched, skipping');
      }
      return;
    }

    if (this.options.debug) {
      console.log(`🚀 Windows device launched: ${this.options.deviceName}`);
    }

    // 设置启动状态，必须在 initializeDeviceInfo 之前
    // 因为 initializeDeviceInfo 会调用 size() 等方法，这些方法需要检查 isLaunched 状态
    this.isLaunched = true;

    // 初始化设备信息
    await this.initializeDeviceInfo();
  }

  /**
   * 初始化设备信息
   */
  private async initializeDeviceInfo(): Promise<void> {
    console.log('[WindowsDevice] 开始初始化设备信息...');

    // 清除可能存在的旧缓存
    this.cachedSize = null;
    windowsNative.clearScreenInfoCache();

    console.log('[WindowsDevice] 缓存已清除，准备获取屏幕尺寸...');

    // 添加延迟确保缓存清除生效
    await new Promise((resolve) => setTimeout(resolve, 100));

    const size = await this.size();

    console.log('[WindowsDevice] 屏幕尺寸获取完成:', size);

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
    this.isLaunched = false;
    this.cachedScreenshot = null;
    this.cachedSize = null;
  }

  /**
   * 检查设备状态
   * 统一的状态检查点，在所有操作方法前调用
   */
  private checkState(): void {
    if (this.destroyed) {
      throw new Error(
        `WindowsDevice "${this.options.deviceName}" has been destroyed and cannot execute operations`,
      );
    }
    if (!this.isLaunched) {
      throw new Error(
        `WindowsDevice "${this.options.deviceName}" not launched. Call launch() first.`,
      );
    }
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
      defineActionInput(async (param: ActionInputParam) => {
        const element = param.locate;
        assert(element, 'Element not found, cannot input');

        // 先点击元素获取焦点
        await this.mouseClick(element.center[0], element.center[1]);

        // 等待焦点切换（增加延迟以适应慢速 UI 和高 DPI 环境）
        await this.sleep(250);

        // 清除原有内容：全选（Ctrl+A）
        await this.keyPress('Control+a');
        await this.sleep(50);

        // 输入文本（会自动覆盖选中的内容）
        await this.typeText(param.value);
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

        // direction 默认为 'down'
        const scrollDirection = direction || 'down';

        if (element) {
          // 滚动特定元素区域
          await this.scrollAt(
            element.center[0],
            element.center[1],
            scrollDirection,
            distance || 100,
          );
        } else {
          // 全局滚动
          await this.scrollGlobal(scrollDirection, distance || 100);
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

    // ⚠️ 关键修复：窗口模式下应该返回窗口尺寸，而不是全屏尺寸
    //
    // 问题：
    // - 在窗口模式下，screenshotBase64() 已经设置了 cachedSize = 窗口尺寸
    // - 但 size() 方法总是重新获取全屏尺寸，覆盖了窗口尺寸
    // - 导致传给 AI 的 size 和实际截图尺寸不一致！
    //
    // 调用流程：
    // 1. commonContextParser() 调用 screenshotBase64() → 设置 cachedSize = 窗口尺寸
    // 2. commonContextParser() 调用 size() → 如果重新获取全屏，会覆盖窗口尺寸
    // 3. AI 收到的：size = 全屏尺寸，但 screenshot = 窗口截图 → 坐标系统错乱！
    //
    // 解决：
    // - 如果已连接到窗口且 cachedSize 已设置（由 screenshotBase64() 设置），直接返回
    // - 否则，返回全屏尺寸

    // 窗口模式：使用已设置的窗口尺寸（在 screenshotBase64() 中设置）
    // 注意：如果 size() 在 screenshotBase64() 之前调用，cachedSize 可能未设置
    // 此时使用 window.width/height（可能是物理尺寸），并尝试获取全屏 DPR 来计算逻辑尺寸
    if (this.connectedWindow) {
      if (this.cachedSize) {
        // 已有缓存的窗口尺寸（由 screenshotBase64() 设置，包含正确的 DPR）
        if (this.options.debug) {
          console.log(
            `📐 Windows device size (窗口模式): ${this.cachedSize.width}x${this.cachedSize.height} (dpr: ${this.cachedSize.dpr})`,
          );
          console.log(`   窗口: "${this.connectedWindow.title}"`);
        }
        return this.cachedSize;
      } else {
        // 未缓存：使用窗口原始尺寸，并尝试获取 DPR
        // 这种情况较少见（size() 在 screenshotBase64() 之前调用）
        const screenInfo = await windowsNative.getScreenSizeAsync();
        const windowDpr = screenInfo.dpr; // 使用全屏 DPR（通常相同）

        // 假设 window.width 是物理尺寸，计算逻辑尺寸
        // 但这里传给 AI 的应该是物理尺寸（与截图一致），所以直接用 window.width
        const windowSize = {
          width: this.connectedWindow.width,
          height: this.connectedWindow.height,
          dpr: windowDpr,
        };

        if (this.options.debug) {
          console.log(
            `📐 Windows device size (窗口模式，未缓存): ${windowSize.width}x${windowSize.height} (dpr: ${windowSize.dpr})`,
          );
          console.log(
            `   窗口: "${this.connectedWindow.title}" (注意：size() 在 screenshotBase64() 之前调用)`,
          );
        }

        // 缓存以便后续使用
        this.cachedSize = windowSize;
        return windowSize;
      }
    }

    // 全屏模式：获取全屏尺寸
    const screenInfo = await windowsNative.getScreenSizeAsync();
    this.cachedSize = {
      width: screenInfo.width,
      height: screenInfo.height,
      dpr: screenInfo.dpr,
    };

    if (this.options.debug) {
      console.log(
        `📐 Windows device size (全屏模式): ${this.cachedSize.width}x${this.cachedSize.height} (dpr: ${this.cachedSize.dpr})`,
      );
    }

    return this.cachedSize;
  }

  /**
   * 获取屏幕截图（Base64 格式）
   */
  async screenshotBase64(): Promise<string> {
    try {
      this.assertNotDestroyed();

      // 准备截图配置
      const screenshotOptions = {
        format: this.options.screenshot?.format || 'jpeg',
        quality: this.options.screenshot?.quality || 90,
      };

      // 如果已连接到特定窗口，自动使用窗口截图模式
      if (this.connectedWindow) {
        if (this.options.debug) {
          console.log(
            `📸 使用连接的窗口截图: "${this.connectedWindow.title}" (ID: ${this.connectedWindow.id}, 位置: ${this.connectedWindow.x}, ${this.connectedWindow.y})`,
          );
        }
        this.cachedScreenshot = await windowsNative.captureWindowAsync(
          this.connectedWindow.id,
          screenshotOptions,
        );

        // ⚠️ 关键修复：检测窗口 DPR
        //
        // 问题分析：
        // - node-screenshots 返回的 window.width/height 可能是物理尺寸（与 monitor.width 一致）
        // - 而不是逻辑尺寸
        // - 如果直接比较 window.width 和截图尺寸，可能永远一致（都是物理尺寸）
        //
        // 解决方案：
        // - 获取全屏 DPR（因为窗口和全屏使用同一个显示器，DPR 相同）
        // - 计算窗口逻辑尺寸 = window.width / screenDpr
        // - 如果截图尺寸 = window.width（物理），且 screenDpr > 1，说明需要转换

        let windowDpr = 1;
        let windowLogicalWidth = this.connectedWindow.width;
        let windowLogicalHeight = this.connectedWindow.height;
        let actualWidth = this.connectedWindow.width;
        let actualHeight = this.connectedWindow.height;

        try {
          // 1. 获取全屏 DPR（窗口和全屏使用同一个显示器，DPR 相同）
          const screenInfo = await windowsNative.getScreenSizeAsync();
          const screenDpr = screenInfo.dpr;

          // 2. 解析截图实际尺寸（应该是物理尺寸）
          const base64Data = this.cachedScreenshot.replace(
            /^data:image\/\w+;base64,/,
            '',
          );
          const buffer = Buffer.from(base64Data, 'base64');
          const metadata = await sharp(buffer).metadata();

          const screenshotWidth = metadata.width || this.connectedWindow.width;
          const screenshotHeight =
            metadata.height || this.connectedWindow.height;

          // 3. 判断 node-screenshots window.width 的含义
          //
          // 情况 A：window.width 是物理尺寸
          // - 如果 screenshotWidth ≈ window.width，说明都是物理尺寸
          // - 窗口逻辑尺寸 = window.width / screenDpr
          // - windowDpr = screenDpr
          //
          // 情况 B：window.width 是逻辑尺寸（不太可能，因为与 monitor.width 行为一致）
          // - 如果 screenshotWidth > window.width，说明截图是物理尺寸
          // - windowDpr = screenshotWidth / window.width

          if (Math.abs(screenshotWidth - this.connectedWindow.width) < 5) {
            // 截图尺寸 ≈ window.width，说明 window.width 是物理尺寸
            windowDpr = screenDpr;
            windowLogicalWidth = this.connectedWindow.width / screenDpr;
            windowLogicalHeight = this.connectedWindow.height / screenDpr;
            actualWidth = screenshotWidth; // 物理尺寸
            actualHeight = screenshotHeight;

            if (this.options.debug && Math.abs(screenDpr - 1.0) > 0.01) {
              console.log(`⚠️ window.width 是物理尺寸，需要转换为逻辑尺寸`);
              console.log(
                `   窗口物理尺寸: ${this.connectedWindow.width}x${this.connectedWindow.height}`,
              );
              console.log(
                `   窗口逻辑尺寸: ${windowLogicalWidth.toFixed(0)}x${windowLogicalHeight.toFixed(0)} (÷ ${screenDpr.toFixed(4)})`,
              );
              console.log(
                `   截图实际尺寸: ${screenshotWidth}x${screenshotHeight}`,
              );
              console.log(
                `   窗口 DPR: ${windowDpr.toFixed(4)} (使用全屏 DPR)`,
              );
            }
          } else if (screenshotWidth > this.connectedWindow.width) {
            // 截图尺寸 > window.width，说明 window.width 是逻辑尺寸，截图是物理尺寸
            windowDpr = screenshotWidth / this.connectedWindow.width;
            windowLogicalWidth = this.connectedWindow.width;
            windowLogicalHeight = this.connectedWindow.height;
            actualWidth = screenshotWidth;
            actualHeight = screenshotHeight;

            if (this.options.debug) {
              console.log(`⚠️ window.width 是逻辑尺寸，截图是物理尺寸`);
              console.log(
                `   窗口逻辑尺寸: ${this.connectedWindow.width}x${this.connectedWindow.height}`,
              );
              console.log(
                `   截图物理尺寸: ${screenshotWidth}x${screenshotHeight}`,
              );
              console.log(`   计算窗口 DPR: ${windowDpr.toFixed(4)}`);
            }
          } else {
            // 两者接近，可能是同一种坐标系统
            // 使用全屏 DPR 作为参考（因为窗口在同一个显示器上）
            windowDpr = screenDpr;
            windowLogicalWidth = this.connectedWindow.width / screenDpr;
            windowLogicalHeight = this.connectedWindow.height / screenDpr;
            actualWidth = screenshotWidth;
            actualHeight = screenshotHeight;

            if (this.options.debug) {
              console.log(
                `✓ 窗口尺寸与截图尺寸一致，使用全屏 DPR: ${screenDpr.toFixed(4)}`,
              );
              console.log(
                `   窗口逻辑尺寸: ${windowLogicalWidth.toFixed(0)}x${windowLogicalHeight.toFixed(0)}`,
              );
              console.log(
                `   窗口物理尺寸: ${screenshotWidth}x${screenshotHeight}`,
              );
            }
          }
        } catch (parseError) {
          console.warn('⚠️ 无法解析窗口截图尺寸，使用全屏 DPR', parseError);
          // 回退：使用全屏 DPR
          try {
            const screenInfo = await windowsNative.getScreenSizeAsync();
            windowDpr = screenInfo.dpr;
            windowLogicalWidth = this.connectedWindow.width / windowDpr;
            windowLogicalHeight = this.connectedWindow.height / windowDpr;
          } catch {
            windowDpr = 1;
          }
        }

        // 更新缓存尺寸（使用实际截图尺寸和计算的 DPR）
        // AI 看到的截图是物理尺寸，所以 cachedSize.width 应该是物理尺寸
        this.cachedSize = {
          width: actualWidth, // 物理尺寸（截图实际分辨率）
          height: actualHeight,
          dpr: windowDpr,
        };

        // 同时保存窗口逻辑尺寸（用于坐标转换）
        this.connectedWindow.logicalWidth = windowLogicalWidth;
        this.connectedWindow.logicalHeight = windowLogicalHeight;

        if (this.options.debug) {
          console.log(
            `📐 窗口物理尺寸: ${actualWidth}x${actualHeight}, 逻辑尺寸: ${windowLogicalWidth.toFixed(0)}x${windowLogicalHeight.toFixed(0)}, DPR: ${windowDpr.toFixed(4)}`,
          );
        }

        return this.cachedScreenshot;
      }

      const mode = this.options.screenshot?.mode || 'screen';

      // 根据模式选择截图方式
      if (mode === 'window') {
        // 窗口截图模式
        const windowId = this.options.screenshot?.windowId;
        const windowTitle = this.options.screenshot?.windowTitle;

        if (windowId) {
          // 通过窗口 ID 截图
          if (this.options.debug) {
            console.log(`📸 窗口截图 (ID: ${windowId})`);
          }
          this.cachedScreenshot = await windowsNative.captureWindowAsync(
            windowId,
            screenshotOptions,
          );
        } else if (windowTitle) {
          // 通过窗口标题截图
          if (this.options.debug) {
            console.log(`📸 窗口截图 (标题: ${windowTitle})`);
          }
          this.cachedScreenshot = await windowsNative.captureWindowByTitleAsync(
            windowTitle,
            screenshotOptions,
          );
        } else {
          console.warn(
            '⚠️ 窗口截图模式需要指定 windowId 或 windowTitle，回退到全屏截图',
          );
          this.cachedScreenshot =
            await windowsNative.captureScreenAsync(screenshotOptions);
        }
      } else {
        // 全屏截图模式（默认）
        this.cachedScreenshot =
          await windowsNative.captureScreenAsync(screenshotOptions);
      }

      if (this.options.debug) {
        console.log(
          `📸 Screenshot captured (${mode} mode, ${screenshotOptions.format}, quality: ${screenshotOptions.quality})`,
        );
      }

      // 添加调试日志：使用 sharp 解析截图实际尺寸
      try {
        const base64Data = this.cachedScreenshot.replace(
          /^data:image\/\w+;base64,/,
          '',
        );
        const buffer = Buffer.from(base64Data, 'base64');

        // 使用 sharp 获取图片元数据（支持 JPEG、PNG 等多种格式）
        const metadata = await sharp(buffer).metadata();
        const width = metadata.width || 0;
        const height = metadata.height || 0;

        console.log(`[DEBUG] screenshot 实际尺寸: ${width}x${height}`);
        console.log(
          `[DEBUG] cachedSize: ${this.cachedSize?.width}x${this.cachedSize?.height}`,
        );

        // 仅在全屏模式下检查尺寸一致性
        if (mode === 'screen') {
          if (
            this.cachedSize &&
            (width !== this.cachedSize.width ||
              height !== this.cachedSize.height)
          ) {
            console.warn(
              `⚠️ 警告：截图尺寸 (${width}x${height}) 与 size() 返回的尺寸 (${this.cachedSize.width}x${this.cachedSize.height}) 不一致！`,
            );
            // 主动刷新 size，与截图保持一致
            const screenInfo = await windowsNative.getScreenSizeAsync();
            this.cachedSize = {
              width: screenInfo.width,
              height: screenInfo.height,
              dpr: screenInfo.dpr,
            };
            console.log('[DEBUG] size 已按截图刷新为:', this.cachedSize);
          } else {
            console.log('✓ 截图尺寸与 size() 一致');
          }
        } else {
          console.log(`[DEBUG] 窗口模式，截图尺寸: ${width}x${height}`);
        }
      } catch (parseError) {
        console.warn('无法解析截图尺寸:', parseError);
      }

      return this.cachedScreenshot;
    } catch (error) {
      console.error('截图失败:', error);
      throw error;
    }
  }

  // ==================== 坐标转换方法 ====================

  /**
   * 坐标转换：将窗口相对坐标转换为屏幕绝对坐标
   *
   * ⚠️ 关键问题：DPR 坐标系统对齐
   *
   * 问题场景：
   * - 窗口截图实际分辨率可能高于窗口逻辑尺寸（DPI 缩放）
   * - AI 返回的坐标基于截图实际分辨率（物理坐标）
   * - 但 window.x, y 是基于逻辑坐标系统的
   * - 需要在转换时除以窗口 DPR，将物理坐标转为逻辑坐标
   *
   * 示例（窗口 DPR = 1.5）：
   * - 窗口逻辑尺寸：960x540
   * - 截图实际尺寸：1440x810（物理像素）
   * - AI 返回坐标：(720, 405) ← 基于 1440x810
   * - 转换步骤：
   *   1. 物理 → 逻辑：(720/1.5, 405/1.5) = (480, 270)
   *   2. 窗口相对 → 屏幕绝对：(480 + window.x, 270 + window.y)
   *
   * 核心逻辑：
   * - 全屏模式：不需要转换，直接返回原坐标
   * - 窗口模式：物理坐标 → 逻辑坐标 → 屏幕绝对坐标
   *
   * @param x 窗口相对 X 坐标（来自 AI，基于截图实际分辨率）
   * @param y 窗口相对 Y 坐标（来自 AI，基于截图实际分辨率）
   * @returns 屏幕绝对坐标（逻辑坐标系统）
   */
  private transformCoordinates(x: number, y: number): { x: number; y: number } {
    if (!this.connectedWindow) {
      // 全屏模式：不需要转换
      return { x, y };
    }

    // 获取窗口 DPR（如果已计算）
    const windowDpr = this.cachedSize?.dpr || 1;
    const windowPhysicalWidth =
      this.cachedSize?.width || this.connectedWindow.width;
    const windowPhysicalHeight =
      this.cachedSize?.height || this.connectedWindow.height;

    // 边界检测：AI 坐标是基于截图物理分辨率的
    if (x < 0 || y < 0 || x > windowPhysicalWidth || y > windowPhysicalHeight) {
      console.warn(
        `⚠️ 坐标 (${x}, ${y}) 超出窗口物理范围 (${windowPhysicalWidth}x${windowPhysicalHeight})，自动裁剪`,
      );

      // 裁剪到窗口范围内
      x = Math.max(0, Math.min(x, windowPhysicalWidth - 1));
      y = Math.max(0, Math.min(y, windowPhysicalHeight - 1));
    }

    // ⚠️ 关键步骤：将物理坐标转换为逻辑坐标
    // AI 返回的坐标是基于截图实际分辨率的（物理像素）
    // window.x, y 和鼠标操作使用的是逻辑坐标系统
    let logicalX = x;
    let logicalY = y;

    if (Math.abs(windowDpr - 1.0) > 0.01) {
      // 存在 DPI 缩放，需要转换
      logicalX = Math.round(x / windowDpr);
      logicalY = Math.round(y / windowDpr);

      if (this.options.debug) {
        console.log(
          `  物理坐标 (${x}, ${y}) → 逻辑坐标 (${logicalX}, ${logicalY}) [窗口DPR: ${windowDpr.toFixed(4)}]`,
        );
      }
    }

    // ⚠️ 转换为屏幕绝对坐标（逻辑坐标系统）
    // window.x, y 可能是物理坐标或逻辑坐标，需要验证
    // 假设 window.x, y 是逻辑坐标（因为在同一个显示器上，通常与屏幕逻辑坐标系统一致）
    const screenX = logicalX + this.connectedWindow.x;
    const screenY = logicalY + this.connectedWindow.y;

    if (this.options.debug) {
      console.log(
        `🔄 坐标转换: AI物理坐标 (${x}, ${y}) → 窗口逻辑坐标 (${logicalX}, ${logicalY}) → 屏幕绝对坐标 (${screenX}, ${screenY}) [窗口DPR: ${windowDpr.toFixed(4)}]`,
      );
    }

    return { x: screenX, y: screenY };
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

    // 坐标转换
    const transformed = this.transformCoordinates(x, y);

    if (this.options.debug) {
      console.log(
        `🖱️ Mouse click at (${x}, ${y}) → screen (${transformed.x}, ${transformed.y})`,
      );
    }

    // 使用逻辑坐标版本，避免双重 DPR 转换
    // transformCoordinates 已经输出了屏幕逻辑坐标
    await windowsNative.mouseClickAsyncLogical(transformed.x, transformed.y);
  }

  /**
   * 鼠标双击
   */
  private async mouseDoubleClick(x: number, y: number): Promise<void> {
    this.assertNotDestroyed();

    if (this.options.debug) {
      console.log(`🖱️ Mouse double click at (${x}, ${y})`);
    }

    // 坐标转换
    const transformed = this.transformCoordinates(x, y);

    if (this.options.debug) {
      console.log(
        `🖱️ Mouse double click at (${x}, ${y}) → screen (${transformed.x}, ${transformed.y})`,
      );
    }

    // 使用逻辑坐标版本，避免双重 DPR 转换
    await windowsNative.mouseDoubleClickAsyncLogical(
      transformed.x,
      transformed.y,
    );
  }

  /**
   * 鼠标右键点击
   */
  private async mouseRightClick(x: number, y: number): Promise<void> {
    this.assertNotDestroyed();

    if (this.options.debug) {
      console.log(`🖱️ Mouse right click at (${x}, ${y})`);
    }

    // 坐标转换
    const transformed = this.transformCoordinates(x, y);

    if (this.options.debug) {
      console.log(
        `🖱️ Mouse right click at (${x}, ${y}) → screen (${transformed.x}, ${transformed.y})`,
      );
    }

    // 使用逻辑坐标版本，避免双重 DPR 转换
    await windowsNative.mouseRightClickAsyncLogical(
      transformed.x,
      transformed.y,
    );
  }

  /**
   * 鼠标悬停
   */
  private async mouseHover(x: number, y: number): Promise<void> {
    this.assertNotDestroyed();

    if (this.options.debug) {
      console.log(`🖱️ Mouse hover at (${x}, ${y})`);
    }

    // 坐标转换
    const transformed = this.transformCoordinates(x, y);

    if (this.options.debug) {
      console.log(
        `🖱️ Mouse hover at (${x}, ${y}) → screen (${transformed.x}, ${transformed.y})`,
      );
    }

    // 使用逻辑坐标版本，避免双重 DPR 转换
    await windowsNative.moveMouseAsyncLogical(transformed.x, transformed.y);
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

    // 坐标转换：起点和终点都需要转换
    const transformedFrom = this.transformCoordinates(fromX, fromY);
    const transformedTo = this.transformCoordinates(toX, toY);

    if (this.options.debug) {
      console.log(
        `🖱️ Drag from (${fromX}, ${fromY}) → screen (${transformedFrom.x}, ${transformedFrom.y}) to (${toX}, ${toY}) → screen (${transformedTo.x}, ${transformedTo.y})`,
      );
    }

    // 使用逻辑坐标版本，避免双重 DPR 转换
    await windowsNative.dragAndDropAsyncLogical(
      transformedFrom.x,
      transformedFrom.y,
      transformedTo.x,
      transformedTo.y,
    );
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

    await windowsNative.typeTextAsync(text);
  }

  /**
   * 按键操作
   */
  private async keyPress(key: string): Promise<void> {
    this.assertNotDestroyed();

    if (this.options.debug) {
      console.log(`⌨️ Press key: ${key}`);
    }

    await windowsNative.keyPressAsync(key);
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

    // 坐标转换
    const transformed = this.transformCoordinates(x, y);

    if (this.options.debug) {
      console.log(
        `🔄 Scroll ${direction} at (${x}, ${y}) → screen (${transformed.x}, ${transformed.y}) by ${distance}px`,
      );
    }

    // 使用逻辑坐标版本，避免双重 DPR 转换
    await windowsNative.scrollAtAsyncLogical(
      transformed.x,
      transformed.y,
      direction,
      distance,
    );
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

    await windowsNative.scrollGlobalAsync(direction, distance);
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
   * @deprecated 使用 checkState() 代替
   */
  private assertNotDestroyed(): void {
    this.checkState();
  }

  // ==================== 高级功能（可选实现） ====================

  /**
   * 获取窗口列表
   * 使用 node-screenshots 获取所有窗口信息
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
    this.assertNotDestroyed();

    if (this.options.debug) {
      console.log('🪟 Get window list');
    }

    return windowsNative.getAllWindows();
  }

  /**
   * 连接到指定窗口（持久化模式）
   * 连接后，所有截图操作都将针对该窗口
   *
   * @param params.windowId - 窗口 ID（优先）
   * @param params.windowTitle - 窗口标题（其次）
   */
  async connectWindow(params: {
    windowId?: number;
    windowTitle?: string;
  }): Promise<{
    id: number;
    title: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }> {
    this.assertNotDestroyed();

    const { windowId, windowTitle } = params;

    if (!windowId && !windowTitle) {
      throw new Error('必须提供 windowId 或 windowTitle 参数');
    }

    if (this.options.debug) {
      console.log(`🪟 尝试连接窗口: ID=${windowId}, 标题=${windowTitle}`);
    }

    // 获取窗口列表
    const windows = await this.getWindowList();

    console.log('windows 列表: ', windows);
    // 优先通过 ID 查找
    let targetWindow = windowId
      ? windows.find((w) => w.id === windowId)
      : undefined;

    // 如果通过 ID 未找到，尝试通过标题查找
    if (!targetWindow && windowTitle) {
      targetWindow = windows.find((w) =>
        w.title.toLowerCase().includes(windowTitle.toLowerCase()),
      );
    }

    if (!targetWindow) {
      const searchInfo = windowId
        ? `ID: ${windowId}`
        : `标题: "${windowTitle}"`;
      throw new Error(`未找到匹配的窗口 (${searchInfo})`);
    }

    // 检查是否正在切换窗口
    const isSwitching = this.connectedWindow !== null;
    const previousWindow = this.connectedWindow;

    // 保存连接的窗口信息（覆盖旧值，实现窗口切换）
    this.connectedWindow = {
      id: targetWindow.id,
      title: targetWindow.title,
      x: targetWindow.x, // 保存窗口屏幕位置，用于坐标转换
      y: targetWindow.y,
      width: targetWindow.width,
      height: targetWindow.height,
    };

    if (this.options.debug) {
      if (isSwitching) {
        console.log(
          `🔄 切换窗口: "${previousWindow!.title}" (ID: ${previousWindow!.id}) → "${this.connectedWindow.title}" (ID: ${this.connectedWindow.id}, 位置: ${this.connectedWindow.x}, ${this.connectedWindow.y})`,
        );
      } else {
        console.log(
          `✅ 已连接到窗口: "${this.connectedWindow.title}" (ID: ${this.connectedWindow.id}, 位置: ${this.connectedWindow.x}, ${this.connectedWindow.y}, 尺寸: ${this.connectedWindow.width}x${this.connectedWindow.height})`,
        );
      }
    }

    return this.connectedWindow;
  }

  /**
   * 断开窗口连接，恢复全屏模式
   */
  disconnectWindow(): void {
    if (this.connectedWindow && this.options.debug) {
      console.log(
        `🔌 断开窗口连接: "${this.connectedWindow.title}" (ID: ${this.connectedWindow.id})`,
      );
    }
    this.connectedWindow = null;
  }

  /**
   * 获取当前连接的窗口信息
   */
  getConnectedWindow(): {
    id: number;
    title: string;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null {
    return this.connectedWindow;
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
