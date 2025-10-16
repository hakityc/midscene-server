import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  MonitorMessage,
  WsInboundMessage,
  WsOutboundMessage,
} from '@/types/debug';
import {
  formatSentMessage,
  formatWebSocketMessage,
} from '@/utils/messageFormatter';

type WebSocketStatus =
  | 'idle'
  | 'connecting'
  | 'open'
  | 'closing'
  | 'closed'
  | 'error';

interface UseWebSocketReturn {
  status: WebSocketStatus;
  error: string;
  messages: MonitorMessage[];
  connect: () => void;
  disconnect: () => void;
  send: (message: WsInboundMessage) => void;
  clearMessages: () => void;
  clearCompletedMessages: () => void;
}

/**
 * WebSocket 连接管理 Hook
 */
export function useWebSocket(endpoint: string): UseWebSocketReturn {
  const [status, setStatus] = useState<WebSocketStatus>('idle');
  const [error, setError] = useState<string>('');
  const [messages, setMessages] = useState<MonitorMessage[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const messageIdRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const maxReconnectAttempts = 5;

  // 添加消息到监控
  const addMessage = useCallback(
    (
      direction: 'sent' | 'received' | 'info',
      type: 'success' | 'error' | 'info',
      content: string,
      data?: unknown,
    ) => {
      const message: MonitorMessage = {
        id: `msg-${++messageIdRef.current}`,
        timestamp: Date.now(),
        direction,
        type,
        content,
        data,
      };
      setMessages((prev) => [message, ...prev].slice(0, 100)); // 保留最近 100 条
    },
    [],
  );

  // 清理重连定时器
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // 创建 WebSocket 连接的通用函数
  const createWebSocketConnection = useCallback(() => {
    setError('');
    setStatus('connecting');
    addMessage('info', 'info', '正在连接 WebSocket...');

    try {
      const ws = new WebSocket(endpoint);
      socketRef.current = ws;

      ws.onopen = () => {
        setStatus('open');
        reconnectAttemptsRef.current = 0; // 重置重连计数
        addMessage('info', 'success', 'WebSocket 连接成功');
      };

      ws.onclose = (event) => {
        setStatus('closed');
        addMessage('info', 'info', `WebSocket 连接关闭 (code: ${event.code})`);

        // 如果不是主动关闭，则尝试重连
        if (event.code !== 1000 && event.code !== 1001) {
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            const delay = Math.min(
              1000 * 2 ** reconnectAttemptsRef.current,
              10000,
            );
            addMessage(
              'info',
              'info',
              `将在 ${delay / 1000} 秒后重连... (尝试 ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`,
            );

            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current++;
              createWebSocketConnection(); // 直接递归调用
            }, delay);
          } else {
            addMessage('info', 'error', '重连失败，已达到最大重试次数');
          }
        }
      };

      ws.onerror = (event) => {
        setStatus('error');
        const errorMsg = 'WebSocket 连接出错';
        setError(errorMsg);
        addMessage('info', 'error', errorMsg);
        console.error('WebSocket error:', event);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WsOutboundMessage;
          const isSuccess = data.payload.status === 'success';
          const formatted = formatWebSocketMessage(data);

          addMessage(
            'received',
            isSuccess ? 'success' : 'error',
            formatted.title +
              (formatted.description ? `: ${formatted.description}` : ''),
            data,
          );
        } catch {
          addMessage('received', 'info', '收到消息', event.data);
        }
      };
    } catch (e) {
      setStatus('error');
      const errorMsg = e instanceof Error ? e.message : 'WebSocket 初始化失败';
      setError(errorMsg);
      addMessage('info', 'error', errorMsg);
    }
  }, [endpoint, addMessage]);

  // 连接 WebSocket
  const connect = useCallback(() => {
    // 清除之前的重连定时器
    clearReconnectTimeout();

    // 关闭已存在的连接
    if (
      socketRef.current &&
      (socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING)
    ) {
      try {
        socketRef.current.close(1000, 'reconnect');
      } catch {}
    }

    // 使用通用连接函数
    createWebSocketConnection();
  }, [clearReconnectTimeout, createWebSocketConnection]);

  // 断开连接
  const disconnect = useCallback(() => {
    clearReconnectTimeout();
    if (socketRef.current) {
      try {
        socketRef.current.close(1000, 'manual disconnect');
      } catch {}
    }
  }, [clearReconnectTimeout]);

  // 发送消息
  const send = useCallback(
    (message: WsInboundMessage) => {
      setError('');
      const ws = socketRef.current;

      if (!ws || ws.readyState !== WebSocket.OPEN) {
        const errorMsg = 'WebSocket 未连接';
        setError(errorMsg);
        addMessage('info', 'error', errorMsg);
        return;
      }

      try {
        const jsonString = JSON.stringify(message);
        ws.send(jsonString);
        const formatted = formatSentMessage(message.payload.action);
        addMessage('sent', 'info', formatted.title, message);
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : '发送消息失败';
        setError(errorMsg);
        addMessage('info', 'error', errorMsg);
      }
    },
    [addMessage],
  );

  // 清空消息
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // 清除已完成的消息（成功和错误状态）
  const clearCompletedMessages = useCallback(() => {
    setMessages((prev) =>
      prev.filter(
        (msg) =>
          msg.taskStatus === 'running' ||
          msg.taskStatus === 'pending' ||
          (!msg.taskStatus && msg.type === 'info'),
      ),
    );
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      clearReconnectTimeout();
      if (socketRef.current) {
        try {
          socketRef.current.close(1000, 'component unmount');
        } catch {}
      }
    };
  }, [clearReconnectTimeout]);

  return {
    status,
    error,
    messages,
    connect,
    disconnect,
    send,
    clearMessages,
    clearCompletedMessages,
  };
}
