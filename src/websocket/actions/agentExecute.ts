import { mastra } from "../../mastra"
import type { MessageHandler, WebSocketMessage } from '../../types/websocket';
import { wsLogger } from '../../utils/logger';
import {
  createErrorResponse,
  createSuccessResponse,
} from '../builders/messageBuilder';

// AI 请求处理器
export function createAgentExecuteHandler(): MessageHandler {
  return async ({ connectionId, send }, message) => {
    const { meta, payload } = message;
    wsLogger.info(
      {
        connectionId,
        messageId: meta.messageId,
        action: payload.action,
        params: payload.params,
      },
      '处理 AI 请求',
    );

    try {
      const browserAgent = mastra.getAgent("browserAgent")
      const params = payload.params
      await browserAgent.streamVNext(params, {
        onStepFinish: ({ text, toolCalls, toolResults, finishReason }) => {
          console.log("🔧 Tool Step:", {
            textLength: text?.length || 0,
            toolCalls: toolCalls?.length || 0,
            toolResults: toolResults?.length || 0,
            finishReason,
          })
        },
        onFinish: ({ steps, text, finishReason }) => {
          console.log("🏁 Finish:", {
            steps: steps?.length || 0,
            textLength: text?.length || 0,
            finishReason,
          })
          const response = createSuccessResponse(
            message as WebSocketMessage,
            `Agent 处理完成`,
          );
          send(response);
        },
      })
    } catch (error) {
      wsLogger.error(
        {
          connectionId,
          error,
          messageId: meta.messageId,
        },
        'Agent 处理失败',
      );
      const response = createErrorResponse(
        message as WebSocketMessage,
        error,
        'Agent 处理失败',
      );
      send(response);
    }
  };
}
