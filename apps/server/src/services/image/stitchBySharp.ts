/**
 * 使用 sharp 进行图片拼接
 * 
 * 接收浏览器端传来的段图数组，使用 sharp 进行纵向拼接
 */

import sharp from 'sharp';

export interface ScreenshotSegment {
  x: number; // 逻辑坐标 x
  y: number; // 逻辑坐标 y（滚动位置）
  width: number; // 逻辑宽度
  height: number; // 逻辑高度
  dpr: number; // 设备像素比
  base64: string; // base64 图片数据（纯 body，不含 data URI 前缀）
  scrollY: number; // 实际滚动位置
}

export interface StitchOptions {
  stickyOverlapThreshold?: number; // 顶部可重叠阈值（像素），默认 0
  maxOutputHeight?: number; // 最大输出高度（像素），默认 32000，超过则分卷
  format?: 'jpeg' | 'png'; // 输出格式，默认 jpeg
  quality?: number; // JPEG 质量，默认 90
}

const DEFAULT_MAX_OUTPUT_HEIGHT = 32000; // Chrome Canvas 限制约为 32k，sharp 支持更大

/**
 * 拼接段图数组为完整图片
 */
export async function stitchSegments(
  segments: ScreenshotSegment[],
  options: StitchOptions = {},
): Promise<{
  imageBuffer: Buffer;
  width: number;
  height: number;
  segmentCount: number;
}> {
  const {
    stickyOverlapThreshold = 0,
    maxOutputHeight = DEFAULT_MAX_OUTPUT_HEIGHT,
    format = 'jpeg',
    quality = 90,
  } = options;

  if (segments.length === 0) {
    throw new Error('No segments to stitch');
  }

  console.log(`[Stitch] Starting to stitch ${segments.length} segments`);

  // 1. 解析所有段图，获取实际尺寸
  const parsedSegments: Array<{
    buffer: Buffer;
    actualWidth: number;
    actualHeight: number;
    logicalY: number;
    dpr: number;
  }> = [];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const buffer = Buffer.from(segment.base64, 'base64');
    const metadata = await sharp(buffer).metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error(`Segment ${i + 1} has invalid dimensions`);
    }

    parsedSegments.push({
      buffer,
      actualWidth: metadata.width,
      actualHeight: metadata.height,
      logicalY: segment.scrollY,
      dpr: segment.dpr,
    });

    console.log(
      `[Stitch] Segment ${i + 1}: ${metadata.width}x${metadata.height}, logicalY=${segment.scrollY}, dpr=${segment.dpr}`,
    );
  }

  // 2. 计算输出尺寸
  // 宽度：使用第一个段图的宽度（所有段图应该相同）
  const outputWidth = parsedSegments[0].actualWidth;
  
  // 高度：根据段图的逻辑位置和物理高度计算
  // 找到最大的 bottom 位置
  let maxBottom = 0;
  for (const segment of parsedSegments) {
    const top = Math.round(segment.logicalY * segment.dpr);
    const bottom = top + segment.actualHeight;
    if (bottom > maxBottom) {
      maxBottom = bottom;
    }
  }
  const outputHeight = maxBottom;

  console.log(`[Stitch] Output dimensions: ${outputWidth}x${outputHeight}`);

  // 3. 检查是否需要分卷
  if (outputHeight > maxOutputHeight) {
    console.warn(
      `[Stitch] Output height ${outputHeight} exceeds max ${maxOutputHeight}, will create multiple volumes`,
    );
    // TODO: 实现分卷逻辑
    // 暂时返回第一卷
  }

  // 4. 创建画布并拼接
  const canvas = sharp({
    create: {
      width: outputWidth,
      height: outputHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  });

  // 5. 准备 composite 操作
  const composites: Array<{
    input: Buffer;
    top: number;
    left: number;
  }> = [];

  for (let i = 0; i < parsedSegments.length; i++) {
    const segment = parsedSegments[i];
    
    // 计算在输出画布中的位置
    // 物理像素位置 = 逻辑位置 * DPR
    const top = Math.round(segment.logicalY * segment.dpr);
    const left = 0;

    // 处理重叠（粘性头）
    if (i > 0 && stickyOverlapThreshold > 0) {
      const prevSegment = parsedSegments[i - 1];
      const prevBottom = Math.round(
        prevSegment.logicalY * prevSegment.dpr + prevSegment.actualHeight,
      );
      
      if (top < prevBottom && top + segment.actualHeight > prevBottom) {
        // 有重叠，调整位置或裁剪
        const overlap = prevBottom - top;
        if (overlap <= stickyOverlapThreshold) {
          // 重叠在阈值内，可以合并
          console.log(
            `[Stitch] Segment ${i + 1} overlaps with previous by ${overlap}px, adjusting`,
          );
        }
      }
    }

    composites.push({
      input: segment.buffer,
      top,
      left,
    });
  }

  // 6. 执行拼接
  const result = await canvas
    .composite(composites)
    .toFormat(format, { quality })
    .toBuffer();

  console.log(
    `[Stitch] Stitching complete: ${outputWidth}x${outputHeight}, buffer size: ${result.length}`,
  );

  return {
    imageBuffer: result,
    width: outputWidth,
    height: outputHeight,
    segmentCount: segments.length,
  };
}

/**
 * 将拼接后的 Buffer 转换为 base64 data URI
 */
export function bufferToBase64DataUri(
  buffer: Buffer,
  format: 'jpeg' | 'png' = 'jpeg',
): string {
  const base64 = buffer.toString('base64');
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  return `data:${mimeType};base64,${base64}`;
}

