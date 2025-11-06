import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { serviceLogger } from '../utils/logger';
import { WebOperateServiceRefactored } from './base/WebOperateServiceRefactored';
import { summarizeImage } from './summarizeService';

export type SummarizeWithMidsceneParams = {
  fullPage?: boolean; // 是否全页截图，默认 true
  locate?: any; // 指定要总结的区域
  stickyHeaderHeight?: number; // 粘滞头高度（像素），默认 64
};

/**
 * 使用 WebOperateServiceRefactored 的截图功能对当前打开的网页进行总结
 *
 * 特性：
 * - 支持整页截图和视口截图
 * - 支持指定元素区域截图
 * - 自动处理懒加载内容
 * - 支持飞书文档等动态加载场景
 * - 复用现有的浏览器连接和服务管理
 * - 直接对当前打开的网页进行处理，无需导航
 */
export async function summarizeWebPageWithMidscene(
  params: SummarizeWithMidsceneParams,
): Promise<{
  summary: string;
  imageSize: number;
  locateRect?: { left: number; top: number; width: number; height: number };
}> {
  const { fullPage = true, locate, stickyHeaderHeight = 64 } = params;

  const webService = WebOperateServiceRefactored.getInstance();

  try {
    // 1. 确保服务启动
    if (!webService.isStarted()) {
      await webService.start();
    }

    // 2. 先禁用波纹动画，避免后续操作时自动启用
    await webService.setRippleEnabled(false);

    // 3. 确保当前标签页已连接（不导航，直接使用当前页面）
    const isConnected = await webService.checkAndReconnect();
    if (!isConnected) {
      throw new Error('浏览器连接断开，正在重连中，请稍后重试');
    }

    // 4. 再次确保波纹动画被禁用（因为重连可能重新附加了调试器）
    await webService.setRippleEnabled(false);

    // 5. 使用服务层的截图方法
    const { imageBase64, locateRect } = await webService.screenshot({
      fullPage,
      locate,
      stickyHeaderHeight,
    });

    // 基本校验，防止后续解析空图片
    if (!imageBase64 || imageBase64.trim() === '') {
      throw new Error('截图结果为空，请重试或检查浏览器扩展连接');
    }

    // 解析图片尺寸以验证是否真的执行了全页截图
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const imageInfo = await sharp(buffer).metadata();

    console.log(
      `截图完成: fullPage=${fullPage}, 实际尺寸=${imageInfo.width}x${imageInfo.height}, locateRect=${JSON.stringify(locateRect)}`,
    );

    // 如果请求全页截图但尺寸很小，可能是回退到了视口截图
    // if (fullPage && imageInfo.height && imageInfo.height < 2000) {
    //   console.warn(
    //     `⚠️  请求了全页截图但实际尺寸只有 ${imageInfo.width}x${imageInfo.height}，可能是浏览器端全页截图失败，已回退到视口截图`,
    //   );
    // }

    // 保存截图到本地用于调试预览
    try {
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const timestamp = Date.now();
      const filename = `screenshot-${timestamp}.jpg`;
      const filepath = path.join(
        process.cwd(),
        'midscene_run',
        'output',
        filename,
      );

      // 确保目录存在
      const dir = path.dirname(filepath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      await sharp(buffer).jpeg({ quality: 90 }).toFile(filepath);
      console.log(`📸 截图已保存: ${filepath}`);
    } catch (error) {
      console.error('保存截图失败:', error);
    }

    // await webService.setRippleEnabled(true);
    const { summary, imageSize } = await summarizeImage({
      url: imageBase64,
    });

    serviceLogger.info({ summary }, '网页总结完成');
    return {
      summary,
      imageSize,
      locateRect,
    };
  } catch (error) {
    console.error('网页总结失败:', error);
    throw error;
  }
}
