import { useCallback, useEffect, useState } from 'react';
import type { HistoryItem, WsInboundMessage } from '@/types/debug';

const STORAGE_KEY = 'midscene-debug-history';
const MAX_HISTORY = 10;

/**
 * 消息历史记录 Hook
 */
export function useMessageHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // 从 localStorage 加载历史记录
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as HistoryItem[];
        setHistory(parsed);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  }, []);

  // 保存历史记录到 localStorage
  const saveToStorage = useCallback((items: HistoryItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  }, []);

  // 添加历史记录
  const addHistory = useCallback(
    (message: WsInboundMessage, label?: string) => {
      const item: HistoryItem = {
        id: `history-${Date.now()}`,
        timestamp: Date.now(),
        message,
        label,
      };

      setHistory((prev) => {
        const newHistory = [item, ...prev].slice(0, MAX_HISTORY);
        saveToStorage(newHistory);
        return newHistory;
      });
    },
    [saveToStorage],
  );

  // 删除历史记录
  const removeHistory = useCallback(
    (id: string) => {
      setHistory((prev) => {
        const newHistory = prev.filter((item) => item.id !== id);
        saveToStorage(newHistory);
        return newHistory;
      });
    },
    [saveToStorage],
  );

  // 清空历史记录
  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // 获取历史记录
  const getHistory = useCallback(
    (id: string): HistoryItem | undefined => {
      return history.find((item) => item.id === id);
    },
    [history],
  );

  return {
    history,
    addHistory,
    removeHistory,
    clearHistory,
    getHistory,
  };
}

