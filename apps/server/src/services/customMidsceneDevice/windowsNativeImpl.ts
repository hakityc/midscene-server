/**
 * Windows 底层实现 - 使用 @nut-tree/nut-js
 *
 * 实现 WINDOWS_IMPLEMENTATION_API.md 中定义的所有底层接口
 *
 * nut-js 相比 robotjs 的优势：
 * - 跨平台支持更好（包括 Apple Silicon）
 * - API 更现代，使用 Promise
 * - 更好的错误处理
 * - 活跃维护
 */

import { readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import {
  Button,
  FileType,
  Key,
  keyboard,
  mouse,
  Point,
  screen,
} from '@nut-tree/nut-js';
import sharp from 'sharp';

/**
 * 屏幕信息接口
 */
export interface ScreenInfo {
  width: number;
  height: number;
  dpr: number;
}

/**
 * 截图选项接口
 */
export interface ScreenshotOptions {
  /** 截图格式：'png' | 'jpeg'，默认 'jpeg' */
  format?: 'png' | 'jpeg';
  /** JPEG 质量 (1-100)，仅当 format 为 'jpeg' 时有效，默认 90 */
  quality?: number;
}

/**
 * Windows 原生操作实现类
 */
export class WindowsNativeImpl {
  private static instance: WindowsNativeImpl;
  private cachedScreenInfo: ScreenInfo | null = null;

  private constructor() {
    // 初始化 nut-js 配置
    // 设置鼠标移动速度（像素/秒）
    mouse.config.mouseSpeed = 1000;

    // 设置自动延迟，确保操作的准确性
    mouse.config.autoDelayMs = 100;
    keyboard.config.autoDelayMs = 50;
  }

  /**
   * 获取单例实例
   */
  static getInstance(): WindowsNativeImpl {
    if (!WindowsNativeImpl.instance) {
      WindowsNativeImpl.instance = new WindowsNativeImpl();
    }
    return WindowsNativeImpl.instance;
  }

  // ==================== 1. 屏幕信息获取 ====================

  /**
   * 获取屏幕尺寸
   * 实现 API 文档 1.1
   *
   * 修复 DPI 缩放问题：
   * - 通过比较截图分辨率和逻辑分辨率来计算真实 DPR
   * - 返回物理分辨率（截图的分辨率）
   * - AI 会基于物理分辨率返回坐标
   */
  getScreenSize(): ScreenInfo {
    // 使用缓存避免频繁计算
    if (this.cachedScreenInfo) {
      console.log('[WindowsNative] 使用缓存的屏幕信息:', this.cachedScreenInfo);
      return this.cachedScreenInfo;
    }

    console.log('[WindowsNative] 开始检测屏幕信息...');

    // nut-js 的 screen.width/height 是异步的
    // 使用同步包装
    const result = this.runSync(async () => {
      const logicalWidth = await screen.width();
      const logicalHeight = await screen.height();

      console.log(
        `[WindowsNative] 逻辑分辨率检测: ${logicalWidth}x${logicalHeight}`,
      );

      // 通过临时截图获取物理分辨率
      // screen.grab() 返回的图片尺寸是实际的物理分辨率
      console.log('[WindowsNative] 正在捕获截图以检测物理分辨率...');
      const screenshot = await screen.grab();
      const physicalWidth = screenshot.width;
      const physicalHeight = screenshot.height;

      console.log(
        `[WindowsNative] 物理分辨率检测: ${physicalWidth}x${physicalHeight}`,
      );

      // 计算 DPR (Device Pixel Ratio)
      const dpr = physicalWidth / logicalWidth;

      console.log('[WindowsNative] 屏幕信息检测:');
      console.log(`  逻辑分辨率: ${logicalWidth}x${logicalHeight}`);
      console.log(`  物理分辨率: ${physicalWidth}x${physicalHeight}`);
      console.log(`  DPR: ${dpr.toFixed(4)}`);

      if (Math.abs(dpr - 1.0) > 0.01) {
        console.log(`  ⚠️ 检测到 DPI 缩放: ${Math.round(dpr * 100)}%`);
        console.log(`  坐标转换已启用: 物理坐标 → 逻辑坐标`);
      }

      return {
        width: physicalWidth, // 返回物理分辨率（截图分辨率）
        height: physicalHeight,
        dpr,
      };
    });

    if (!result) {
      console.error('[WindowsNative] ❌ 检测失败，使用默认值');
      this.cachedScreenInfo = { width: 1920, height: 1080, dpr: 1 };
    } else {
      console.log('[WindowsNative] ✅ 检测成功，缓存结果:', result);
      this.cachedScreenInfo = result;
    }

    return this.cachedScreenInfo;
  }

  /**
   * 异步：获取屏幕尺寸（首选）
   * - 纯异步实现，避免 runSync 超时与错误回退缓存
   */
  async getScreenSizeAsync(): Promise<ScreenInfo> {
    if (this.cachedScreenInfo) {
      return this.cachedScreenInfo;
    }

    // 逻辑分辨率
    const logicalWidth = await screen.width();
    const logicalHeight = await screen.height();
    console.log(
      `[WindowsNative] Async 逻辑分辨率: ${logicalWidth}x${logicalHeight}`,
    );

    // 物理分辨率（通过抓图）
    const shot = await screen.grab();
    const physicalWidth = shot.width;
    const physicalHeight = shot.height;
    console.log(
      `[WindowsNative] Async 物理分辨率: ${physicalWidth}x${physicalHeight}`,
    );

    const dpr = physicalWidth / logicalWidth; // logicalHeight reserved for completeness

    const result: ScreenInfo = {
      width: physicalWidth,
      height: physicalHeight,
      dpr,
    };

    this.cachedScreenInfo = result;
    return result;
  }

  /**
   * 清除屏幕信息缓存
   * 当系统分辨率或缩放比例改变时调用
   */
  clearScreenInfoCache(): void {
    this.cachedScreenInfo = null;
    console.log('[WindowsNative] 屏幕信息缓存已清除');
  }

  /**
   * 获取屏幕截图
   * 实现 API 文档 1.2
   *
   * @returns Base64 编码的 PNG 图片
   */
  captureScreen(): string {
    try {
      // 同步接口已废弃，内部改为调用异步并抛弃返回
      console.warn(
        '[WindowsNative] captureScreen 同步接口已废弃，请使用 captureScreenAsync()',
      );
      return '';
    } catch (error) {
      console.error('截图失败:', error);
      throw error;
    }
  }

  /**
   * 获取屏幕截图（异步版本 - 推荐使用）
   * @param options 截图选项
   */
  async captureScreenAsync(options?: ScreenshotOptions): Promise<string> {
    try {
      // 默认配置：JPEG 格式，质量 90（与 web 版本对齐）
      const format = options?.format || 'jpeg';
      const quality = options?.quality || 90;

      const startTime = Date.now();
      console.log(
        `[WindowsNative] 开始截图 (格式: ${format}, 质量: ${quality})`,
      );

      // 使用临时文件来保存截图
      const tempFileName = `screenshot_${Date.now()}`;
      const tempFilePath = tmpdir();

      // 1. 先用 PNG 格式截图（最高质量，无损）
      const savedPath = await screen.capture(
        tempFileName,
        FileType.PNG,
        tempFilePath,
      );

      // 2. 读取 PNG 文件
      let buffer: Buffer = readFileSync(savedPath);

      // 3. 删除临时文件
      unlinkSync(savedPath);

      // 4. 如果需要 JPEG，使用 sharp 转换并压缩
      if (format === 'jpeg') {
        buffer = await sharp(buffer)
          .jpeg({ quality, mozjpeg: true }) // 使用 mozjpeg 引擎获得更好的压缩
          .toBuffer();
      }

      // 5. 转换为 base64
      const base64 = buffer.toString('base64');

      const endTime = Date.now();
      const fileSize = (base64.length * 0.75) / 1024; // 估算文件大小（KB）
      console.log(
        `[WindowsNative] 截图完成 - 格式: ${format}, 大小: ${fileSize.toFixed(2)}KB, 耗时: ${endTime - startTime}ms`,
      );

      return `data:image/${format};base64,${base64}`;
    } catch (error) {
      console.error('截图失败:', error);
      throw error;
    }
  }

  // ==================== 2. 鼠标操作 ====================

  /**
   * 将物理坐标转换为逻辑坐标
   * @param x 物理 X 坐标（基于截图分辨率）
   * @param y 物理 Y 坐标（基于截图分辨率）
   * @returns 逻辑坐标（用于 nut-js mouse.move）
   */
  private convertToLogicalCoordinates(
    x: number,
    y: number,
  ): { x: number; y: number } {
    const screenInfo = this.getScreenSize();
    const dpr = screenInfo.dpr;

    // 如果 DPR 接近 1.0，不需要转换
    if (Math.abs(dpr - 1.0) < 0.01) {
      return { x: Math.round(x), y: Math.round(y) };
    }

    // 物理坐标转换为逻辑坐标
    const logicalX = Math.round(x / dpr);
    const logicalY = Math.round(y / dpr);

    return { x: logicalX, y: logicalY };
  }

  /**
   * 移动鼠标
   * 实现 API 文档 2.1
   *
   * @param x 物理 X 坐标（基于截图分辨率，来自 AI）
   * @param y 物理 Y 坐标（基于截图分辨率，来自 AI）
   */
  moveMouse(_x: number, _y: number): void {
    console.warn(
      '[WindowsNative] moveMouse 同步接口已废弃，请使用 moveMouseAsync',
    );
  }

  /**
   * 鼠标单击
   * 实现 API 文档 2.2
   *
   * @param x 物理 X 坐标（基于截图分辨率，来自 AI）
   * @param y 物理 Y 坐标（基于截图分辨率，来自 AI）
   */
  mouseClick(_x: number, _y: number): void {
    console.warn(
      '[WindowsNative] mouseClick 同步接口已废弃，请使用 mouseClickAsync',
    );
  }

  /**
   * 鼠标双击
   * 实现 API 文档 2.3
   *
   * @param x 物理 X 坐标（基于截图分辨率，来自 AI）
   * @param y 物理 Y 坐标（基于截图分辨率，来自 AI）
   */
  mouseDoubleClick(_x: number, _y: number): void {
    console.warn(
      '[WindowsNative] mouseDoubleClick 同步接口已废弃，请使用 mouseDoubleClickAsync',
    );
  }

  /**
   * 鼠标右键点击
   * 实现 API 文档 2.4
   *
   * @param x 物理 X 坐标（基于截图分辨率，来自 AI）
   * @param y 物理 Y 坐标（基于截图分辨率，来自 AI）
   */
  mouseRightClick(_x: number, _y: number): void {
    console.warn(
      '[WindowsNative] mouseRightClick 同步接口已废弃，请使用 mouseRightClickAsync',
    );
  }

  /**
   * 鼠标悬停
   * 实现 API 文档 2.5
   */
  mouseHover(_x: number, _y: number): void {
    console.warn(
      '[WindowsNative] mouseHover 同步接口已废弃，请使用 moveMouseAsync',
    );
  }

  /**
   * 拖放操作
   * 实现 API 文档 2.6
   *
   * @param fromX 起始物理 X 坐标
   * @param fromY 起始物理 Y 坐标
   * @param toX 目标物理 X 坐标
   * @param toY 目标物理 Y 坐标
   */
  dragAndDrop(
    _fromX: number,
    _fromY: number,
    _toX: number,
    _toY: number,
  ): void {
    console.warn(
      '[WindowsNative] dragAndDrop 同步接口已废弃，请使用 dragAndDropAsync',
    );
  }

  // ==================== 3. 键盘操作 ====================

  /**
   * 输入文本
   * 实现 API 文档 3.1
   *
   * nut-js 支持 Unicode 字符，包括中文
   */
  typeText(text: string): void {
    try {
      this.runSync(async () => {
        await keyboard.type(text);
      });
    } catch (error) {
      console.error('输入文本失败:', error);
    }
  }

  /**
   * 按键操作
   * 实现 API 文档 3.2
   *
   * @param key 按键标识符，如 'Enter', 'a', 'Control+c'
   */
  keyPress(key: string): void {
    try {
      this.runSync(async () => {
        // 检查是否是组合键
        if (key.includes('+')) {
          // 解析组合键
          const parts = key.split('+').map((p) => p.trim());
          const nutKeys = parts.map((p) => this.convertToNutKey(p));

          // 执行组合键
          await keyboard.pressKey(...nutKeys);
          await keyboard.releaseKey(...nutKeys);
        } else {
          // 单个按键
          const nutKey = this.convertToNutKey(key);
          await keyboard.pressKey(nutKey);
          await keyboard.releaseKey(nutKey);
        }
      });
    } catch (error) {
      console.error('按键操作失败:', error);
    }
  }

  /**
   * 将按键名称转换为 nut-js Key
   */
  private convertToNutKey(keyName: string): Key {
    const keyMap: Record<string, Key> = {
      // 修饰键
      Control: Key.LeftControl,
      Ctrl: Key.LeftControl,
      Alt: Key.LeftAlt,
      Shift: Key.LeftShift,
      Win: Key.LeftWin,
      Meta: Key.LeftWin,
      Command: Key.LeftCmd,
      Super: Key.LeftSuper,

      // 特殊键
      Enter: Key.Enter,
      Return: Key.Return,
      Escape: Key.Escape,
      Esc: Key.Escape,
      Tab: Key.Tab,
      Backspace: Key.Backspace,
      Delete: Key.Delete,
      Space: Key.Space,

      // 方向键
      Up: Key.Up,
      Down: Key.Down,
      Left: Key.Left,
      Right: Key.Right,

      // 功能键
      F1: Key.F1,
      F2: Key.F2,
      F3: Key.F3,
      F4: Key.F4,
      F5: Key.F5,
      F6: Key.F6,
      F7: Key.F7,
      F8: Key.F8,
      F9: Key.F9,
      F10: Key.F10,
      F11: Key.F11,
      F12: Key.F12,

      // 其他常用键
      Home: Key.Home,
      End: Key.End,
      PageUp: Key.PageUp,
      PageDown: Key.PageDown,
      Insert: Key.Insert,
      CapsLock: Key.CapsLock,

      // 数字键
      '0': Key.Num0,
      '1': Key.Num1,
      '2': Key.Num2,
      '3': Key.Num3,
      '4': Key.Num4,
      '5': Key.Num5,
      '6': Key.Num6,
      '7': Key.Num7,
      '8': Key.Num8,
      '9': Key.Num9,

      // 字母键
      a: Key.A,
      A: Key.A,
      b: Key.B,
      B: Key.B,
      c: Key.C,
      C: Key.C,
      d: Key.D,
      D: Key.D,
      e: Key.E,
      E: Key.E,
      f: Key.F,
      F: Key.F,
      g: Key.G,
      G: Key.G,
      h: Key.H,
      H: Key.H,
      i: Key.I,
      I: Key.I,
      j: Key.J,
      J: Key.J,
      k: Key.K,
      K: Key.K,
      l: Key.L,
      L: Key.L,
      m: Key.M,
      M: Key.M,
      n: Key.N,
      N: Key.N,
      o: Key.O,
      O: Key.O,
      p: Key.P,
      P: Key.P,
      q: Key.Q,
      Q: Key.Q,
      r: Key.R,
      R: Key.R,
      s: Key.S,
      S: Key.S,
      t: Key.T,
      T: Key.T,
      u: Key.U,
      U: Key.U,
      v: Key.V,
      V: Key.V,
      w: Key.W,
      W: Key.W,
      x: Key.X,
      X: Key.X,
      y: Key.Y,
      Y: Key.Y,
      z: Key.Z,
      Z: Key.Z,
    };

    // 如果在映射表中找到，返回对应的 Key
    if (keyMap[keyName]) {
      return keyMap[keyName];
    }

    // 默认返回 Key.A (作为后备)
    console.warn(`未知的按键: ${keyName}, 使用默认值`);
    return Key.A;
  }

  // ==================== 4. 滚动操作 ====================

  /**
   * 指定位置滚动
   * 实现 API 文档 4.1
   *
   * @param x 物理 X 坐标
   * @param y 物理 Y 坐标
   */
  scrollAt(
    _x: number,
    _y: number,
    _direction: 'up' | 'down' | 'left' | 'right',
    _distance: number,
  ): void {
    console.warn(
      '[WindowsNative] scrollAt 同步接口已废弃，请使用 scrollAtAsync',
    );
  }

  /**
   * 全局滚动
   * 实现 API 文档 4.2
   */
  scrollGlobal(
    direction: 'up' | 'down' | 'left' | 'right',
    distance: number,
  ): void {
    try {
      this.runSync(async () => {
        await this.scrollAsync(direction, distance);
      });
    } catch (error) {
      console.error('全局滚动失败:', error);
    }
  }

  /**
   * 执行滚动操作（异步）
   *
   * nut-js scrolling:
   * - scrollDown(amount): 向下滚动
   * - scrollUp(amount): 向上滚动
   * - scrollLeft(amount): 向左滚动
   * - scrollRight(amount): 向右滚动
   */
  private async scrollAsync(
    direction: 'up' | 'down' | 'left' | 'right',
    distance: number,
  ): Promise<void> {
    // 将像素距离转换为滚动刻度
    // nut-js 的滚动量是以"刻度"为单位的
    const scrollAmount = Math.max(1, Math.round(distance / 10));

    switch (direction) {
      case 'up':
        await mouse.scrollUp(scrollAmount);
        break;
      case 'down':
        await mouse.scrollDown(scrollAmount);
        break;
      case 'left':
        await mouse.scrollLeft(scrollAmount);
        break;
      case 'right':
        await mouse.scrollRight(scrollAmount);
        break;
    }
  }

  // ==================== 工具方法 ====================

  /**
   * 同步运行异步函数
   *
   * 注意：这是一个临时解决方案，用于保持接口兼容性
   * 在实际使用中，建议将所有接口改为异步
   */
  private runSync<T>(_asyncFn: () => Promise<T>): T | undefined {
    // 已废弃：为了兼容旧同步接口，保留方法但直接返回 undefined 并提示
    console.warn(
      '[WindowsNative] runSync 已废弃，请改用对应的 Async 方法并在上层 await',
    );
    return undefined;
  }

  /**
   * 获取剪贴板内容
   */
  getClipboard(): string {
    try {
      const clipboardy = require('clipboardy');
      return clipboardy.readSync();
    } catch (error) {
      console.error('获取剪贴板失败:', error);
      return '';
    }
  }

  /**
   * 设置剪贴板内容
   */
  setClipboard(text: string): void {
    try {
      const clipboardy = require('clipboardy');
      clipboardy.writeSync(text);
    } catch (error) {
      console.error('设置剪贴板失败:', error);
    }
  }

  // ==================== 异步接口（推荐使用） ====================

  /**
   * 异步：移动鼠标
   * @param x 物理 X 坐标
   * @param y 物理 Y 坐标
   */
  async moveMouseAsync(x: number, y: number): Promise<void> {
    const logical = this.convertToLogicalCoordinates(x, y);
    await mouse.move([new Point(logical.x, logical.y)]);
  }

  /**
   * 异步：鼠标单击
   * @param x 物理 X 坐标
   * @param y 物理 Y 坐标
   */
  async mouseClickAsync(x: number, y: number): Promise<void> {
    const logical = this.convertToLogicalCoordinates(x, y);
    await mouse.move([new Point(logical.x, logical.y)]);
    await mouse.click(Button.LEFT);
  }

  /**
   * 异步：鼠标双击
   * @param x 物理 X 坐标
   * @param y 物理 Y 坐标
   */
  async mouseDoubleClickAsync(x: number, y: number): Promise<void> {
    const logical = this.convertToLogicalCoordinates(x, y);
    await mouse.move([new Point(logical.x, logical.y)]);
    await mouse.doubleClick(Button.LEFT);
  }

  /**
   * 异步：鼠标右键点击
   * @param x 物理 X 坐标
   * @param y 物理 Y 坐标
   */
  async mouseRightClickAsync(x: number, y: number): Promise<void> {
    const logical = this.convertToLogicalCoordinates(x, y);
    await mouse.move([new Point(logical.x, logical.y)]);
    await mouse.click(Button.RIGHT);
  }

  /**
   * 异步：拖放操作
   * @param fromX 起始物理 X 坐标
   * @param fromY 起始物理 Y 坐标
   * @param toX 目标物理 X 坐标
   * @param toY 目标物理 Y 坐标
   */
  async dragAndDropAsync(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
  ): Promise<void> {
    const logicalFrom = this.convertToLogicalCoordinates(fromX, fromY);
    const logicalTo = this.convertToLogicalCoordinates(toX, toY);
    await mouse.move([new Point(logicalFrom.x, logicalFrom.y)]);
    await mouse.pressButton(Button.LEFT);
    await mouse.drag([new Point(logicalTo.x, logicalTo.y)]);
    await mouse.releaseButton(Button.LEFT);
  }

  /**
   * 异步：输入文本
   */
  async typeTextAsync(text: string): Promise<void> {
    await keyboard.type(text);
  }

  /**
   * 异步：按键操作
   */
  async keyPressAsync(key: string): Promise<void> {
    if (key.includes('+')) {
      const parts = key.split('+').map((p) => p.trim());
      const nutKeys = parts.map((p) => this.convertToNutKey(p));
      await keyboard.pressKey(...nutKeys);
      await keyboard.releaseKey(...nutKeys);
    } else {
      const nutKey = this.convertToNutKey(key);
      await keyboard.pressKey(nutKey);
      await keyboard.releaseKey(nutKey);
    }
  }

  /**
   * 异步：指定位置滚动
   * @param x 物理 X 坐标
   * @param y 物理 Y 坐标
   */
  async scrollAtAsync(
    x: number,
    y: number,
    direction: 'up' | 'down' | 'left' | 'right',
    distance: number,
  ): Promise<void> {
    const logical = this.convertToLogicalCoordinates(x, y);
    await mouse.move([new Point(logical.x, logical.y)]);
    await this.scrollAsync(direction, distance);
  }

  /**
   * 异步：全局滚动
   */
  async scrollGlobalAsync(
    direction: 'up' | 'down' | 'left' | 'right',
    distance: number,
  ): Promise<void> {
    await this.scrollAsync(direction, distance);
  }
}

/**
 * 导出单例实例
 */
export const windowsNative = WindowsNativeImpl.getInstance();
