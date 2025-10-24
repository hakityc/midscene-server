/**
 * 任务提示配置
 */

export interface TaskTipConfig {
  /**
   * 机器人自称名字
   */
  botName: string;
}

/**
 * 默认配置
 */
export const defaultTaskTipConfig: TaskTipConfig = {
  botName: '小乐',
};

/**
 * 当前使用的配置（可由外部覆盖）
 */
let currentConfig: TaskTipConfig = { ...defaultTaskTipConfig };

/**
 * 设置任务提示配置
 * @param config 新配置
 */
export function setTaskTipConfig(config: Partial<TaskTipConfig>): void {
  currentConfig = {
    ...currentConfig,
    ...config,
  };
}

/**
 * 获取当前任务提示配置
 */
export function getTaskTipConfig(): TaskTipConfig {
  return { ...currentConfig };
}

/**
 * 重置为默认配置
 */
export function resetTaskTipConfig(): void {
  currentConfig = { ...defaultTaskTipConfig };
}
