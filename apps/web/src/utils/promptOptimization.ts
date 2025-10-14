import type { FlowActionType } from '@/types/debug';

// 优化建议类型
export interface OptimizationSuggestion {
  type: 'precision' | 'completeness' | 'clarity' | 'structure';
  issue: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
  example?: string;
}

// 质量评分
export interface QualityScore {
  precision: number; // 精确性 (0-100)
  completeness: number; // 完整性 (0-100)
  clarity: number; // 清晰度 (0-100)
  overall: number; // 总分 (0-100)
}

// 优化规则
interface OptimizationRule {
  pattern: RegExp;
  issue: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
  actionTypes?: FlowActionType[];
  type: 'precision' | 'completeness' | 'clarity' | 'structure';
}

// 通用优化规则
const generalRules: OptimizationRule[] = [
  {
    pattern: /(这个|那个|它|他|这里|那里)/,
    issue: '包含模糊指代词',
    suggestion: '替换为具体的元素描述，如"蓝色的提交按钮"而不是"这个按钮"',
    priority: 'high',
    type: 'precision',
  },
  {
    pattern: /(某|一些|有的|可能)/,
    issue: '使用了不确定的词汇',
    suggestion: '使用明确的描述，避免"某个"、"一些"等模糊表达',
    priority: 'high',
    type: 'precision',
  },
  {
    pattern: /^.{1,8}$/,
    issue: '提示词过于简短',
    suggestion: '提示词太短可能缺少必要的上下文信息，建议添加位置、特征等描述',
    priority: 'medium',
    type: 'completeness',
  },
];

// aiTap 优化规则
const aiTapRules: OptimizationRule[] = [
  {
    pattern: /^(点击|单击|按).{1,10}$/,
    issue: '缺少位置或上下文信息',
    suggestion:
      '添加元素的位置（如"页面顶部"、"导航栏中"）和视觉特征（如颜色、图标）',
    priority: 'high',
    type: 'completeness',
  },
  {
    pattern: /点击.*(按钮|图标|链接)/,
    issue: '可以添加更多视觉特征',
    suggestion:
      '添加颜色、大小、图标类型等视觉特征，如"蓝色的"、"带有放大镜图标的"',
    priority: 'medium',
    type: 'precision',
  },
];

// aiInput 优化规则
const aiInputRules: OptimizationRule[] = [
  {
    pattern: /输入(?!.*["'「」])/,
    issue: '未明确指定输入内容',
    suggestion: '使用引号明确输入内容，如：在搜索框中输入"JavaScript 教程"',
    priority: 'high',
    type: 'completeness',
  },
  {
    pattern: /^(输入|填写).{1,15}$/,
    issue: '缺少输入框定位信息',
    suggestion: '添加输入框的标签、placeholder 或位置信息来精确定位',
    priority: 'high',
    type: 'precision',
  },
];

// aiAssert 优化规则
const aiAssertRules: OptimizationRule[] = [
  {
    pattern: /^(检查|判断|验证|确认)/,
    issue: '缺少明确的判断标准',
    suggestion:
      '添加明确的 True/False 判断条件：\n- True 的条件是什么\n- False 的条件是什么\n- 如何处理边界情况',
    priority: 'high',
    type: 'structure',
  },
  {
    pattern: /(包含|显示|出现)(?!.*完全|完整|精确)/,
    issue: '使用了可能产生歧义的词汇',
    suggestion: '明确是"完全包含"还是"部分包含"，"完全显示"还是"部分可见"',
    priority: 'high',
    type: 'precision',
  },
  {
    pattern: /检查.*(?!True|False|真|假|成功|失败)/,
    issue: '未说明返回值含义',
    suggestion: '明确说明什么情况返回 True，什么情况返回 False',
    priority: 'high',
    type: 'structure',
  },
];

// aiHover 优化规则
const aiHoverRules: OptimizationRule[] = [
  {
    pattern: /^(悬停|移动|hover).{1,15}$/,
    issue: '缺少元素定位信息',
    suggestion: '添加要悬停元素的位置和特征描述',
    priority: 'high',
    type: 'completeness',
  },
];

// aiScroll 优化规则
const aiScrollRules: OptimizationRule[] = [
  {
    pattern: /^(滚动|翻页).{1,10}$/,
    issue: '缺少滚动目标或范围',
    suggestion:
      '说明滚动的容器（整个页面还是某个区域）和目标（滚动多少或到什么位置）',
    priority: 'high',
    type: 'completeness',
  },
];

// aiWaitFor 优化规则
const aiWaitForRules: OptimizationRule[] = [
  {
    pattern: /^等待/,
    issue: '缺少等待条件或超时时间',
    suggestion:
      '添加：\n1. 明确的等待条件（什么元素出现/消失/变化）\n2. 超时时间（建议 10-30 秒）',
    priority: 'high',
    type: 'completeness',
  },
  {
    pattern: /等待.*完成/,
    issue: '"完成"的定义不明确',
    suggestion: '明确说明"完成"的具体标志，如"加载动画消失"、"数据列表显示"等',
    priority: 'high',
    type: 'precision',
  },
];

// aiKeyboardPress 优化规则
const aiKeyboardPressRules: OptimizationRule[] = [
  {
    pattern: /^(按|按下).{1,10}$/,
    issue: '缺少操作上下文',
    suggestion: '说明在什么场景下按键，如"在搜索框中按 Enter"',
    priority: 'medium',
    type: 'completeness',
  },
];

// 动作类型规则映射
const actionRulesMap: Record<FlowActionType, OptimizationRule[]> = {
  aiTap: aiTapRules,
  aiInput: aiInputRules,
  aiAssert: aiAssertRules,
  aiHover: aiHoverRules,
  aiScroll: aiScrollRules,
  aiWaitFor: aiWaitForRules,
  aiKeyboardPress: aiKeyboardPressRules,
  sleep: [],
};

/**
 * 分析提示词并返回优化建议
 */
export function analyzePrompt(
  prompt: string,
  targetAction: string,
): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];
  const actionType = targetAction as FlowActionType;

  // 应用通用规则
  for (const rule of generalRules) {
    if (rule.pattern.test(prompt)) {
      suggestions.push({
        type: rule.type,
        issue: rule.issue,
        suggestion: rule.suggestion,
        priority: rule.priority,
      });
    }
  }

  // 应用特定动作类型的规则
  if (targetAction !== 'all' && actionRulesMap[actionType]) {
    for (const rule of actionRulesMap[actionType]) {
      if (rule.pattern.test(prompt)) {
        suggestions.push({
          type: rule.type,
          issue: rule.issue,
          suggestion: rule.suggestion,
          priority: rule.priority,
        });
      }
    }
  }

  return suggestions;
}

/**
 * 计算提示词质量评分
 */
export function calculateQualityScore(
  prompt: string,
  targetAction: string,
): QualityScore {
  let precision = 100;
  let completeness = 100;
  let clarity = 100;

  const suggestions = analyzePrompt(prompt, targetAction);

  // 根据建议扣分
  for (const suggestion of suggestions) {
    const deduction =
      suggestion.priority === 'high'
        ? 20
        : suggestion.priority === 'medium'
          ? 10
          : 5;

    switch (suggestion.type) {
      case 'precision':
        precision -= deduction;
        break;
      case 'completeness':
        completeness -= deduction;
        break;
      case 'clarity':
        clarity -= deduction;
        break;
      case 'structure':
        completeness -= deduction / 2;
        clarity -= deduction / 2;
        break;
    }
  }

  // 长度加分
  if (prompt.length > 20) {
    completeness = Math.min(100, completeness + 5);
  }
  if (prompt.length > 50) {
    completeness = Math.min(100, completeness + 5);
  }

  // 包含位置信息加分
  if (/(页面|顶部|底部|左侧|右侧|导航|表单|列表|中)/.test(prompt)) {
    precision = Math.min(100, precision + 10);
  }

  // 包含视觉特征加分
  if (/(红色|蓝色|绿色|黄色|大|小|图标|按钮)/.test(prompt)) {
    precision = Math.min(100, precision + 5);
  }

  // 确保分数在 0-100 范围内
  precision = Math.max(0, Math.min(100, precision));
  completeness = Math.max(0, Math.min(100, completeness));
  clarity = Math.max(0, Math.min(100, clarity));

  const overall = Math.round((precision + completeness + clarity) / 3);

  return {
    precision: Math.round(precision),
    completeness: Math.round(completeness),
    clarity: Math.round(clarity),
    overall,
  };
}

/**
 * 获取动作类型的优化示例
 */
export function getOptimizationExamples(actionType: string) {
  const examples = {
    aiTap: [
      {
        original: '点击登录按钮',
        optimized: '点击页面右上角的蓝色"登录"按钮',
        improvements: [
          '添加位置信息（页面右上角）',
          '添加视觉特征（蓝色）',
          '明确按钮文字（"登录"）',
        ],
      },
      {
        original: '点击第一个',
        optimized: '点击搜索结果列表中第一条记录的标题链接',
        improvements: [
          '明确是哪个列表（搜索结果列表）',
          '说明具体要点击的部分（标题链接）',
        ],
      },
    ],
    aiInput: [
      {
        original: '输入用户名',
        optimized:
          '在登录表单中标签为"用户名"的输入框中输入"admin@example.com"',
        improvements: [
          '指定输入框位置（登录表单中）',
          '使用 label 定位（标签为"用户名"）',
          '明确输入内容',
        ],
      },
      {
        original: '搜索JavaScript',
        optimized: '在页面顶部导航栏的搜索输入框中输入"JavaScript 教程"',
        improvements: ['添加输入框位置描述', '使用引号明确输入内容'],
      },
    ],
    aiAssert: [
      {
        original: '检查登录是否成功',
        optimized: `检查页面右上角是否显示用户信息。
判断标准：
- True：右上角出现用户头像图标和用户名文字
- False：右上角仍显示"登录"按钮，或显示错误提示
注意：用户名可能是邮箱或昵称`,
        improvements: [
          '添加明确判断位置',
          '定义 True/False 条件',
          '说明边界情况',
        ],
      },
    ],
    aiHover: [
      {
        original: '悬停在菜单上',
        optimized: '将鼠标悬停在导航栏的"产品"菜单项上，以展开下拉菜单',
        improvements: ['指定具体菜单项', '说明悬停的目的'],
      },
    ],
    aiScroll: [
      {
        original: '滚动页面',
        optimized: '向下滚动页面 500 像素，使"产品特性"区域进入视野',
        improvements: ['明确滚动方向', '指定滚动距离', '说明滚动目的'],
      },
    ],
    aiWaitFor: [
      {
        original: '等待加载完成',
        optimized: `等待页面中心的加载动画（旋转圆圈）消失
等待条件：页面上不再显示任何加载指示器
超时时间：30 秒`,
        improvements: ['明确等待的目标', '定义等待条件', '设置超时时间'],
      },
    ],
    aiKeyboardPress: [
      {
        original: '按回车',
        optimized: '在搜索输入框中按 Enter 键提交搜索',
        improvements: ['添加操作场景', '说明按键目的'],
      },
    ],
    all: [
      {
        original: '点击按钮',
        optimized: '点击页面底部中央的绿色"提交"按钮',
        improvements: ['添加位置', '添加颜色', '添加文字'],
      },
    ],
  };

  return examples[actionType as keyof typeof examples] || examples.all;
}

/**
 * 生成优化后的提示词（智能优化）
 */
export function generateOptimizedPrompt(
  originalPrompt: string,
  targetAction: string,
  customOptimize?: string,
): string {
  // 这里是简化版本，实际应该调用 AI API
  let optimized = originalPrompt;

  // 基础优化：移除模糊词
  optimized = optimized.replace(/(这个|那个|它)/g, '');

  // 根据动作类型添加建议
  const actionType = targetAction as FlowActionType;

  if (actionType === 'aiTap') {
    if (!/(页面|顶部|底部|左侧|右侧|导航|表单)/.test(optimized)) {
      optimized = `在页面中${optimized}`;
    }
  }

  if (actionType === 'aiInput') {
    if (!/".*"/.test(optimized)) {
      optimized = `${optimized}（请明确输入内容）`;
    }
  }

  if (actionType === 'aiAssert') {
    if (!/True|False/.test(optimized)) {
      optimized = `${optimized}\n判断标准：\n- True：[请描述满足条件的情况]\n- False：[请描述不满足条件的情况]`;
    }
  }

  // 应用自定义优化方向
  if (customOptimize) {
    optimized = `${optimized}\n\n优化方向：${customOptimize}`;
  }

  return optimized.trim();
}
