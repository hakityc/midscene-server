import { useEffect, useState } from 'react';
import type { ClientType } from '@/types/debug';

/**
 * Flow Action 配置信息
 */
export interface FlowActionConfig {
  type: string;
  label: string;
  description: string;
  category: 'basic' | 'query' | 'advanced' | 'utility' | 'windows-specific';
  params: Array<{
    name: string;
    label: string;
    type: 'string' | 'number' | 'boolean' | 'object';
    required: boolean;
    placeholder?: string;
    description?: string;
    /** 是否属于 options 对象 */
    isOption?: boolean;
    /** 参数默认值 */
    defaultValue?: any;
  }>;
  example?: string;
}

/**
 * 完整的配置响应
 */
export interface ClientTypeFlowActionsConfig {
  clientTypes: ClientType[];
  flowActions: Record<ClientType, FlowActionConfig[]>;
}

/**
 * Hook 来获取客户端类型支持的 Flow Actions
 */
export function useClientTypeFlowActions(
  apiUrl: string = 'http://localhost:3000',
) {
  const [config, setConfig] = useState<ClientTypeFlowActionsConfig | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${apiUrl}/api/client-type-flow-actions`);

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
   * 获取指定客户端类型支持的 Flow Actions
   */
  const getFlowActionsForClientType = (
    clientType: ClientType,
  ): FlowActionConfig[] => {
    if (!config) return [];
    return config.flowActions[clientType] || [];
  };

  /**
   * 获取指定客户端类型支持的 Flow Action 类型列表
   */
  const getFlowActionTypesForClientType = (
    clientType: ClientType,
  ): string[] => {
    return getFlowActionsForClientType(clientType).map((cfg) => cfg.type);
  };

  /**
   * 按类别分组 flow actions
   */
  const getFlowActionsByCategory = (clientType: ClientType) => {
    const actions = getFlowActionsForClientType(clientType);
    return {
      basic: actions.filter((a) => a.category === 'basic'),
      query: actions.filter((a) => a.category === 'query'),
      advanced: actions.filter((a) => a.category === 'advanced'),
      utility: actions.filter((a) => a.category === 'utility'),
      'windows-specific': actions.filter(
        (a) => a.category === 'windows-specific',
      ),
    };
  };

  /**
   * 获取指定 Flow Action 的配置
   */
  const getFlowActionConfig = (
    clientType: ClientType,
    actionType: string,
  ): FlowActionConfig | undefined => {
    return getFlowActionsForClientType(clientType).find(
      (cfg) => cfg.type === actionType,
    );
  };

  /**
   * 检查某个 action 是否被客户端类型支持
   */
  const isFlowActionSupported = (
    clientType: ClientType,
    actionType: string,
  ): boolean => {
    return getFlowActionsForClientType(clientType).some(
      (cfg) => cfg.type === actionType,
    );
  };

  /**
   * 获取类别的显示名称
   */
  const getCategoryLabel = (category: FlowActionConfig['category']): string => {
    const labels: Record<FlowActionConfig['category'], string> = {
      basic: '基础操作',
      query: '查询操作',
      advanced: '高级操作',
      utility: '工具方法',
      'windows-specific': 'Windows 特有',
    };
    return labels[category];
  };

  /**
   * 获取 action 的主要参数（非 options）
   */
  const getMainParams = (
    clientType: ClientType,
    actionType: string,
  ): FlowActionConfig['params'] => {
    const actionConfig = getFlowActionConfig(clientType, actionType);
    if (!actionConfig) return [];
    return actionConfig.params.filter((p) => !p.isOption);
  };

  /**
   * 获取 action 的 options 参数
   */
  const getOptionParams = (
    clientType: ClientType,
    actionType: string,
  ): FlowActionConfig['params'] => {
    const actionConfig = getFlowActionConfig(clientType, actionType);
    if (!actionConfig) return [];
    return actionConfig.params.filter((p) => p.isOption);
  };

  /**
   * 检查 action 是否有 options 参数
   */
  const hasOptions = (clientType: ClientType, actionType: string): boolean => {
    return getOptionParams(clientType, actionType).length > 0;
  };

  /**
   * 检查客户端类型是否支持 xpath
   */
  const supportsXPath = (clientType: ClientType): boolean => {
    return clientType === 'web';
  };

  return {
    config,
    loading,
    error,
    getFlowActionsForClientType,
    getFlowActionTypesForClientType,
    getFlowActionsByCategory,
    getFlowActionConfig,
    isFlowActionSupported,
    getCategoryLabel,
    getMainParams,
    getOptionParams,
    hasOptions,
    supportsXPath,
  };
}
