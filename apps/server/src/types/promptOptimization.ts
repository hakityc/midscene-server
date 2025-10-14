// 提示词优化请求
export interface OptimizePromptRequest {
  prompt: string; // 原始提示词
  targetAction: string; // 目标动作类型
  customOptimize?: string; // 自定义优化方向
  images?: string[]; // base64 编码的图片
}

// 优化建议
export interface OptimizationSuggestion {
  type: 'precision' | 'completeness' | 'clarity' | 'structure';
  issue: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
}

// 质量评分
export interface QualityScore {
  precision: number;
  completeness: number;
  clarity: number;
  overall: number;
}

// 提示词优化响应
export interface OptimizePromptResponse {
  optimized: string; // 优化后的提示词
  suggestions: OptimizationSuggestion[]; // 优化建议
  score: QualityScore; // 质量评分
  improvements: string[]; // 改进要点
}

