import { WebSocketAction } from '../utils/enums';

/**
 * 客户端类型
 */
export type ClientType = 'web' | 'windows';

/**
 * Action 配置信息
 */
export interface ActionConfig {
  action: WebSocketAction;
  name: string;
  description: string;
  category: 'basic' | 'advanced' | 'system';
}

/**
 * 客户端类型支持的 Actions 配置
 * 这是唯一的配置源，Web 端和服务端都从这里同步
 */
export const CLIENT_TYPE_ACTIONS: Record<ClientType, ActionConfig[]> = {
  web: [
    {
      action: WebSocketAction.CONNECT_TAB,
      name: '连接标签页',
      description: '连接浏览器标签页',
      category: 'system',
    },
    {
      action: WebSocketAction.AI,
      name: 'AI 执行',
      description: '执行 AI 自然语言指令',
      category: 'basic',
    },
    {
      action: WebSocketAction.AI_SCRIPT,
      name: 'AI 脚本',
      description: '执行 AI YAML 脚本',
      category: 'advanced',
    },
    {
      action: WebSocketAction.DOWNLOAD_VIDEO,
      name: '下载视频',
      description: '下载视频资源',
      category: 'advanced',
    },
    {
      action: WebSocketAction.SITE_SCRIPT,
      name: '站点脚本',
      description: '在网页中执行 JavaScript',
      category: 'advanced',
    },
    {
      action: WebSocketAction.COMMAND,
      name: '服务命令',
      description: '控制服务生命周期（启动/停止）',
      category: 'system',
    },
  ],
  windows: [
    {
      action: WebSocketAction.CONNECT_WINDOW,
      name: '连接窗口',
      description: '连接指定的 Windows 窗口',
      category: 'system',
    },
    {
      action: WebSocketAction.AI,
      name: 'AI 执行',
      description: '执行 Windows 桌面 AI 指令',
      category: 'basic',
    },
    {
      action: WebSocketAction.AI_SCRIPT,
      name: 'AI 脚本',
      description: '执行 Windows AI YAML 脚本',
      category: 'advanced',
    },
    {
      action: WebSocketAction.COMMAND,
      name: '服务命令',
      description: '控制 Windows 服务（启动/停止）',
      category: 'system',
    },
    {
      action: WebSocketAction.TEST,
      name: '测试',
      description: '测试 Windows 服务',
      category: 'basic',
    },
  ],
};

/**
 * 获取指定客户端类型支持的所有 Actions
 */
export function getSupportedActions(clientType: ClientType): WebSocketAction[] {
  return CLIENT_TYPE_ACTIONS[clientType].map((config) => config.action);
}

/**
 * 获取指定客户端类型的完整 Action 配置
 */
export function getActionConfigs(clientType: ClientType): ActionConfig[] {
  return CLIENT_TYPE_ACTIONS[clientType];
}

/**
 * 检查指定 action 是否被客户端类型支持
 */
export function isActionSupported(
  clientType: ClientType,
  action: WebSocketAction,
): boolean {
  return getSupportedActions(clientType).includes(action);
}

/**
 * 获取所有客户端类型
 */
export function getAllClientTypes(): ClientType[] {
  return Object.keys(CLIENT_TYPE_ACTIONS) as ClientType[];
}

/**
 * 获取完整的配置（用于 API 返回）
 */
export function getFullActionConfig() {
  return {
    clientTypes: getAllClientTypes(),
    actions: CLIENT_TYPE_ACTIONS,
  };
}

/**
 * 验证消息中的 action 是否合法
 * @returns { valid: boolean, error?: string }
 */
export function validateMessageAction(
  clientType: ClientType,
  action: WebSocketAction,
): { valid: boolean; error?: string } {
  if (!isActionSupported(clientType, action)) {
    const supportedActions = getSupportedActions(clientType).join(', ');
    return {
      valid: false,
      error: `Action '${action}' 不支持 ${clientType} 端。支持的 actions: ${supportedActions}`,
    };
  }
  return { valid: true };
}
