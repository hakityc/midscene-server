import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { WebOperateServiceRefactored } from './base/WebOperateServiceRefactored';

export type SummarizeWithMidsceneParams = {
  fullPage?: boolean; // 是否全页截图，默认 true
  locate?: any; // 指定要总结的区域
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
  const { fullPage = true, locate } = params;

  const webService = WebOperateServiceRefactored.getInstance();

  try {
    // 1. 确保服务启动
    if (!webService.isStarted()) {
      await webService.start();
    }

    // 2. 确保当前标签页已连接（不导航，直接使用当前页面）
    const isConnected = await webService.checkAndReconnect();
    if (!isConnected) {
      throw new Error('浏览器连接断开，正在重连中，请稍后重试');
    }

    // 3. 使用服务层的截图方法
    const { imageBase64, locateRect } = await webService.screenshot({
      fullPage,
      locate,
    });

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

    //     // 4. 构建 AI 提示词
    //     let prompt = '请对这张网页截图进行结构化总结。';
    //     if (locate && locateRect) {
    //       prompt = `请重点总结截图中指定区域的内容。该区域位于：
    // - 左上角坐标：(${locateRect.left}, ${locateRect.top})
    // - 宽度：${locateRect.width}px
    // - 高度：${locateRect.height}px

    // 请详细分析这个区域的内容，包括文字、结构和关键信息。`;
    //     } else if (fullPage) {
    //       prompt =
    //         '这是一张完整的网页截图，请对整个页面进行结构化总结，包括主要内容、布局和关键信息。';
    //     } else {
    //       prompt = '这是网页的当前视口截图，请对可见部分进行总结。';
    //     }

    //     // 5. 调用 Mastra Agent 进行 AI 总结
    //     const agent = mastra.getAgent('documentSummaryAgent');
    //     const result = await agent.generateVNext({
    //       messages: [
    //         { role: 'user', content: prompt },
    //         { role: 'user', content: imageBase64 },
    //       ],
    //     } as any);

    //     const summary =
    //       (result as any)?.text ||
    //       (result as any)?.output ||
    //       JSON.stringify(result);

    //     // 6. 计算图片大小（base64 去掉前缀后的实际大小）
    //     const base64Data = imageBase64.split(',')[1] || imageBase64;
    //     const imageSize = Math.floor((base64Data.length * 3) / 4);

    //     console.log(`总结完成: 图片大小=${imageSize} bytes`);

    //     return {
    //       summary,
    //       imageSize,
    //       locateRect,
    //     };

    // 临时返回截图信息（AI 总结功能已注释）
    const imageSizeInBytes = Math.floor((base64Data.length * 3) / 4);
    return {
      summary: `截图完成 (${imageInfo.width}x${imageInfo.height})`,
      imageSize: imageSizeInBytes,
      locateRect,
    };
  } catch (error) {
    console.error('网页总结失败:', error);
    throw error;
  }
}
