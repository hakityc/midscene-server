/**
 * summarizeService 测试用例
 *
 * 验证网页截图总结功能中的 agent 调用是否正确
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { summarizeImage } from '../summarizeService';

/**
 * 读取真实图片文件并转换为 DataURL
 * @param filename 图片文件名（相对于 midscene_run/output 目录）
 * @returns DataURL 字符串
 */
function loadTestImage(filename: string): string {
  // 从测试文件位置计算图片路径
  // 测试文件在: src/services/__tests__/
  // 图片文件在: midscene_run/output/
  const imagePath = join(__dirname, '../../../midscene_run/output', filename);
  const imageBuffer = readFileSync(imagePath);
  const base64 = imageBuffer.toString('base64');
  return `data:image/jpeg;base64,${base64}`;
}

// 使用 vi.hoisted 来在 mock 提升之前创建 mock 函数
const { mockGenerateLegacy, mockGetAgent } = vi.hoisted(() => {
  const mockGenerateLegacy = vi.fn();
  const mockGetAgent = vi.fn();
  return { mockGenerateLegacy, mockGetAgent };
});

vi.mock('../../mastra', () => ({
  mastra: {
    getAgent: (...args: any[]) => mockGetAgent(...args),
  },
}));

describe('summarizeService - Agent 调用测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 在每次测试前设置 mock agent
    mockGetAgent.mockReturnValue({
      generateLegacy: mockGenerateLegacy,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('agent.generateLegacy 调用', () => {
    // 使用真实的截图文件进行测试
    const realScreenshotPath = 'screenshot-1762421265295.jpg';
    let realImageDataUrl: string;
    let isRealImage = false;

    beforeAll(() => {
      try {
        realImageDataUrl = loadTestImage(realScreenshotPath);
        // 真实图片的 base64 数据会很长（> 1000000 字符）
        isRealImage = realImageDataUrl.length > 1000000;
      } catch {
        // 如果文件不存在，使用 fallback 的小图片
        console.warn(
          `测试图片 ${realScreenshotPath} 不存在，使用 fallback 图片`,
        );
        realImageDataUrl =
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        isRealImage = false;
      }
    });

    it('应该使用正确的 agent 名称获取 agent', async () => {
      mockGenerateLegacy.mockResolvedValue({
        text: '{"CoreTopic": "测试主题"}',
      });

      await summarizeImage({ url: realImageDataUrl });

      expect(mockGetAgent).toHaveBeenCalledWith('documentSummaryAgent');
      expect(mockGetAgent).toHaveBeenCalledTimes(1);
    });

    it('应该使用正确的参数调用 generateLegacy', async () => {
      mockGenerateLegacy.mockResolvedValue({
        text: '{"CoreTopic": "测试主题"}',
      });

      await summarizeImage({ url: realImageDataUrl });

      expect(mockGenerateLegacy).toHaveBeenCalledTimes(1);
      expect(mockGenerateLegacy).toHaveBeenCalledWith([
        '请对这张网页整页截图进行结构化总结。',
        realImageDataUrl,
      ]);
    });

    it('应该正确处理 generateLegacy 返回的文本结果', async () => {
      const expectedSummary = '{"CoreTopic": "网页核心主题"}';

      mockGenerateLegacy.mockResolvedValue({
        text: expectedSummary,
      });

      const result = await summarizeImage({ url: realImageDataUrl });

      expect(result.summary).toBe(expectedSummary);
    });

    it('应该处理 generateLegacy 返回空文本的情况', async () => {
      const mockResult = { text: '' };

      mockGenerateLegacy.mockResolvedValue(mockResult);

      const result = await summarizeImage({ url: realImageDataUrl });

      // 当 text 为空字符串时，trim() 后仍为空字符串（falsy），会执行 JSON.stringify(result)
      expect(result.summary).toBe(JSON.stringify(mockResult));
    });

    it('应该处理 generateLegacy 返回带空白字符的文本', async () => {
      const textWithWhitespace = '  {"CoreTopic": "测试"}  ';

      mockGenerateLegacy.mockResolvedValue({
        text: textWithWhitespace,
      });

      const result = await summarizeImage({ url: realImageDataUrl });

      expect(result.summary).toBe('{"CoreTopic": "测试"}');
    });

    it('应该处理 generateLegacy 返回 undefined text 的情况', async () => {
      const mockResult = { someOtherField: 'value' };

      mockGenerateLegacy.mockResolvedValue(mockResult);

      const result = await summarizeImage({ url: realImageDataUrl });

      // 当 text 为 undefined 时，应该返回 JSON.stringify(result)
      expect(result.summary).toBe(JSON.stringify(mockResult));
    });

    it('应该处理 generateLegacy 抛出错误的情况', async () => {
      const errorMessage = 'Agent 调用失败';

      mockGenerateLegacy.mockRejectedValue(new Error(errorMessage));

      await expect(summarizeImage({ url: realImageDataUrl })).rejects.toThrow(
        errorMessage,
      );
    });

    it('应该支持 JPEG 格式的 DataURL（使用真实截图）', async () => {
      // 真实截图已经是 JPEG 格式
      mockGenerateLegacy.mockResolvedValue({
        text: '{"CoreTopic": "JPEG 图片测试"}',
      });

      const result = await summarizeImage({ url: realImageDataUrl });

      expect(mockGenerateLegacy).toHaveBeenCalledWith([
        '请对这张网页整页截图进行结构化总结。',
        realImageDataUrl,
      ]);
      expect(result.summary).toBe('{"CoreTopic": "JPEG 图片测试"}');
      // 验证真实图片的大小（应该大于 0）
      expect(result.imageSize).toBeGreaterThan(0);
    });

    it('应该正确计算图片大小（使用真实截图）', async () => {
      mockGenerateLegacy.mockResolvedValue({
        text: '{"CoreTopic": "测试"}',
      });

      const result = await summarizeImage({ url: realImageDataUrl });

      // 验证返回了 imageSize 字段
      expect(result).toHaveProperty('imageSize');
      expect(typeof result.imageSize).toBe('number');
      // 如果使用真实截图（5.4MB），base64 编码后应该大于 1MB
      // 如果使用 fallback 图片，大小会很小，所以只验证大于 0
      if (isRealImage) {
        expect(result.imageSize).toBeGreaterThan(1000000); // 至少 1MB
      } else {
        expect(result.imageSize).toBeGreaterThan(0); // fallback 图片
      }
    });
  });
});
