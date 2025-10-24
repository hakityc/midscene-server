import type {
  OptimizationSuggestion,
  OptimizePromptRequest,
  OptimizePromptResponse,
  QualityScore,
} from '../types/promptOptimization';

/**
 * 提示词优化服务
 */
export class PromptOptimizationService {
  private apiKey: string;
  private apiUrl: string;
  private model: string;

  constructor() {
    // 从环境变量获取配置
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.apiUrl = process.env.OPENAI_API_URL || 'https://api.openai.com/v1';
    this.model = process.env.OPENAI_MODEL || 'gpt-4o';
  }

  /**
   * 优化提示词
   */
  async optimizePrompt(
    request: OptimizePromptRequest,
  ): Promise<OptimizePromptResponse> {
    const { prompt, targetAction, customOptimize, images } = request;

    // 构建系统提示
    const systemPrompt = this.buildSystemPrompt(targetAction);

    // 构建用户提示
    const userPrompt = this.buildUserPrompt(prompt, customOptimize);

    // 调用 AI
    const optimizedPrompt = await this.callAI(
      systemPrompt,
      userPrompt,
      images,
    );

    // 分析优化结果
    const suggestions = this.analyzeSuggestions(prompt, optimizedPrompt);
    const score = this.calculateScore(optimizedPrompt, targetAction);
    const improvements = this.extractImprovements(prompt, optimizedPrompt);

    return {
      optimized: optimizedPrompt,
      suggestions,
      score,
      improvements,
    };
  }

  /**
   * 构建系统提示
   */
  private buildSystemPrompt(targetAction: string): string {
    const actionGuides: Record<string, string> = {
      aiTap: `你是一个专业的 Midscene.js 提示词优化专家。用户要优化 aiTap（点击）动作的提示词。
优化重点：
1. 添加元素的位置信息（如"页面顶部"、"导航栏中"）
2. 添加视觉特征（如颜色、大小、图标类型）
3. 明确元素的文字内容
4. 说明元素的层级关系
5. 描述元素的状态（如激活、禁用等）`,

      aiInput: `你是一个专业的 Midscene.js 提示词优化专家。用户要优化 aiInput（输入）动作的提示词。
优化重点：
1. 使用引号明确输入内容
2. 添加输入框的标签、placeholder 或位置信息
3. 说明输入方式（追加、替换、清空后输入）
4. 如有特殊格式要求，明确说明
5. 说明是否需要先点击聚焦`,

      aiAssert: `你是一个专业的 Midscene.js 提示词优化专家。用户要优化 aiAssert（断言）动作的提示词。
优化重点：
1. 添加明确的 True/False 判断标准
2. 定义 True 的条件是什么
3. 定义 False 的条件是什么
4. 列举边界情况和特殊情况
5. 使用"完全包含"、"精确匹配"等明确词汇
6. 说明检查的位置范围`,

      aiHover: `你是一个专业的 Midscene.js 提示词优化专家。用户要优化 aiHover（悬停）动作的提示词。
优化重点：
1. 明确悬停的目标元素
2. 添加元素的位置和特征
3. 可选：说明悬停后的预期效果`,

      aiScroll: `你是一个专业的 Midscene.js 提示词优化专家。用户要优化 aiScroll（滚动）动作的提示词。
优化重点：
1. 明确滚动的容器（整个页面还是某个区域）
2. 说明滚动方向（up/down/left/right）
3. 指定滚动距离或滚动到某个元素可见
4. 可选：说明滚动的目的`,

      aiWaitFor: `你是一个专业的 Midscene.js 提示词优化专家。用户要优化 aiWaitFor（等待）动作的提示词。
优化重点：
1. 定义明确的等待条件（什么元素出现/消失/变化）
2. 说明如何判断条件已满足
3. 设置合理的超时时间
4. 可选：说明失败的情况`,

      aiKeyboardPress: `你是一个专业的 Midscene.js 提示词优化专家。用户要优化 aiKeyboardPress（按键）动作的提示词。
优化重点：
1. 明确按键名称（Enter、Tab、Escape 等）
2. 说明在什么场景下按键
3. 说明组合键（如 Ctrl+S）
4. 说明按键后的预期效果`,

      sleep: `你是一个专业的 Midscene.js 提示词优化专家。用户要优化 sleep（延迟）动作的提示词。
优化重点：
1. 明确延迟时间（毫秒）
2. 可选：说明延迟的原因`,
    };

    const basePrompt = `你是一个专业的 Midscene.js 提示词优化专家。Midscene 是一个 AI 驱动的自动化测试工具，它通过视觉理解来执行网页操作。

你的任务是优化用户提供的提示词，使其更加清晰、准确、易于 AI 理解。

优化原则：
1. 明确性：使用具体的描述，避免模糊词汇（这个、那个、它）
2. 完整性：包含足够的上下文信息（位置、特征、状态）
3. 清晰性：表达清晰，避免歧义
4. 视觉化：利用 AI 的视觉能力，描述可见的特征

请直接返回优化后的提示词，不要添加额外的解释。`;

    return targetAction !== 'all' && actionGuides[targetAction]
      ? actionGuides[targetAction]
      : basePrompt;
  }

  /**
   * 构建用户提示
   */
  private buildUserPrompt(
    prompt: string,
    customOptimize?: string,
  ): string {
    let userPrompt = `请优化以下提示词：\n\n${prompt}`;

    if (customOptimize) {
      userPrompt += `\n\n优化方向：${customOptimize}`;
    }

    userPrompt += '\n\n请直接返回优化后的提示词，不要添加任何额外的说明或格式。';

    return userPrompt;
  }

  /**
   * 调用 AI API
   */
  private async callAI(
    systemPrompt: string,
    userPrompt: string,
    images?: string[],
  ): Promise<string> {
    if (!this.apiKey) {
      // 如果没有配置 API Key，返回一个基础优化版本
      return this.fallbackOptimize(userPrompt);
    }

    try {
      const messages: any[] = [
        { role: 'system', content: systemPrompt },
      ];

      // 如果有图片，使用 vision 模式
      if (images && images.length > 0) {
        const content: any[] = [{ type: 'text', text: userPrompt }];

        for (const image of images) {
          content.push({
            type: 'image_url',
            image_url: {
              url: image,
            },
          });
        }

        messages.push({ role: 'user', content });
      } else {
        messages.push({ role: 'user', content: userPrompt });
      }

      const response = await fetch(`${this.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API 调用失败: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('AI 优化失败，使用降级方案:', error);
      return this.fallbackOptimize(userPrompt);
    }
  }

  /**
   * 降级优化方案（当 AI 不可用时）
   */
  private fallbackOptimize(userPrompt: string): string {
    // 从提示中提取原始文本
    const match = userPrompt.match(/请优化以下提示词：\n\n(.+?)(?:\n\n|$)/s);
    const original = match ? match[1] : userPrompt;

    // 基础优化
    let optimized = original;

    // 移除模糊词
    optimized = optimized.replace(/(这个|那个|它)/g, '目标');

    // 添加提示
    if (optimized.length < 20) {
      optimized = `${optimized}（建议：添加更多位置和特征描述）`;
    }

    return optimized;
  }

  /**
   * 分析优化建议
   */
  private analyzeSuggestions(
    original: string,
    optimized: string,
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // 比较长度
    if (optimized.length > original.length * 1.5) {
      suggestions.push({
        type: 'completeness',
        issue: '已添加更多上下文信息',
        suggestion: '优化后的提示词包含了更多必要的细节描述',
        priority: 'high',
      });
    }

    // 检测位置信息
    if (
      /(页面|顶部|底部|左侧|右侧|导航|表单|列表|中)/.test(optimized) &&
      !/(页面|顶部|底部|左侧|右侧|导航|表单|列表|中)/.test(original)
    ) {
      suggestions.push({
        type: 'precision',
        issue: '已添加位置信息',
        suggestion: '优化后的提示词包含了明确的位置描述',
        priority: 'high',
      });
    }

    // 检测视觉特征
    if (
      /(红色|蓝色|绿色|黄色|大|小|图标|按钮)/.test(optimized) &&
      !/(红色|蓝色|绿色|黄色|大|小|图标|按钮)/.test(original)
    ) {
      suggestions.push({
        type: 'precision',
        issue: '已添加视觉特征',
        suggestion: '优化后的提示词包含了视觉特征描述',
        priority: 'medium',
      });
    }

    return suggestions;
  }

  /**
   * 计算质量评分
   */
  private calculateScore(
    optimized: string,
    targetAction: string,
  ): QualityScore {
    let precision = 70;
    let completeness = 70;
    let clarity = 70;

    // 长度加分
    if (optimized.length > 20) completeness += 10;
    if (optimized.length > 50) completeness += 10;

    // 位置信息加分
    if (/(页面|顶部|底部|左侧|右侧|导航|表单|列表|中)/.test(optimized)) {
      precision += 10;
    }

    // 视觉特征加分
    if (/(红色|蓝色|绿色|黄色|大|小|图标|按钮)/.test(optimized)) {
      precision += 10;
    }

    // 引号内容加分
    if (/".*"/.test(optimized)) {
      clarity += 10;
    }

    // aiAssert 特殊检查
    if (targetAction === 'aiAssert') {
      if (/True|False/.test(optimized)) {
        clarity += 10;
      }
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
   * 提取改进要点
   */
  private extractImprovements(
    original: string,
    optimized: string,
  ): string[] {
    const improvements: string[] = [];

    // 长度增加
    if (optimized.length > original.length * 1.2) {
      improvements.push('增加了更多描述细节');
    }

    // 位置信息
    if (
      /(页面|顶部|底部|左侧|右侧|导航|表单|列表|中)/.test(optimized) &&
      !/(页面|顶部|底部|左侧|右侧|导航|表单|列表|中)/.test(original)
    ) {
      improvements.push('添加了位置信息');
    }

    // 视觉特征
    if (
      /(红色|蓝色|绿色|黄色|大|小|图标)/.test(optimized) &&
      !/(红色|蓝色|绿色|黄色|大|小|图标)/.test(original)
    ) {
      improvements.push('添加了视觉特征描述');
    }

    // 引号
    if (/".*"/.test(optimized) && !/".*"/.test(original)) {
      improvements.push('使用引号明确了内容');
    }

    // 判断标准
    if (
      /True|False|判断标准/.test(optimized) &&
      !/True|False|判断标准/.test(original)
    ) {
      improvements.push('添加了明确的判断标准');
    }

    if (improvements.length === 0) {
      improvements.push('优化了表达方式');
    }

    return improvements;
  }
}

