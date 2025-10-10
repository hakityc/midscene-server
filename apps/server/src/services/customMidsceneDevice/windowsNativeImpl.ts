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

import { mouse, keyboard, screen, Button, Key, Point } from '@nut-tree/nut-js';
import type { Size } from '@midscene/core';

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
	 */
	getScreenSize(): ScreenInfo {
		// nut-js 的 screen.width/height 是异步的
		// 使用同步包装
		return this.runSync(async () => {
			const width = await screen.width();
			const height = await screen.height();
			
			// TODO: 获取真实的 DPI 缩放比例
			// Windows 上可以通过 Windows API 获取，这里暂时默认为 1
			const dpr = 1;

			return {
				width,
				height,
				dpr,
			};
		}) || { width: 1920, height: 1080, dpr: 1 };
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
			
			return this.runSync(async () => {
				// 捕获屏幕
				const image = await screen.grab();
				
				// 使用 jimp 将图像数据转换为 PNG
				const Jimp = require('jimp');
				const jimpImage = new Jimp(image.width, image.height);
				
				// 将 nut-js Image 的数据复制到 jimp
				// nut-js 返回 BGRA 格式
				const imageData = await image.toRGB();
				jimpImage.bitmap.data = Buffer.from(imageData.data);
				
				// 转换为 PNG Buffer
				const buffer = await jimpImage.getBufferAsync(Jimp.MIME_PNG);
				return `data:image/png;base64,${buffer.toString('base64')}`;
			}) || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
		} catch (error) {
			console.error('截图失败:', error);
			// 返回一个 1x1 透明 PNG 作为后备
			return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
		}
	}

	/**
	 * 获取屏幕截图（异步版本 - 推荐使用）
	 */
	async captureScreenAsync(): Promise<string> {
		try {
			// 捕获屏幕
			const image = await screen.grab();
			
			// 使用 jimp 将图像数据转换为 PNG
			const Jimp = require('jimp');
			const jimpImage = new Jimp(image.width, image.height);
			
			// 将 nut-js Image 的数据复制到 jimp
			const imageData = await image.toRGB();
			jimpImage.bitmap.data = Buffer.from(imageData.data);
			
			// 转换为 PNG Buffer
			const buffer = await jimpImage.getBufferAsync(Jimp.MIME_PNG);
			return `data:image/png;base64,${buffer.toString('base64')}`;
		} catch (error) {
			console.error('截图失败:', error);
			return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
		}
	}

	// ==================== 2. 鼠标操作 ====================

	/**
	 * 移动鼠标
	 * 实现 API 文档 2.1
	 */
	moveMouse(x: number, y: number): void {
		try {
			// nut-js 的 mouse.move 是异步的
			// 使用同步包装
			this.runSync(async () => {
				await mouse.move([new Point(Math.round(x), Math.round(y))]);
			});
		} catch (error) {
			console.error('移动鼠标失败:', error);
		}
	}

	/**
	 * 鼠标单击
	 * 实现 API 文档 2.2
	 */
	mouseClick(x: number, y: number): void {
		try {
			this.runSync(async () => {
				// 1. 移动鼠标到目标位置
				await mouse.move([new Point(Math.round(x), Math.round(y))]);
				
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
	 */
	mouseDoubleClick(x: number, y: number): void {
		try {
			this.runSync(async () => {
				// 1. 移动鼠标到目标位置
				await mouse.move([new Point(Math.round(x), Math.round(y))]);
				
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
	 */
	mouseRightClick(x: number, y: number): void {
		try {
			this.runSync(async () => {
				// 1. 移动鼠标到目标位置
				await mouse.move([new Point(Math.round(x), Math.round(y))]);
				
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
	 */
	dragAndDrop(fromX: number, fromY: number, toX: number, toY: number): void {
		try {
			this.runSync(async () => {
				// 1. 移动鼠标到起始位置
				await mouse.move([new Point(Math.round(fromX), Math.round(fromY))]);
				
				// 2. 按下鼠标左键
				await mouse.pressButton(Button.LEFT);
				
				// 3. 平滑拖动到目标位置
				await mouse.drag([new Point(Math.round(toX), Math.round(toY))]);
				
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
					const parts = key.split('+').map(p => p.trim());
					const nutKeys = parts.map(p => this.convertToNutKey(p));
					
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
			'Control': Key.LeftControl,
			'Ctrl': Key.LeftControl,
			'Alt': Key.LeftAlt,
			'Shift': Key.LeftShift,
			'Win': Key.LeftWin,
			'Meta': Key.LeftWin,
			'Command': Key.LeftCmd,
			'Super': Key.LeftSuper,
			
			// 特殊键
			'Enter': Key.Enter,
			'Return': Key.Return,
			'Escape': Key.Escape,
			'Esc': Key.Escape,
			'Tab': Key.Tab,
			'Backspace': Key.Backspace,
			'Delete': Key.Delete,
			'Space': Key.Space,
			
			// 方向键
			'Up': Key.Up,
			'Down': Key.Down,
			'Left': Key.Left,
			'Right': Key.Right,
			
			// 功能键
			'F1': Key.F1,
			'F2': Key.F2,
			'F3': Key.F3,
			'F4': Key.F4,
			'F5': Key.F5,
			'F6': Key.F6,
			'F7': Key.F7,
			'F8': Key.F8,
			'F9': Key.F9,
			'F10': Key.F10,
			'F11': Key.F11,
			'F12': Key.F12,
			
			// 其他常用键
			'Home': Key.Home,
			'End': Key.End,
			'PageUp': Key.PageUp,
			'PageDown': Key.PageDown,
			'Insert': Key.Insert,
			'CapsLock': Key.CapsLock,
			
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
			'a': Key.A, 'A': Key.A,
			'b': Key.B, 'B': Key.B,
			'c': Key.C, 'C': Key.C,
			'd': Key.D, 'D': Key.D,
			'e': Key.E, 'E': Key.E,
			'f': Key.F, 'F': Key.F,
			'g': Key.G, 'G': Key.G,
			'h': Key.H, 'H': Key.H,
			'i': Key.I, 'I': Key.I,
			'j': Key.J, 'J': Key.J,
			'k': Key.K, 'K': Key.K,
			'l': Key.L, 'L': Key.L,
			'm': Key.M, 'M': Key.M,
			'n': Key.N, 'N': Key.N,
			'o': Key.O, 'O': Key.O,
			'p': Key.P, 'P': Key.P,
			'q': Key.Q, 'Q': Key.Q,
			'r': Key.R, 'R': Key.R,
			's': Key.S, 'S': Key.S,
			't': Key.T, 'T': Key.T,
			'u': Key.U, 'U': Key.U,
			'v': Key.V, 'V': Key.V,
			'w': Key.W, 'W': Key.W,
			'x': Key.X, 'X': Key.X,
			'y': Key.Y, 'Y': Key.Y,
			'z': Key.Z, 'Z': Key.Z,
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
	 */
	scrollAt(
		x: number,
		y: number,
		direction: 'up' | 'down' | 'left' | 'right',
		distance: number
	): void {
		try {
			this.runSync(async () => {
				// 1. 移动鼠标到目标位置
				await mouse.move([new Point(Math.round(x), Math.round(y))]);
				
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
		distance: number
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
		distance: number
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
			.then(res => {
				result = res;
				done = true;
			})
			.catch(err => {
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
	 * 睡眠等待
	 */
	private sleep(ms: number): void {
		const start = Date.now();
		while (Date.now() - start < ms) {
			// 忙等待
		}
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
	 */
	async moveMouseAsync(x: number, y: number): Promise<void> {
		await mouse.move([new Point(Math.round(x), Math.round(y))]);
	}

	/**
	 * 异步：鼠标单击
	 */
	async mouseClickAsync(x: number, y: number): Promise<void> {
		await mouse.move([new Point(Math.round(x), Math.round(y))]);
		await mouse.click(Button.LEFT);
	}

	/**
	 * 异步：鼠标双击
	 */
	async mouseDoubleClickAsync(x: number, y: number): Promise<void> {
		await mouse.move([new Point(Math.round(x), Math.round(y))]);
		await mouse.doubleClick(Button.LEFT);
	}

	/**
	 * 异步：鼠标右键点击
	 */
	async mouseRightClickAsync(x: number, y: number): Promise<void> {
		await mouse.move([new Point(Math.round(x), Math.round(y))]);
		await mouse.click(Button.RIGHT);
	}

	/**
	 * 异步：拖放操作
	 */
	async dragAndDropAsync(fromX: number, fromY: number, toX: number, toY: number): Promise<void> {
		await mouse.move([new Point(Math.round(fromX), Math.round(fromY))]);
		await mouse.pressButton(Button.LEFT);
		await mouse.drag([new Point(Math.round(toX), Math.round(toY))]);
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
			const parts = key.split('+').map(p => p.trim());
			const nutKeys = parts.map(p => this.convertToNutKey(p));
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
	 */
	async scrollAtAsync(
		x: number,
		y: number,
		direction: 'up' | 'down' | 'left' | 'right',
		distance: number
	): Promise<void> {
		await mouse.move([new Point(Math.round(x), Math.round(y))]);
		await this.scrollAsync(direction, distance);
	}

	/**
	 * 异步：全局滚动
	 */
	async scrollGlobalAsync(
		direction: 'up' | 'down' | 'left' | 'right',
		distance: number
	): Promise<void> {
		await this.scrollAsync(direction, distance);
	}
}

/**
 * 导出单例实例
 */
export const windowsNative = WindowsNativeImpl.getInstance();
