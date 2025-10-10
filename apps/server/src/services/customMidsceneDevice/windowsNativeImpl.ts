/**
 * Windows 底层实现 - 使用 robotjs
 * 
 * 实现 WINDOWS_IMPLEMENTATION_API.md 中定义的所有底层接口
 */

import robot from 'robotjs';
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
		// 初始化 robotjs 配置
		// 设置鼠标延迟，确保操作的准确性
		robot.setMouseDelay(2);
		robot.setKeyboardDelay(10);
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
		const size = robot.getScreenSize();
		
		// TODO: 获取真实的 DPI 缩放比例
		// Windows 上可以通过 Windows API 获取，这里暂时默认为 1
		const dpr = 1;

		return {
			width: size.width,
			height: size.height,
			dpr: dpr,
		};
	}

	/**
	 * 获取屏幕截图
	 * 实现 API 文档 1.2
	 * 
	 * @returns Base64 编码的 PNG 图片
	 */
	captureScreen(): string {
		const size = robot.getScreenSize();
		
		// 捕获整个屏幕
		const img = robot.captureScreen(0, 0, size.width, size.height);
		
		// 将 robotjs 的图像数据转换为 PNG Base64
		const pngBuffer = this.imageToPngBuffer(img, size.width, size.height);
		const base64 = pngBuffer.toString('base64');
		
		return `data:image/png;base64,${base64}`;
	}

	// ==================== 2. 鼠标操作 ====================

	/**
	 * 移动鼠标
	 * 实现 API 文档 2.1
	 */
	moveMouse(x: number, y: number): void {
		robot.moveMouse(Math.round(x), Math.round(y));
	}

	/**
	 * 鼠标单击
	 * 实现 API 文档 2.2
	 */
	mouseClick(x: number, y: number): void {
		// 1. 移动鼠标到目标位置
		this.moveMouse(x, y);
		
		// 2. 执行单击
		robot.mouseClick();
	}

	/**
	 * 鼠标双击
	 * 实现 API 文档 2.3
	 */
	mouseDoubleClick(x: number, y: number): void {
		// 1. 移动鼠标到目标位置
		this.moveMouse(x, y);
		
		// 2. 执行双击
		robot.mouseClick('left', true);
	}

	/**
	 * 鼠标右键点击
	 * 实现 API 文档 2.4
	 */
	mouseRightClick(x: number, y: number): void {
		// 1. 移动鼠标到目标位置
		this.moveMouse(x, y);
		
		// 2. 执行右键点击
		robot.mouseClick('right');
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
		// 1. 移动鼠标到起始位置
		this.moveMouse(fromX, fromY);
		
		// 2. 按下鼠标左键
		robot.mouseToggle('down');
		
		// 3. 平滑移动到目标位置
		// 计算移动步数，使拖放更平滑
		const steps = 10;
		const deltaX = (toX - fromX) / steps;
		const deltaY = (toY - fromY) / steps;
		
		for (let i = 1; i <= steps; i++) {
			const currentX = fromX + deltaX * i;
			const currentY = fromY + deltaY * i;
			this.moveMouse(currentX, currentY);
			this.sleep(10); // 每步延迟 10ms
		}
		
		// 4. 释放鼠标左键
		robot.mouseToggle('up');
	}

	// ==================== 3. 键盘操作 ====================

	/**
	 * 输入文本
	 * 实现 API 文档 3.1
	 * 
	 * 注意: robotjs 的 typeString 仅支持 ASCII 字符
	 * 对于中文等非 ASCII 字符，需要使用剪贴板方式
	 */
	typeText(text: string): void {
		// 检查是否包含非 ASCII 字符
		const hasNonAscii = /[^\x00-\x7F]/.test(text);
		
		if (hasNonAscii) {
			// 使用剪贴板方式输入
			this.typeTextViaClipboard(text);
		} else {
			// 直接使用 robotjs 输入
			robot.typeString(text);
		}
	}

	/**
	 * 通过剪贴板输入文本（用于非 ASCII 字符）
	 * 
	 * 步骤：
	 * 1. 保存当前剪贴板内容
	 * 2. 将文本复制到剪贴板
	 * 3. 模拟 Ctrl+V 粘贴
	 * 4. 恢复原剪贴板内容
	 */
	private typeTextViaClipboard(text: string): void {
		try {
			// 导入 clipboardy（如果已安装）
			// 注意：需要安装 clipboardy 包
			const clipboardy = require('clipboardy');
			
			// 1. 保存当前剪贴板
			const originalClipboard = clipboardy.readSync();
			
			// 2. 复制文本到剪贴板
			clipboardy.writeSync(text);
			
			// 3. 模拟 Ctrl+V
			robot.keyTap('v', 'control');
			
			// 4. 等待粘贴完成后恢复剪贴板
			setTimeout(() => {
				clipboardy.writeSync(originalClipboard);
			}, 100);
		} catch (error) {
			console.error('剪贴板方式输入失败，回退到逐字符输入:', error);
			// 回退方案：尝试逐字符输入（可能不支持所有字符）
			for (const char of text) {
				try {
					robot.typeString(char);
				} catch (e) {
					console.warn(`无法输入字符: ${char}`);
				}
			}
		}
	}

	/**
	 * 按键操作
	 * 实现 API 文档 3.2
	 * 
	 * @param key 按键标识符，如 'Enter', 'a', 'Control+c'
	 */
	keyPress(key: string): void {
		// 检查是否是组合键
		if (key.includes('+')) {
			// 解析组合键
			const parts = key.split('+');
			const modifiers: string[] = [];
			let mainKey = '';
			
			for (const part of parts) {
				const normalizedPart = this.normalizeKeyName(part.trim());
				
				if (this.isModifierKey(normalizedPart)) {
					modifiers.push(normalizedPart);
				} else {
					mainKey = normalizedPart;
				}
			}
			
			// 执行组合键
			if (mainKey) {
				robot.keyTap(mainKey, modifiers);
			}
		} else {
			// 单个按键
			const normalizedKey = this.normalizeKeyName(key);
			robot.keyTap(normalizedKey);
		}
	}

	/**
	 * 标准化按键名称
	 */
	private normalizeKeyName(key: string): string {
		const keyMap: Record<string, string> = {
			'Control': 'control',
			'Ctrl': 'control',
			'Alt': 'alt',
			'Shift': 'shift',
			'Win': 'command',
			'Meta': 'command',
			'Enter': 'enter',
			'Return': 'enter',
			'Escape': 'escape',
			'Esc': 'escape',
			'Tab': 'tab',
			'Backspace': 'backspace',
			'Delete': 'delete',
			'Up': 'up',
			'Down': 'down',
			'Left': 'left',
			'Right': 'right',
			'Space': 'space',
		};
		
		return keyMap[key] || key.toLowerCase();
	}

	/**
	 * 判断是否是修饰键
	 */
	private isModifierKey(key: string): boolean {
		return ['control', 'alt', 'shift', 'command'].includes(key);
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
		// 1. 移动鼠标到目标位置
		this.moveMouse(x, y);
		
		// 2. 执行滚动
		this.scroll(direction, distance);
	}

	/**
	 * 全局滚动
	 * 实现 API 文档 4.2
	 */
	scrollGlobal(
		direction: 'up' | 'down' | 'left' | 'right',
		distance: number
	): void {
		// 直接在当前鼠标位置滚动
		this.scroll(direction, distance);
	}

	/**
	 * 执行滚动操作
	 * 
	 * robotjs scrollMouse 参数：
	 * - scrollMouse(x, y)
	 * - x: 水平滚动量（正值向右，负值向左）
	 * - y: 垂直滚动量（正值向下，负值向上）
	 */
	private scroll(
		direction: 'up' | 'down' | 'left' | 'right',
		distance: number
	): void {
		// 将像素距离转换为滚动刻度
		// 通常 120 个单位 = 1 个滚轮刻度
		const scrollAmount = Math.round(distance / 120);
		
		switch (direction) {
			case 'up':
				// 向上滚动（正值）
				robot.scrollMouse(0, scrollAmount);
				break;
			case 'down':
				// 向下滚动（负值）
				robot.scrollMouse(0, -scrollAmount);
				break;
			case 'left':
				// 向左滚动（负值）
				robot.scrollMouse(-scrollAmount, 0);
				break;
			case 'right':
				// 向右滚动（正值）
				robot.scrollMouse(scrollAmount, 0);
				break;
		}
	}

	// ==================== 工具方法 ====================

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
	 * 将 robotjs 图像转换为 PNG Buffer
	 * 
	 * robotjs 返回的图像格式为 BGRA，需要转换为 PNG
	 */
	private imageToPngBuffer(img: any, width: number, height: number): Buffer {
		// 使用 Node.js 内置的方法或第三方库转换
		// 这里使用简单的 BMP 格式包装（可选：使用 sharp 或 pngjs 获得更好的效果）
		
		try {
			// 尝试使用 sharp（如果已安装）
			const sharp = require('sharp');
			
			// robotjs 返回的是 BGRA 格式
			const rawBuffer = Buffer.from(img.image);
			
			return sharp(rawBuffer, {
				raw: {
					width: width,
					height: height,
					channels: 4, // BGRA
				}
			})
			.png()
			.toBuffer();
		} catch (error) {
			// 如果 sharp 不可用，使用 pngjs
			try {
				const { PNG } = require('pngjs');
				const png = new PNG({ width, height });
				
				// robotjs 返回的格式是 BGRA
				const imgData = img.image;
				
				// 转换 BGRA 到 RGBA
				for (let y = 0; y < height; y++) {
					for (let x = 0; x < width; x++) {
						const idx = (width * y + x) * 4;
						const b = imgData[idx];
						const g = imgData[idx + 1];
						const r = imgData[idx + 2];
						const a = imgData[idx + 3];
						
						png.data[idx] = r;
						png.data[idx + 1] = g;
						png.data[idx + 2] = b;
						png.data[idx + 3] = a;
					}
				}
				
				return PNG.sync.write(png);
			} catch (pngError) {
				console.error('PNG 转换失败，返回简单的 PNG:', pngError);
				// 返回一个简单的 1x1 透明 PNG 作为后备
				return Buffer.from(
					'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
					'base64'
				);
			}
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
}

/**
 * 导出单例实例
 */
export const windowsNative = WindowsNativeImpl.getInstance();

