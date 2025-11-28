/**
 * 任务提示格式化工具
 * 将技术性的任务提示转换为用户友好的消息
 */

import {
  getTaskTipConfig,
  resetTaskTipConfig,
  setTaskTipConfig,
  type TaskTipConfig,
} from './taskTipConfig';

// 导出配置相关函数供外部使用
export { setTaskTipConfig, resetTaskTipConfig, type TaskTipConfig };

export interface TaskTipMapping {
  pattern: RegExp;
  template: string;
  icon: string;
}

/**
 * 任务类型映射配置
 */
const TASK_TIP_MAPPINGS: TaskTipMapping[] = [
  // Planning 阶段
  {
    pattern: /^Planning\s*\/\s*LoadYaml\s*-\s*(.+)$/i,
    template: '正在准备任务',
    icon: '📋',
  },
  {
    pattern: /^Planning\s*\/\s*Plan\s*-\s*(.+)$/i,
    template: '正在规划操作步骤',
    icon: '🎯',
  },
  {
    pattern: /^Planning\s*-\s*(.+)$/i,
    template: '正在准备操作',
    icon: '🎯',
  },

  // Insight 阶段
  {
    pattern: /^Insight\s*\/\s*Locate\s*-\s*(.+)$/i,
    template: '正在查找页面元素',
    icon: '🔍',
  },
  {
    pattern: /^Insight\s*\/\s*Query\s*-\s*(.+)$/i,
    template: '正在读取页面信息',
    icon: '📊',
  },
  {
    pattern: /^Insight\s*\/\s*Boolean\s*-\s*(.+)$/i,
    template: '正在检查页面内容',
    icon: '🔍',
  },
  {
    pattern: /^Insight\s*\/\s*Number\s*-\s*(.+)$/i,
    template: '正在读取数值',
    icon: '🔢',
  },
  {
    pattern: /^Insight\s*\/\s*String\s*-\s*(.+)$/i,
    template: '正在读取文本',
    icon: '📝',
  },
  {
    pattern: /^Insight\s*\/\s*Assert\s*-\s*(.+)$/i,
    template: '正在检查页面内容',
    icon: '✅',
  },
  {
    pattern: /^Insight\s*-\s*(.+)$/i,
    template: '正在识别页面元素',
    icon: '🔍',
  },

  // Action 阶段
  {
    pattern: /^Action\s*\/\s*Tap\s*-\s*(.+)$/i,
    template: '正在点击',
    icon: '👆',
  },
  {
    pattern: /^Action\s*\/\s*Tap$/i,
    template: '正在点击',
    icon: '👆',
  },
  {
    pattern: /^Action\s*\/\s*Hover\s*-\s*(.+)$/i,
    template: '正在悬停',
    icon: '🖱️',
  },
  {
    pattern: /^Action\s*\/\s*Hover$/i,
    template: '正在悬停',
    icon: '🖱️',
  },
  {
    pattern: /^Action\s*\/\s*Input\s*-\s*(.+)$/i,
    template: '正在输入',
    icon: '⌨️',
  },
  {
    pattern: /^Action\s*\/\s*Input$/i,
    template: '正在输入',
    icon: '⌨️',
  },
  {
    pattern: /^Action\s*\/\s*KeyboardPress\s*-\s*(.+)$/i,
    template: '正在按键',
    icon: '⌨️',
  },
  {
    pattern: /^Action\s*\/\s*KeyboardPress$/i,
    template: '正在按键',
    icon: '⌨️',
  },
  {
    pattern: /^Action\s*\/\s*RightClick\s*-\s*(.+)$/i,
    template: '正在右键点击',
    icon: '🖱️',
  },
  {
    pattern: /^Action\s*\/\s*RightClick$/i,
    template: '正在右键点击',
    icon: '🖱️',
  },
  {
    pattern: /^Action\s*\/\s*Scroll\s*-\s*(.+)$/i,
    template: '正在滚动页面',
    icon: '📜',
  },
  {
    pattern: /^Action\s*\/\s*Scroll$/i,
    template: '正在滚动页面',
    icon: '📜',
  },
  {
    pattern: /^Action\s*\/\s*Sleep\s*-\s*(.+)$/i,
    template: '正在等待',
    icon: '⏳',
  },
  {
    pattern: /^Action\s*\/\s*Sleep$/i,
    template: '正在等待',
    icon: '⏳',
  },
  {
    pattern: /^Action\s*\/\s*DragAndDrop\s*-\s*(.+)$/i,
    template: '正在拖拽',
    icon: '🔄',
  },
  {
    pattern: /^Action\s*\/\s*DragAndDrop$/i,
    template: '正在拖拽',
    icon: '🔄',
  },
  {
    pattern: /^Action\s*\/\s*Swipe\s*-\s*(.+)$/i,
    template: '正在滑动',
    icon: '👆',
  },
  {
    pattern: /^Action\s*\/\s*Swipe$/i,
    template: '正在滑动',
    icon: '👆',
  },
  {
    pattern: /^Action\s*\/\s*AndroidPull\s*-\s*(.+)$/i,
    template: '正在滑动页面',
    icon: '📱',
  },
  {
    pattern: /^Action\s*\/\s*AndroidPull$/i,
    template: '正在滑动页面',
    icon: '📱',
  },
  {
    pattern: /^Action\s*\/\s*Error\s*-\s*(.+)$/i,
    template: '操作遇到问题，正在自动重试',
    icon: '❌',
  },
  {
    pattern: /^Action\s*\/\s*Finished\s*-\s*(.+)$/i,
    template: '操作完成',
    icon: '🎉',
  },
  {
    pattern: /^Action\s*\/\s*Finished$/i,
    template: '操作完成',
    icon: '🎉',
  },
  {
    pattern: /^Action\s*\/\s*(.+)\s*-\s*(.+)$/i,
    template: '正在执行操作',
    icon: '⚡',
  },
  {
    pattern: /^Action\s*\/\s*(.+)$/i,
    template: '正在执行操作',
    icon: '⚡',
  },

  // Log 阶段
  {
    pattern: /^Log\s*\/\s*Screenshot\s*-\s*(.+)$/i,
    template: '正在保存截图',
    icon: '📸',
  },
  {
    pattern: /^Log\s*\/\s*Screenshot$/i,
    template: '正在保存截图',
    icon: '📸',
  },
  {
    pattern: /^Log\s*-\s*(.+)$/i,
    template: '正在记录操作',
    icon: '📝',
  },
];

/**
 * 将原始任务提示转换为用户友好的消息
 * @param rawTip 原始任务提示
 * @returns 格式化后的用户友好消息
 */
export function formatTaskTip(rawTip: string): {
  formatted: string;
  icon: string;
  category: string;
  content: string;
  hint: string;
} {
  if (!rawTip || typeof rawTip !== 'string') {
    const config = getTaskTipConfig();
    return {
      formatted: `${config.botName}本地任务`,
      icon: '🤖',
      category: 'unknown',
      content: '',
      hint: '',
    };
  }

  const trimmedTip = rawTip.trim();
  const config = getTaskTipConfig();

  // 遍历映射规则
  for (const mapping of TASK_TIP_MAPPINGS) {
    const match = trimmedTip.match(mapping.pattern);
    if (match) {
      // 支持多个捕获组，提取原始详细内容
      // 优先使用第二个捕获组（通常是更详细的描述），然后是第一个捕获组
      const content = match[2] || match[1] || '';

      // 确定类别
      const category = getCategoryFromPattern(mapping.pattern);

      return {
        formatted: `${config.botName}${mapping.template}`, // 添加机器人名字前缀
        icon: mapping.icon,
        category,
        content, // 保留原始详细内容用于日志
        hint: '', // 预留字段，暂时返回空字符串
      };
    }
  }

  // 如果没有匹配的规则，返回默认格式
  return {
    formatted: `${config.botName}本地任务`,
    icon: '🤖',
    category: 'general',
    content: trimmedTip,
    hint: '',
  };
}

/**
 * 从模式中确定任务类别
 */
function getCategoryFromPattern(pattern: RegExp): string {
  const patternStr = pattern.source.toLowerCase();

  if (patternStr.includes('planning')) return 'planning';
  if (patternStr.includes('insight') || patternStr.includes('locate'))
    return 'insight';
  if (patternStr.includes('action')) return 'action';
  if (patternStr.includes('assert') || patternStr.includes('verify'))
    return 'verify';
  if (patternStr.includes('extract')) return 'extract';
  if (patternStr.includes('error')) return 'error';
  if (patternStr.includes('retry')) return 'retry';
  if (patternStr.includes('complete')) return 'complete';

  return 'general';
}

/**
 * 获取任务进度阶段描述
 */
export function getTaskStageDescription(category: string): string {
  const stageDescriptions: Record<string, string> = {
    planning: '任务规划阶段',
    insight: '元素定位阶段',
    action: '执行操作阶段',
    verify: '结果验证阶段',
    extract: '信息提取阶段',
    error: '错误处理阶段',
    retry: '重试处理阶段',
    complete: '任务完成阶段',
    general: '处理中',
  };

  return stageDescriptions[category] || '处理中';
}
