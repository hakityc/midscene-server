import { useEffect, useState } from 'react';
import type { ClientType } from '@/types/debug';

/**
 * Action 配置信息
 */
export interface ActionConfig {
  action: string;
  name: string;
  description: string;
  category: 'basic' | 'advanced' | 'system';
}

/**
 * 完整的配置响应
 */
export interface ClientTypeActionsConfig {
  clientTypes: ClientType[];
  actions: Record<ClientType, ActionConfig[]>;
}

/**
 * Hook 来获取客户端类型支持的 Actions
 */
export function useClientTypeActions(apiUrl: string = 'http://localhost:3000') {
  const [config, setConfig] = useState<ClientTypeActionsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${apiUrl}/api/client-type-actions`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          setConfig(result.data);
          setError(null);
        } else {
          throw new Error(result.error || '获取配置失败');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '未知错误');
        setConfig(null);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [apiUrl]);

  /**
   * 获取指定客户端类型支持的 Actions
   */
  const getActionsForClientType = (clientType: ClientType): ActionConfig[] => {
    if (!config) return [];
    return config.actions[clientType] || [];
  };

  /**
   * 获取指定客户端类型支持的 Action 名称列表
   */
  const getActionNamesForClientType = (clientType: ClientType): string[] => {
    return getActionsForClientType(clientType).map((cfg) => cfg.action);
  };

  /**
   * 检查某个 action 是否被客户端类型支持
   */
  const isActionSupported = (clientType: ClientType, action: string): boolean => {
    return getActionNamesForClientType(clientType).includes(action);
  };

  /**
   * 按类别分组 actions
   */
  const getActionsByCategory = (clientType: ClientType) => {
    const actions = getActionsForClientType(clientType);
    return {
      basic: actions.filter((a) => a.category === 'basic'),
      advanced: actions.filter((a) => a.category === 'advanced'),
      system: actions.filter((a) => a.category === 'system'),
    };
  };

  return {
    config,
    loading,
    error,
    getActionsForClientType,
    getActionNamesForClientType,
    isActionSupported,
    getActionsByCategory,
  };
}

