import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  MessageBuilder,
  createSuccessResponse,
  createErrorResponse,
  createSystemMessage,
  createBroadcastMessage,
  createWelcomeMessage,
  createUnknownActionResponse,
  createParseErrorResponse,
  createProcessingErrorResponse,
  createCommandMessage,
} from '../messageBuilder';
import { WebSocketAction } from '../../../utils/enums';
import type { WsInboundMessage } from '../../../types/websocket';

describe('MessageBuilder', () => {
  let mockInboundMessage: WsInboundMessage;

  beforeEach(() => {
    // Mock Date.now() for consistent timestamps
    vi.spyOn(Date, 'now').mockReturnValue(1000000);

    mockInboundMessage = {
      meta: {
        messageId: 'test-message-id',
        conversationId: 'test-conversation-id',
        timestamp: 1000,
      },
      payload: {
        action: WebSocketAction.AI,
        params: { test: 'data' },
        site: 'https://example.com',
        originalCmd: 'test command',
      },
    };
  });

  describe('createSuccessResponse', () => {
    it('应该创建成功响应消息', () => {
      const result = 'success result';
      const response = createSuccessResponse(mockInboundMessage, result);

      expect(response.meta.messageId).toBe('test-message-id');
      expect(response.meta.conversationId).toBe('test-conversation-id');
      expect(response.meta.timestamp).toBe(1000);
      expect(response.payload.action).toBe(WebSocketAction.CALLBACK);
      expect(response.payload.status).toBe('success');
      expect(response.payload.result).toBe(result);
      expect(response.payload.error).toBeUndefined();
    });

    it('应该支持自定义 action', () => {
      const result = 'test result';
      const customAction = WebSocketAction.AI;
      const response = createSuccessResponse(mockInboundMessage, result, customAction);

      expect(response.payload.action).toBe(customAction);
      expect(response.payload.status).toBe('success');
      expect(response.payload.result).toBe(result);
    });

    it('应该处理对象类型的 result', () => {
      const result = { data: 'test', count: 42 };
      const response = createSuccessResponse(mockInboundMessage, result);

      expect(response.payload.result).toEqual(result);
      expect(response.payload.status).toBe('success');
    });

    it('应该处理数组类型的 result', () => {
      const result = [1, 2, 3, 4, 5];
      const response = createSuccessResponse(mockInboundMessage, result);

      expect(response.payload.result).toEqual(result);
      expect(response.payload.status).toBe('success');
    });
  });

  describe('createErrorResponse', () => {
    it('应该创建错误响应消息（Error 实例）', () => {
      const error = new Error('测试错误');
      const response = createErrorResponse(mockInboundMessage, error);

      expect(response.meta.messageId).toBe('test-message-id');
      expect(response.meta.conversationId).toBe('test-conversation-id');
      expect(response.payload.action).toBe(WebSocketAction.AI);
      expect(response.payload.status).toBe('failed');
      expect(response.payload.error).toBe('操作失败: 测试错误');
      expect(response.payload.result).toBeUndefined();
    });

    it('应该创建错误响应消息（字符串）', () => {
      const error = '字符串错误';
      const response = createErrorResponse(mockInboundMessage, error);

      expect(response.payload.status).toBe('failed');
      expect(response.payload.error).toBe('操作失败: 字符串错误');
    });

    it('应该支持自定义错误前缀', () => {
      const error = new Error('连接失败');
      const prefix = '网络错误';
      const response = createErrorResponse(mockInboundMessage, error, prefix);

      expect(response.payload.error).toBe('网络错误: 连接失败');
    });

    it('应该处理未知类型的错误', () => {
      const error = { code: 500 };
      const response = createErrorResponse(mockInboundMessage, error);

      expect(response.payload.error).toContain('操作失败:');
    });
  });

  describe('createSystemMessage', () => {
    it('应该创建系统消息', () => {
      const messageId = 'system-msg-id';
      const body = '系统通知';
      const response = createSystemMessage(messageId, body);

      expect(response.meta.messageId).toBe(messageId);
      expect(response.meta.conversationId).toBe('system');
      expect(response.payload.action).toBe(WebSocketAction.CALLBACK);
      expect(response.payload.status).toBe('success');
      expect(response.payload.result).toBe(body);
    });

    it('应该支持自定义 action', () => {
      const messageId = 'system-msg-id';
      const body = '系统警告';
      const customAction = WebSocketAction.ERROR;
      const response = createSystemMessage(messageId, body, customAction);

      expect(response.payload.action).toBe(customAction);
      expect(response.meta.conversationId).toBe('system');
    });
  });

  describe('createBroadcastMessage', () => {
    it('应该创建广播消息（字符串）', () => {
      const message = '广播内容';
      const response = createBroadcastMessage(message);

      expect(response.meta.conversationId).toBe('broadcast');
      expect(response.payload.action).toBe(WebSocketAction.CALLBACK);
      expect(response.payload.status).toBe('success');
      expect(response.payload.result).toBe(message);
      expect(response.meta.messageId).toContain('broadcast_');
    });

    it('应该创建广播消息（对象）', () => {
      const message = { type: 'notification', data: 'test' };
      const response = createBroadcastMessage(message);

      expect(response.payload.result).toBe(JSON.stringify(message));
      expect(response.meta.conversationId).toBe('broadcast');
    });

    it('应该为每条广播消息生成唯一的 messageId', () => {
      const response1 = createBroadcastMessage('message 1');
      vi.spyOn(Date, 'now').mockReturnValue(1000001);
      const response2 = createBroadcastMessage('message 2');

      expect(response1.meta.messageId).not.toBe(response2.meta.messageId);
    });
  });

  describe('createWelcomeMessage', () => {
    it('应该创建欢迎消息', () => {
      const connectionId = 'conn-123';
      const response = createWelcomeMessage(connectionId);

      expect(response.meta.conversationId).toBe('system');
      expect(response.payload.action).toBe(WebSocketAction.CALLBACK);
      expect(response.payload.status).toBe('success');
      expect(response.meta.messageId).toContain('welcome_');

      const resultData = JSON.parse(response.payload.result as string);
      expect(resultData.connectionId).toBe(connectionId);
      expect(resultData.message).toBe('连接已建立');
      expect(resultData.serverTime).toBeDefined();
    });

    it('欢迎消息应包含有效的 ISO 时间戳', () => {
      const connectionId = 'conn-456';
      const response = createWelcomeMessage(connectionId);

      const resultData = JSON.parse(response.payload.result as string);
      const timestamp = new Date(resultData.serverTime);
      expect(timestamp.toString()).not.toBe('Invalid Date');
    });
  });

  describe('createUnknownActionResponse', () => {
    it('应该创建未知动作响应', () => {
      const unknownAction = 'unknownAction';
      const response = createUnknownActionResponse(mockInboundMessage, unknownAction);

      expect(response.meta.messageId).toBe('test-message-id');
      expect(response.meta.conversationId).toBe('test-conversation-id');
      expect(response.payload.action).toBe(unknownAction);
      expect(response.payload.status).toBe('failed');
      expect(response.payload.error).toBe(`未知的 action 类型: ${unknownAction}`);
    });
  });

  describe('createParseErrorResponse', () => {
    it('应该创建解析错误响应（Error 实例）', () => {
      const error = new Error('JSON 解析失败');
      const response = createParseErrorResponse(error);

      expect(response.meta.conversationId).toBe('system');
      expect(response.payload.action).toBe(WebSocketAction.ERROR);
      expect(response.payload.status).toBe('failed');
      expect(response.payload.error).toBe('消息解析失败: JSON 解析失败');
      expect(response.meta.messageId).toContain('parse_error_');
    });

    it('应该创建解析错误响应（字符串）', () => {
      const error = '无效的消息格式';
      const response = createParseErrorResponse(error);

      expect(response.payload.error).toBe('消息解析失败: 无效的消息格式');
    });

    it('应该忽略 connectionId 参数', () => {
      const error = new Error('解析失败');
      const connectionId = 'conn-789';
      const response = createParseErrorResponse(error, connectionId);

      expect(response.meta.conversationId).toBe('system');
      expect(response.payload.error).toContain('消息解析失败');
    });
  });

  describe('createProcessingErrorResponse', () => {
    it('应该创建处理失败响应（Error 实例）', () => {
      const error = new Error('处理超时');
      const response = createProcessingErrorResponse(mockInboundMessage, error);

      expect(response.meta.messageId).toBe('test-message-id');
      expect(response.meta.conversationId).toBe('test-conversation-id');
      expect(response.payload.action).toBe(WebSocketAction.AI);
      expect(response.payload.status).toBe('failed');
      expect(response.payload.error).toBe('消息处理失败: 处理超时');
    });

    it('应该创建处理失败响应（字符串）', () => {
      const error = '资源不足';
      const response = createProcessingErrorResponse(mockInboundMessage, error);

      expect(response.payload.error).toBe('消息处理失败: 资源不足');
    });
  });

  describe('createCommandMessage', () => {
    it('应该创建指令消息', () => {
      const result = 'command executed';
      const response = createCommandMessage(mockInboundMessage, result);

      expect(response.meta.messageId).toBe('test-message-id');
      expect(response.meta.conversationId).toBe('test-conversation-id');
      expect(response.payload.action).toBe(WebSocketAction.COMMAND);
      expect(response.payload.status).toBe('success');
      expect(response.payload.result).toBe(result);
    });
  });

  describe('MessageBuilder 对象', () => {
    it('应该导出所有必要的方法', () => {
      expect(MessageBuilder.createSuccessResponse).toBe(createSuccessResponse);
      expect(MessageBuilder.createErrorResponse).toBe(createErrorResponse);
      expect(MessageBuilder.createSystemMessage).toBe(createSystemMessage);
      expect(MessageBuilder.createBroadcastMessage).toBe(createBroadcastMessage);
      expect(MessageBuilder.createWelcomeMessage).toBe(createWelcomeMessage);
      expect(MessageBuilder.createUnknownActionResponse).toBe(createUnknownActionResponse);
      expect(MessageBuilder.createParseErrorResponse).toBe(createParseErrorResponse);
      expect(MessageBuilder.createProcessingErrorResponse).toBe(createProcessingErrorResponse);
      expect(MessageBuilder.createCommandMessage).toBe(createCommandMessage);
    });
  });

  describe('边界情况测试', () => {
    it('应该处理空字符串 result', () => {
      const response = createSuccessResponse(mockInboundMessage, '');
      expect(response.payload.result).toBe('');
      expect(response.payload.status).toBe('success');
    });

    it('应该处理 null result', () => {
      const response = createSuccessResponse(mockInboundMessage, null);
      expect(response.payload.result).toBe(null);
      expect(response.payload.status).toBe('success');
    });

    it('应该处理 undefined result', () => {
      const response = createSuccessResponse(mockInboundMessage, undefined);
      expect(response.payload.result).toBe(undefined);
      expect(response.payload.status).toBe('success');
    });

    it('应该处理复杂嵌套对象', () => {
      const complexResult = {
        level1: {
          level2: {
            level3: {
              data: [1, 2, 3],
              info: { key: 'value' },
            },
          },
        },
      };
      const response = createSuccessResponse(mockInboundMessage, complexResult);
      expect(response.payload.result).toEqual(complexResult);
    });
  });
});

