/**
 * WindowsDeviceProxy - Windows 设备代理
 *
 * 实现 AbstractInterface 接口，通过 WebSocket 与 Windows 客户端通信
 * 将所有操作转发给真实的 Windows 客户端执行
 */

import assert from 'node:assert';
import type { DeviceAction, InterfaceType, Size } from '@midscene/core';
import { getMidsceneLocationSchema, z } from '@midscene/core';
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
import type {
  ActivateWindowParams,
  KeyPressParams,
  MouseClickParams,
  MouseDragParams,
  ScrollParams,
  SetClipboardParams,
  TypeTextParams,
  WindowInfo,
} from '../../types/windowsProtocol';
import { serviceLogger } from '../../utils/logger';
import type { WindowsClientConnectionManager } from '../windowsClientConnectionManager';

/**
 * WindowsDeviceProxy 配置选项
 */
export interface WindowsDeviceProxyOptions {
  /** 指定客户端ID，如果不指定则自动选择 */
  clientId?: string;
  /** 设备名称 */
  deviceName?: string;
  /** 是否启用调试 */
  debug?: boolean;
  /** 自定义动作 */
  customActions?: DeviceAction<any>[];
  /** 请求超时时间（ms） */
  requestTimeout?: number;
}

/**
 * WindowsDeviceProxy
 *
 * 通过 WebSocket 代理所有 Windows 操作
 */
export default class WindowsDeviceProxy implements AbstractInterface {
  // ==================== 公开属性 ====================
  interfaceType: InterfaceType = 'windows';
  uri: string | undefined;
  options: WindowsDeviceProxyOptions;

  // ==================== 私有属性 ====================
  private connectionManager: WindowsClientConnectionManager;
  private destroyed = false;
  private description: string | undefined;
  private customActions?: DeviceAction<any>[];
  private cachedSize: Size | null = null;

  constructor(
    connectionManager: WindowsClientConnectionManager,
    options: WindowsDeviceProxyOptions = {},
  ) {
    this.connectionManager = connectionManager;
    this.options = {
      deviceName: options.deviceName || 'Windows Device Proxy',
      debug: options.debug || false,
      clientId: options.clientId,
      customActions: options.customActions,
      requestTimeout: options.requestTimeout || 10000,
    };
    this.customActions = options.customActions;
  }

  // ==================== 生命周期方法 ====================

  /**
   * 启动设备
   */
  async launch(): Promise<void> {
    this.assertNotDestroyed();

    // 检查是否有可用客户端
    const client = this.getClient();

    this.description = `
Windows Device Proxy: ${this.options.deviceName}
Client ID: ${client.id}
Machine: ${client.metadata.machineName}
OS: ${client.metadata.os}
Capabilities: ${client.metadata.capabilities.join(', ')}
Status: Ready
`;

    if (this.options.debug) {
      console.log(this.description);
    }

    serviceLogger.info(
      {
        deviceName: this.options.deviceName,
        clientId: client.id,
      },
      'WindowsDeviceProxy 已启动',
    );
  }

  /**
   * 销毁设备
   */
  async destroy(): Promise<void> {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.cachedSize = null;

    if (this.options.debug) {
      console.log(
        `🛑 WindowsDeviceProxy destroyed: ${this.options.deviceName}`,
      );
    }

    serviceLogger.info(
      { deviceName: this.options.deviceName },
      'WindowsDeviceProxy 已销毁',
    );
  }

  // ==================== 设备能力方法 ====================

  /**
   * 定义动作空间
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

          // 等待焦点切换（增加延迟以适应慢速 UI 和高 DPI 环境）
          await this.sleep(250);

          // 清除原有内容：全选（Ctrl+A）
          await this.keyPress('Control+a');
          await this.sleep(50);

          // 输入文本（会自动覆盖选中的内容）
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

        const scrollParams: ScrollParams = {
          direction,
          distance: distance || 100,
        };

        if (element) {
          scrollParams.x = element.center[0];
          scrollParams.y = element.center[1];
        }

        await this.scroll(scrollParams);
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
   * 获取设备描述
   */
  describe(): string {
    return (
      this.description || `Windows Device Proxy - ${this.options.deviceName}`
    );
  }

  /**
   * 获取屏幕尺寸
   */
  async size(): Promise<Size> {
    this.assertNotDestroyed();

    // 使用缓存避免频繁请求
    if (this.cachedSize) {
      return this.cachedSize;
    }

    const client = this.getClient();
    const size = await this.connectionManager.sendRequest<Size>(
      client.id,
      'getScreenSize',
      {},
      this.options.requestTimeout,
    );

    this.cachedSize = size;

    if (this.options.debug) {
      console.log(
        `📐 Windows device size: ${size.width}x${size.height} (dpr: ${size.dpr || 1})`,
      );
    }

    return size;
  }

  /**
   * 获取屏幕截图
   */
  async screenshotBase64(): Promise<string> {
    this.assertNotDestroyed();

    const client = this.getClient();
    const screenshot = await this.connectionManager.sendRequest<string>(
      client.id,
      'screenshot',
      {},
      this.options.requestTimeout,
    );

    if (this.options.debug) {
      console.log('📸 Screenshot captured via proxy');
    }

    return screenshot;
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

    const client = this.getClient();
    const params: MouseClickParams = { x, y };

    await this.connectionManager.sendRequest(
      client.id,
      'mouseClick',
      params,
      this.options.requestTimeout,
    );
  }

  /**
   * 鼠标双击
   */
  private async mouseDoubleClick(x: number, y: number): Promise<void> {
    this.assertNotDestroyed();

    if (this.options.debug) {
      console.log(`🖱️ Mouse double click at (${x}, ${y})`);
    }

    const client = this.getClient();
    const params: MouseClickParams = { x, y };

    await this.connectionManager.sendRequest(
      client.id,
      'mouseDoubleClick',
      params,
      this.options.requestTimeout,
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

    const client = this.getClient();
    const params: MouseClickParams = { x, y };

    await this.connectionManager.sendRequest(
      client.id,
      'mouseRightClick',
      params,
      this.options.requestTimeout,
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

    const client = this.getClient();
    const params: MouseClickParams = { x, y };

    await this.connectionManager.sendRequest(
      client.id,
      'mouseHover',
      params,
      this.options.requestTimeout,
    );
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

    const client = this.getClient();
    const params: MouseDragParams = { fromX, fromY, toX, toY };

    await this.connectionManager.sendRequest(
      client.id,
      'mouseDrag',
      params,
      this.options.requestTimeout,
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

    const client = this.getClient();
    const params: TypeTextParams = { text };

    await this.connectionManager.sendRequest(
      client.id,
      'typeText',
      params,
      this.options.requestTimeout,
    );
  }

  /**
   * 按键操作
   */
  private async keyPress(key: string, modifiers?: string[]): Promise<void> {
    this.assertNotDestroyed();

    if (this.options.debug) {
      console.log(
        `⌨️ Press key: ${key}${modifiers ? ` (${modifiers.join('+')})` : ''}`,
      );
    }

    const client = this.getClient();
    const params: KeyPressParams = { key, modifiers };

    await this.connectionManager.sendRequest(
      client.id,
      'keyPress',
      params,
      this.options.requestTimeout,
    );
  }

  // ==================== 滚动操作方法 ====================

  /**
   * 滚动操作
   */
  private async scroll(params: ScrollParams): Promise<void> {
    this.assertNotDestroyed();

    if (this.options.debug) {
      console.log(
        `🔄 Scroll ${params.direction} by ${params.distance}px${
          params.x && params.y ? ` at (${params.x}, ${params.y})` : ''
        }`,
      );
    }

    const client = this.getClient();

    await this.connectionManager.sendRequest(
      client.id,
      'scroll',
      params,
      this.options.requestTimeout,
    );
  }

  // ==================== 窗口管理方法 ====================

  /**
   * 获取窗口列表
   */
  async getWindowList(): Promise<WindowInfo[]> {
    this.assertNotDestroyed();

    const client = this.getClient();
    const windows = await this.connectionManager.sendRequest<WindowInfo[]>(
      client.id,
      'getWindowList',
      {},
      this.options.requestTimeout,
    );

    if (this.options.debug) {
      console.log(`🪟 Found ${windows.length} windows`);
    }

    return windows;
  }

  /**
   * 激活指定窗口
   */
  async activateWindow(windowHandle: string): Promise<void> {
    this.assertNotDestroyed();

    if (this.options.debug) {
      console.log(`🪟 Activate window: ${windowHandle}`);
    }

    const client = this.getClient();
    const params: ActivateWindowParams = { windowHandle };

    await this.connectionManager.sendRequest(
      client.id,
      'activateWindow',
      params,
      this.options.requestTimeout,
    );
  }

  // ==================== 剪贴板方法 ====================

  /**
   * 获取剪贴板内容
   */
  async getClipboard(): Promise<string> {
    this.assertNotDestroyed();

    const client = this.getClient();
    const text = await this.connectionManager.sendRequest<string>(
      client.id,
      'getClipboard',
      {},
      this.options.requestTimeout,
    );

    if (this.options.debug) {
      console.log(`📋 Get clipboard: "${text}"`);
    }

    return text;
  }

  /**
   * 设置剪贴板内容
   */
  async setClipboard(text: string): Promise<void> {
    this.assertNotDestroyed();

    if (this.options.debug) {
      console.log(`📋 Set clipboard: "${text}"`);
    }

    const client = this.getClient();
    const params: SetClipboardParams = { text };

    await this.connectionManager.sendRequest(
      client.id,
      'setClipboard',
      params,
      this.options.requestTimeout,
    );
  }

  // ==================== 工具方法 ====================

  /**
   * 睡眠等待
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 获取客户端连接
   */
  private getClient() {
    if (this.options.clientId) {
      const client = this.connectionManager.getClient(this.options.clientId);
      if (!client) {
        throw new Error(`指定的客户端不存在: ${this.options.clientId}`);
      }
      return client;
    } else {
      // 自动选择可用客户端
      return this.connectionManager.selectClient();
    }
  }

  /**
   * 断言设备未销毁
   */
  private assertNotDestroyed(): void {
    if (this.destroyed) {
      throw new Error(
        `WindowsDeviceProxy ${this.options.deviceName} has been destroyed and cannot execute operations`,
      );
    }
  }
}
