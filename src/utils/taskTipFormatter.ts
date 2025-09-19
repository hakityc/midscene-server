/**
 * 任务提示格式化工具
 * 将技术性的任务提示转换为用户友好的消息
 */

export interface TaskTipMapping {
  pattern: RegExp
  template: string
  icon: string
}

/**
 * 任务类型映射配置
 */
const TASK_TIP_MAPPINGS: TaskTipMapping[] = [
  // Planning 阶段
  {
    pattern: /^Planning\s*\/\s*LoadYaml\s*-\s*(.+)$/i,
    template: '📋 正在解析任务配置: {content}',
    icon: '📋'
  },
  {
    pattern: /^Planning\s*\/\s*Plan\s*-\s*(.+)$/i,
    template: '🎯 正在制定执行计划: {content}',
    icon: '🎯'
  },
  {
    pattern: /^Planning\s*-\s*(.+)$/i,
    template: '🎯 正在规划任务: {content}',
    icon: '🎯'
  },

  // Insight 阶段
  {
    pattern: /^Insight\s*\/\s*Locate\s*-\s*(.+)$/i,
    template: '🔍 正在定位元素: {content}',
    icon: '🔍'
  },
  {
    pattern: /^Insight\s*\/\s*Query\s*-\s*(.+)$/i,
    template: '📊 正在查询信息: {content}',
    icon: '📊'
  },
  {
    pattern: /^Insight\s*\/\s*Boolean\s*-\s*(.+)$/i,
    template: '🔍 正在检查条件: {content}',
    icon: '🔍'
  },
  {
    pattern: /^Insight\s*\/\s*Number\s*-\s*(.+)$/i,
    template: '🔢 正在提取数值: {content}',
    icon: '🔢'
  },
  {
    pattern: /^Insight\s*\/\s*String\s*-\s*(.+)$/i,
    template: '📝 正在提取文本: {content}',
    icon: '📝'
  },
  {
    pattern: /^Insight\s*\/\s*Assert\s*-\s*(.+)$/i,
    template: '✅ 正在断言验证: {content}',
    icon: '✅'
  },
  {
    pattern: /^Insight\s*-\s*(.+)$/i,
    template: '🔍 正在感知分析: {content}',
    icon: '🔍'
  },

  // Action 阶段
  {
    pattern: /^Action\s*\/\s*Tap\s*-\s*(.+)$/i,
    template: '👆 正在点击: {content}',
    icon: '👆'
  },
  {
    pattern: /^Action\s*\/\s*Tap$/i,
    template: '👆 正在点击',
    icon: '👆'
  },
  {
    pattern: /^Action\s*\/\s*Hover\s*-\s*(.+)$/i,
    template: '🖱️ 正在悬停: {content}',
    icon: '🖱️'
  },
  {
    pattern: /^Action\s*\/\s*Hover$/i,
    template: '🖱️ 正在悬停',
    icon: '🖱️'
  },
  {
    pattern: /^Action\s*\/\s*Input\s*-\s*(.+)$/i,
    template: '⌨️ 正在输入: {content}',
    icon: '⌨️'
  },
  {
    pattern: /^Action\s*\/\s*KeyboardPress\s*-\s*(.+)$/i,
    template: '⌨️ 正在按键: {content}',
    icon: '⌨️'
  },
  {
    pattern: /^Action\s*\/\s*RightClick\s*-\s*(.+)$/i,
    template: '🖱️ 正在右键点击: {content}',
    icon: '🖱️'
  },
  {
    pattern: /^Action\s*\/\s*RightClick$/i,
    template: '🖱️ 正在右键点击',
    icon: '🖱️'
  },
  {
    pattern: /^Action\s*\/\s*Scroll\s*-\s*(.+)$/i,
    template: '📜 正在滚动: {content}',
    icon: '📜'
  },
  {
    pattern: /^Action\s*\/\s*Scroll$/i,
    template: '📜 正在滚动页面',
    icon: '📜'
  },
  {
    pattern: /^Action\s*\/\s*Sleep\s*-\s*(.+)$/i,
    template: '⏳ 正在等待: {content}',
    icon: '⏳'
  },
  {
    pattern: /^Action\s*\/\s*Sleep$/i,
    template: '⏳ 正在等待',
    icon: '⏳'
  },
  {
    pattern: /^Action\s*\/\s*DragAndDrop\s*-\s*(.+)$/i,
    template: '🔄 正在拖拽: {content}',
    icon: '🔄'
  },
  {
    pattern: /^Action\s*\/\s*AndroidPull\s*-\s*(.+)$/i,
    template: '📱 正在滑动: {content}',
    icon: '📱'
  },
  {
    pattern: /^Action\s*\/\s*Error\s*-\s*(.+)$/i,
    template: '❌ 操作出错: {content}',
    icon: '❌'
  },
  {
    pattern: /^Action\s*\/\s*Finished\s*-\s*(.+)$/i,
    template: '🎉 操作完成: {content}',
    icon: '🎉'
  },
  {
    pattern: /^Action\s*\/\s*Finished$/i,
    template: '🎉 操作完成',
    icon: '🎉'
  },
  {
    pattern: /^Action\s*\/\s*(.+)\s*-\s*(.+)$/i,
    template: '⚡ 正在{content}',
    icon: '⚡'
  },
  {
    pattern: /^Action\s*\/\s*(.+)$/i,
    template: '⚡ 正在执行: {content}',
    icon: '⚡'
  },

  // Log 阶段
  {
    pattern: /^Log\s*\/\s*Screenshot\s*-\s*(.+)$/i,
    template: '📸 正在截图记录: {content}',
    icon: '📸'
  },
  {
    pattern: /^Log\s*\/\s*Screenshot$/i,
    template: '📸 正在截图记录',
    icon: '📸'
  },
  {
    pattern: /^Log\s*-\s*(.+)$/i,
    template: '📝 正在记录日志: {content}',
    icon: '📝'
  },
]

/**
 * 将原始任务提示转换为用户友好的消息
 * @param rawTip 原始任务提示
 * @returns 格式化后的用户友好消息
 */
export function formatTaskTip(rawTip: string): {
  formatted: string
  icon: string
  category: string
} {
  if (!rawTip || typeof rawTip !== 'string') {
    return {
      formatted: '🤖 AI正在处理中...',
      icon: '🤖',
      category: 'unknown'
    }
  }

  const trimmedTip = rawTip.trim()

  // 遍历映射规则
  for (const mapping of TASK_TIP_MAPPINGS) {
    const match = trimmedTip.match(mapping.pattern)
    if (match) {
      const content = match[1] || match[2] || '' // 支持多个捕获组
      let formatted = mapping.template

      // 智能内容替换
      if (content) {
        // 如果模板已经包含冒号，直接替换内容
        if (mapping.template.includes(': {content}')) {
          formatted = mapping.template.replace('{content}', content)
        }
        // 如果模板以{content}结尾，添加冒号和内容
        else if (mapping.template.endsWith('{content}')) {
          formatted = mapping.template.replace('{content}', `: ${content}`)
        }
        // 其他情况直接替换
        else {
          formatted = mapping.template.replace('{content}', content)
        }
      } else {
        // 没有内容时，移除{content}占位符
        formatted = mapping.template.replace('{content}', '').replace(/:\s*$/, '').trim()
      }

      // 确定类别
      const category = getCategoryFromPattern(mapping.pattern)

      return {
        formatted: formatted.trim(),
        icon: mapping.icon,
        category
      }
    }
  }

  // 如果没有匹配的规则，返回默认格式
  return {
    formatted: `🤖 ${trimmedTip}`,
    icon: '🤖',
    category: 'general'
  }
}

/**
 * 从模式中确定任务类别
 */
function getCategoryFromPattern(pattern: RegExp): string {
  const patternStr = pattern.source.toLowerCase()

  if (patternStr.includes('planning')) return 'planning'
  if (patternStr.includes('insight') || patternStr.includes('locate')) return 'insight'
  if (patternStr.includes('action')) return 'action'
  if (patternStr.includes('assert') || patternStr.includes('verify')) return 'verify'
  if (patternStr.includes('extract')) return 'extract'
  if (patternStr.includes('error')) return 'error'
  if (patternStr.includes('retry')) return 'retry'
  if (patternStr.includes('complete')) return 'complete'

  return 'general'
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
    general: '处理中'
  }

  return stageDescriptions[category] || '处理中'
}

