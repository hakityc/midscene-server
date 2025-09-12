import type { MessageHandler } from '../../types/websocket';
import { wsLogger } from '../../utils/logger';
import {
  createErrorResponse,
  createSuccessResponse,
} from '../builders/messageBuilder';
// import { mastra } from '../../mastra';
import { WebSocketAction } from '../../utils/enums';

// 处理抖音链接，提取域名和 modal_id 参数
function normalizeDouyinUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const search = urlObj.searchParams.get('search');

    if (!search) {
      return url;
    }
    // 检查是否是抖音域名
    if (!urlObj.hostname.includes('douyin.com')) {
      return url; // 如果不是抖音链接，直接返回原链接
    }

    // 提取 modal_id 参数
    const modalId = urlObj.searchParams.get('modal_id');

    if (modalId) {
      console.log('有 modalId');
      // 返回标准格式：https://www.douyin.com/jingxuan?modal_id=xxx
      return `https://www.douyin.com/jingxuan?modal_id=${modalId}`;
    }

    // 如果没有 modal_id 参数，返回原链接
    return url;
  } catch (error) {
    wsLogger.warn({ url, error }, 'URL 解析失败，返回原链接');
    return url;
  }
}

// AI 请求处理器
export function createDownloadVideoHandler(): MessageHandler {
  return async ({ connectionId, send }, message) => {
    wsLogger.info(
      {
        connectionId,
        messageId: message.message_id,
        action: 'ai_request',
      },
      '处理 视频下载 请求',
    );

    try {
      // const videoDownloadAgent = mastra.getAgent('videoDownloadAgent');
      const originalUrl = message.content.body;

      // 标准化抖音链接
      const normalizedUrl = normalizeDouyinUrl(originalUrl);

      wsLogger.info(
        {
          originalUrl,
          normalizedUrl,
        },
        'URL 标准化处理',
      );

      await fetch(
        'https://meishijiao.cn/api/v1/parse?url=' +
          encodeURIComponent(normalizedUrl),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: normalizedUrl,
          }),
        }
      )
        .then((res) => res.json())
        .then((res) => {
          const data = res.data;
          wsLogger.info(res);
          // 检查多个可能的视频URL字段
          const videoUrl = data?.play_url || data?.download_url;
          if (videoUrl) {
            send(
              createSuccessResponse(
                message,
                videoUrl,
                WebSocketAction.DOWNLOAD_VIDEO_CALLBACK,
              ),
            );
          } else {
            const errorMsg = res.msg || res.message || '未找到视频URL';
            wsLogger.error({ data, response: res }, 'API响应中未找到视频URL');
            throw new Error(errorMsg);
          }
        })
        .catch((error) => {
          wsLogger.error(error);
          console.log(error);
          throw error;
        });
      // wsLogger.info({
      //   connectionId,
      //   messageId: message.message_id,
      //   promptLength: prompt.length
      // }, '开始处理 AI 请求');

      // 使用流式响应处理
      // const response = await videoDownloadAgent.streamVNext(prompt, {
      //   onStepFinish: ({ text, toolCalls, toolResults, finishReason }) => {
      //     wsLogger.info({
      //       textLength: text || 0,
      //       toolCalls: toolCalls || 0,
      //       toolResults: toolResults || 0,
      //       finishReason
      //     }, 'Step Finish');

      //     const response = createSuccessResponse(
      //       message,
      //       `AI 正在处理: ${text || '处理中...'}`,
      //     );
      //     send(response);
      //   },
      //   onFinish: ({ steps, text, finishReason }) => {
      //     wsLogger.info({
      //       steps: steps || 0,
      //       textLength: text || 0,
      //       finishReason
      //     }, 'Finish');

      //     const response = createSuccessResponse(
      //       message,
      //       `AI 处理完成: ${text || '处理完成'}`,
      //     );
      //     send(response);
      //   },
      // });

      // // 处理流式响应
      // let fullText = '';
      // try {
      //   for await (const chunk of response.textStream) {
      //     fullText += chunk;
      //     // 实时发送响应
      //     const response = createSuccessResponse(
      //       message,
      //       chunk,
      //     );
      //     send(response);
      //   }

      //   wsLogger.info({
      //     connectionId,
      //     messageId: message.message_id,
      //     totalLength: fullText.length
      //   }, '流式响应处理完成');

      // } catch (streamError) {
      //   wsLogger.error({
      //     connectionId,
      //     messageId: message.message_id,
      //     error: streamError
      //   }, '流式响应处理失败');
      //   throw streamError;
      // }
    } catch (error) {
      const errorInfo =
        error instanceof Error
          ? {
              message: error.message,
              name: error.name,
              code: (error as any).code,
              stack: error.stack,
            }
          : {
              message: String(error),
              name: 'UnknownError',
              code: undefined,
              stack: undefined,
            };

      wsLogger.error(
        {
          connectionId,
          error: errorInfo,
          messageId: message.message_id,
        },
        'AI 处理失败',
      );

      const response = createErrorResponse(message, error, 'AI 处理失败');
      send(response);
    }
  };
}
