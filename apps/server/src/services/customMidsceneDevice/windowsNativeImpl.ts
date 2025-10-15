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

/**
 * 屏幕信息接口
 */
export interface ScreenInfo {
  width: number;
  height: number;
  dpr: number;
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
      return this.cachedScreenInfo;
    }

    // nut-js 的 screen.width/height 是异步的
    // 使用同步包装
    const result = this.runSync(async () => {
      const logicalWidth = await screen.width();
      const logicalHeight = await screen.height();

      // 通过临时截图获取物理分辨率
      // screen.grab() 返回的图片尺寸是实际的物理分辨率
      const screenshot = await screen.grab();
      const physicalWidth = screenshot.width;
      const physicalHeight = screenshot.height;

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

    this.cachedScreenInfo = result || { width: 1920, height: 1080, dpr: 1 };
    return this.cachedScreenInfo;
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
      // nut-js 使用异步方式捕获屏幕
      // 由于我们的接口是同步的，这里使用同步包装
      // 注意：这会阻塞事件循环，建议使用异步版本 captureScreenAsync()

      return (
        this.runSync(async () => {
          // 使用临时文件来保存截图
          const tempFileName = `screenshot_${Date.now()}`;
          const tempFilePath = tmpdir();

          // 使用 nut-js 的 capture 方法直接保存为 PNG
          const savedPath = await screen.capture(
            tempFileName,
            FileType.PNG,
            tempFilePath,
          );

          // 读取文件并转换为 base64
          const buffer = readFileSync(savedPath);
          const base64 = buffer.toString('base64');

          // 删除临时文件
          unlinkSync(savedPath);

          return `data:image/png;base64,${base64}`;
        }) || ''
      );
    } catch (error) {
      console.error('截图失败:', error);
      throw error;
    }
  }

  /**
   * 获取屏幕截图（异步版本 - 推荐使用）
   */
  async captureScreenAsync(): Promise<string> {
    try {
      // 使用临时文件来保存截图
      const tempFileName = `screenshot_${Date.now()}`;
      const tempFilePath = tmpdir();

      // 使用 nut-js 的 capture 方法直接保存为 PNG
      const savedPath = await screen.capture(
        tempFileName,
        FileType.PNG,
        tempFilePath,
      );

      // 读取文件并转换为 base64
      const buffer = readFileSync(savedPath);
      const base64 = buffer.toString('base64');

      // 删除临时文件
      unlinkSync(savedPath);

      return `data:image/png;base64,${base64}`;
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
  moveMouse(x: number, y: number): void {
    try {
      // nut-js 的 mouse.move 是异步的
      // 使用同步包装
      this.runSync(async () => {
        const logical = this.convertToLogicalCoordinates(x, y);

        if (process.env.DEBUG_DPI === 'true') {
          const screenInfo = this.getScreenSize();
          console.log('[WindowsNative] 移动鼠标:');
          console.log(`  物理坐标: (${x}, ${y})`);
          console.log(`  逻辑坐标: (${logical.x}, ${logical.y})`);
          console.log(`  DPR: ${screenInfo.dpr.toFixed(4)}`);
        }

        await mouse.move([new Point(logical.x, logical.y)]);
      });
    } catch (error) {
      console.error('移动鼠标失败:', error);
    }
  }

  /**
   * 鼠标单击
   * 实现 API 文档 2.2
   *
   * @param x 物理 X 坐标（基于截图分辨率，来自 AI）
   * @param y 物理 Y 坐标（基于截图分辨率，来自 AI）
   */
  mouseClick(x: number, y: number): void {
    try {
      this.runSync(async () => {
        const logical = this.convertToLogicalCoordinates(x, y);

        if (process.env.DEBUG_DPI === 'true') {
          const screenInfo = this.getScreenSize();
          console.log('[WindowsNative] 鼠标点击:');
          console.log(`  物理坐标: (${x}, ${y})`);
          console.log(`  逻辑坐标: (${logical.x}, ${logical.y})`);
          console.log(`  DPR: ${screenInfo.dpr.toFixed(4)}`);
        }

        // 1. 移动鼠标到目标位置
        await mouse.move([new Point(logical.x, logical.y)]);

        // 2. 执行单击
        await mouse.click(Button.LEFT);
      });
    } catch (error) {
      console.error('鼠标单击失败:', error);
    }
  }

  /**
   * 鼠标双击
   * 实现 API 文档 2.3
   *
   * @param x 物理 X 坐标（基于截图分辨率，来自 AI）
   * @param y 物理 Y 坐标（基于截图分辨率，来自 AI）
   */
  mouseDoubleClick(x: number, y: number): void {
    try {
      this.runSync(async () => {
        const logical = this.convertToLogicalCoordinates(x, y);

        // 1. 移动鼠标到目标位置
        await mouse.move([new Point(logical.x, logical.y)]);

        // 2. 执行双击
        await mouse.doubleClick(Button.LEFT);
      });
    } catch (error) {
      console.error('鼠标双击失败:', error);
    }
  }

  /**
   * 鼠标右键点击
   * 实现 API 文档 2.4
   *
   * @param x 物理 X 坐标（基于截图分辨率，来自 AI）
   * @param y 物理 Y 坐标（基于截图分辨率，来自 AI）
   */
  mouseRightClick(x: number, y: number): void {
    try {
      this.runSync(async () => {
        const logical = this.convertToLogicalCoordinates(x, y);

        // 1. 移动鼠标到目标位置
        await mouse.move([new Point(logical.x, logical.y)]);

        // 2. 执行右键点击
        await mouse.click(Button.RIGHT);
      });
    } catch (error) {
      console.error('鼠标右键点击失败:', error);
    }
  }

  /**
   * 鼠标悬停
   * 实现 API 文档 2.5
   */
  mouseHover(x: number, y: number): void {
    // 悬停就是移动鼠标到指定位置
    this.moveMouse(x, y);
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
  dragAndDrop(fromX: number, fromY: number, toX: number, toY: number): void {
    try {
      this.runSync(async () => {
        const logicalFrom = this.convertToLogicalCoordinates(fromX, fromY);
        const logicalTo = this.convertToLogicalCoordinates(toX, toY);

        // 1. 移动鼠标到起始位置
        await mouse.move([new Point(logicalFrom.x, logicalFrom.y)]);

        // 2. 按下鼠标左键
        await mouse.pressButton(Button.LEFT);

        // 3. 平滑拖动到目标位置
        await mouse.drag([new Point(logicalTo.x, logicalTo.y)]);

        // 4. 释放鼠标左键
        await mouse.releaseButton(Button.LEFT);
      });
    } catch (error) {
      console.error('拖放操作失败:', error);
    }
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
    x: number,
    y: number,
    direction: 'up' | 'down' | 'left' | 'right',
    distance: number,
  ): void {
    try {
      this.runSync(async () => {
        const logical = this.convertToLogicalCoordinates(x, y);

        // 1. 移动鼠标到目标位置
        await mouse.move([new Point(logical.x, logical.y)]);

        // 2. 执行滚动
        await this.scrollAsync(direction, distance);
      });
    } catch (error) {
      console.error('指定位置滚动失败:', error);
    }
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
  private runSync<T>(asyncFn: () => Promise<T>): T | undefined {
    let result: T | undefined;
    let error: Error | undefined;
    let done = false;

    asyncFn()
      .then((res) => {
        result = res;
        done = true;
      })
      .catch((err) => {
        error = err;
        done = true;
      });

    // 等待异步操作完成（最多 5 秒）
    const startTime = Date.now();
    while (!done && Date.now() - startTime < 5000) {
      // 忙等待
    }

    if (error) {
      throw error;
    }

    return result;
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
