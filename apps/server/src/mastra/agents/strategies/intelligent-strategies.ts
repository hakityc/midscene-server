/**
 * 智能策略配置模块
 * 基于 Midscene 的核心设计理念，提供智能化的操作策略
 */

export interface OperationContext {
  pageUrl?: string;
  pageTitle?: string;
  pageDescription?: string;
  lastOperation?: string;
  operationHistory?: string[];
  errorCount?: number;
  retryCount?: number;
}

export interface OperationStrategy {
  name: string;
  description: string;
  pattern: string[];
  conditions: string[];
  fallbackStrategies?: string[];
}

// 智能定位策略
export const ELEMENT_LOCATION_STRATEGIES = {
  visualFirst: {
    name: '视觉优先策略',
    description: '基于视觉信息和页面布局定位元素',
    steps: [
      'midscene_describe_page()',
      'midscene_locate_element(具体描述)',
      '验证元素位置和可见性',
      '执行操作',
    ],
    conditions: ['页面加载完成', '元素可见', '无遮挡'],
  },

  semanticBased: {
    name: '语义定位策略',
    description: '基于元素语义和功能定位',
    steps: [
      'midscene_get_context()',
      'midscene_query_content(功能描述)',
      'midscene_locate_element(语义描述)',
      '执行操作',
    ],
    conditions: ['页面结构清晰', '元素具有明确语义'],
  },

  adaptiveRetry: {
    name: '自适应重试策略',
    description: '根据失败原因调整定位方式',
    steps: ['分析失败原因', '调整定位描述', '等待页面稳定', '重新尝试定位'],
    conditions: ['首次定位失败', '页面状态可能变化'],
  },
};

// 任务执行模式
export const EXECUTION_PATTERNS: Record<string, OperationStrategy> = {
  search: {
    name: '智能搜索模式',
    description: 'AI 增强的搜索操作流程',
    pattern: [
      'midscene_describe_page()',
      'midscene_locate_element("搜索框")',
      'midscene_aiInput(搜索关键词)',
      'midscene_aiKeyboardPress("Enter")',
      'midscene_wait_for("搜索结果出现")',
      'midscene_assert_state("搜索完成")',
    ],
    conditions: ['页面包含搜索功能', '搜索框可见'],
  },

  form: {
    name: '表单填写模式',
    description: '智能表单交互和提交',
    pattern: [
      'midscene_get_context()',
      '遍历表单字段[midscene_locate_element() → midscene_aiInput()]',
      'midscene_locate_element("提交按钮")',
      'midscene_aiTap(提交)',
      'midscene_assert_state("提交成功")',
    ],
    conditions: ['页面包含表单', '表单字段可编辑'],
  },

  dataExtraction: {
    name: '数据提取模式',
    description: '智能数据采集和分析',
    pattern: [
      'midscene_describe_page()',
      'midscene_wait_for("数据加载完成")',
      'midscene_query_content("目标数据类型")',
      'midscene_assert_state("数据完整性验证")',
    ],
    conditions: ['页面包含目标数据', '数据已加载'],
  },

  navigation: {
    name: '导航操作模式',
    description: '智能页面导航和跳转',
    pattern: [
      'midscene_describe_page()',
      'midscene_locate_element("导航目标")',
      'midscene_aiTap(点击)',
      'midscene_wait_for("页面加载完成")',
      'midscene_assert_state("导航成功")',
    ],
    conditions: ['目标链接或按钮存在', '页面可导航'],
  },

  mediaControl: {
    name: '媒体控制模式',
    description: '视频音频等媒体内容控制',
    pattern: [
      'midscene_locate_element("播放控件")',
      'midscene_aiTap(控制操作)',
      'midscene_assert_state("播放状态变化")',
      'midscene_query_content("媒体信息")',
    ],
    conditions: ['页面包含媒体内容', '控件可用'],
  },
};

// 错误恢复策略
export const ERROR_RECOVERY_STRATEGIES = {
  elementNotFound: {
    name: '元素未找到恢复',
    steps: [
      '1. 重新获取页面上下文：midscene_get_context()',
      '2. 分析页面变化：midscene_describe_page()',
      '3. 调整定位描述：使用更具体或更抽象的描述',
      '4. 等待元素出现：midscene_wait_for()',
      '5. 寻找替代元素：查找功能相似的元素',
    ],
    maxRetries: 3,
    backoffStrategy: 'exponential',
  },

  operationTimeout: {
    name: '操作超时恢复',
    steps: [
      '1. 检查页面加载状态',
      '2. 验证网络连接',
      '3. 增加等待时间',
      '4. 重新执行操作',
      '5. 考虑分步执行',
    ],
    maxRetries: 2,
    backoffStrategy: 'linear',
  },

  unexpectedState: {
    name: '意外状态恢复',
    steps: [
      '1. 评估当前页面状态：midscene_describe_page()',
      '2. 识别状态差异',
      '3. 确定恢复路径',
      '4. 执行状态恢复操作',
      '5. 验证恢复结果',
    ],
    maxRetries: 2,
    backoffStrategy: 'immediate',
  },
};

// 性能优化策略
export const PERFORMANCE_STRATEGIES = {
  batchOperations: {
    name: '批量操作优化',
    description: '将相似操作合并执行以提高效率',
    applicableScenarios: ['多个表单字段填写', '多个元素点击', '批量数据提取'],
  },

  intelligentWaiting: {
    name: '智能等待策略',
    description: '根据页面复杂度和历史数据动态调整等待时间',
    basewait: 1000,
    maxWait: 30000,
    adaptiveFactor: 1.5,
  },

  contextCaching: {
    name: '上下文缓存策略',
    description: '缓存页面结构信息，减少重复分析',
    cacheKey: 'pageUrl + pageStructureHash',
    ttl: 300000, // 5分钟
  },

  resourceOptimization: {
    name: '资源优化策略',
    description: '优化网络请求和内存使用',
    maxConcurrentOperations: 3,
    memoryCleanupInterval: 60000,
  },
};

// 策略选择器
export class StrategySelector {
  /**
   * 根据上下文选择最适合的执行策略
   */
  static selectExecutionPattern(
    taskType: string,
    _context: OperationContext,
  ): OperationStrategy | null {
    // 根据任务类型和上下文选择策略
    if (taskType.includes('搜索') || taskType.includes('查找')) {
      return EXECUTION_PATTERNS.search;
    }

    if (
      taskType.includes('填写') ||
      taskType.includes('表单') ||
      taskType.includes('输入')
    ) {
      return EXECUTION_PATTERNS.form;
    }

    if (
      taskType.includes('提取') ||
      taskType.includes('获取') ||
      taskType.includes('数据')
    ) {
      return EXECUTION_PATTERNS.dataExtraction;
    }

    if (
      taskType.includes('点击') ||
      taskType.includes('导航') ||
      taskType.includes('跳转')
    ) {
      return EXECUTION_PATTERNS.navigation;
    }

    if (
      taskType.includes('播放') ||
      taskType.includes('视频') ||
      taskType.includes('音频')
    ) {
      return EXECUTION_PATTERNS.mediaControl;
    }

    // 默认返回导航模式
    return EXECUTION_PATTERNS.navigation;
  }

  /**
   * 根据错误类型选择恢复策略
   */
  static selectRecoveryStrategy(errorType: string) {
    if (errorType.includes('not found') || errorType.includes('定位失败')) {
      return ERROR_RECOVERY_STRATEGIES.elementNotFound;
    }

    if (errorType.includes('timeout') || errorType.includes('超时')) {
      return ERROR_RECOVERY_STRATEGIES.operationTimeout;
    }

    return ERROR_RECOVERY_STRATEGIES.unexpectedState;
  }

  /**
   * 获取性能优化建议
   */
  static getPerformanceOptimization(context: OperationContext) {
    const optimizations = [];

    if (context.errorCount && context.errorCount > 2) {
      optimizations.push(PERFORMANCE_STRATEGIES.intelligentWaiting);
    }

    if (context.operationHistory && context.operationHistory.length > 5) {
      optimizations.push(PERFORMANCE_STRATEGIES.contextCaching);
    }

    return optimizations;
  }
}

// 所有策略已在上面使用 export const 导出
