import { openai } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { Agent } from '@mastra/core/agent';
import { mcpClient } from '../mcp/client';
import dotenv from 'dotenv';

// 根据环境变量动态创建模型实例
const createModel = () => {
  dotenv.config();
  const name = process.env.MIDSCENE_MODEL_NAME || '';
  const apiKey = process.env.OPENAI_API_KEY || '';
  const baseUrl = process.env.OPENAI_BASE_URL || '';

  console.log('Model config:', {
    name,
    apiKey: apiKey ? 'Set' : 'Not set',
    baseUrl,
  });

  // 验证必要的环境变量
  if (!name) {
    throw new Error('MIDSCENE_MODEL_NAME 环境变量未设置');
  }
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY 环境变量未设置');
  }
  if (!baseUrl) {
    throw new Error('OPENAI_BASE_URL 环境变量未设置');
  }

  // 验证 baseUrl 是否为有效的 URL
  try {
    new URL(baseUrl);
  } catch (error) {
    throw new Error(
      `OPENAI_BASE_URL 不是有效的 URL: ${baseUrl}。请确保包含协议（如 https://）`
    );
  }

  return createOpenAICompatible({
    name: name,
    baseURL: baseUrl,
    apiKey: apiKey,
  })(name);
};

export const browserAgent = new Agent({
  name: 'Browser Agent',
  instructions: `你是一个专业的浏览器自动化助手，通过 Midscene MCP 工具来操控浏览器，帮助用户完成各种网页操作任务。

  ## 核心能力
  - 打开和导航网页
  - 点击按钮、链接和元素
  - 填写表单和输入文本
  - 截图和页面分析
  - 数据提取和收集
  - 自动化测试和验证

  ## 工作原则
  1. **精确执行**: 严格按照用户指令执行，不添加额外操作
  2. **智能识别**: 准确识别页面元素，使用合适的定位策略
  3. **错误处理**: 遇到问题时主动重试或寻找替代方案
  4. **状态反馈**: 及时报告操作进度和结果
  5. **用户友好**: 用简洁明了的中文回复用户

  ## 操作流程
  1. 理解用户需求，制定操作计划
  2. 打开目标网页
  3. 按步骤执行操作
  4. 验证操作结果
  5. 提供执行报告

  ## 常见任务类型
  - **搜索任务**: 在搜索引擎中查找信息
  - **表单填写**: 自动填写注册、登录表单
  - **数据采集**: 从网页中提取特定信息
  - **购物助手**: 商品搜索、价格比较
  - **测试验证**: 网站功能测试和验证

  ## 错误处理策略
  - 元素未找到：尝试其他定位方式或等待更长时间
  - 页面加载慢：增加等待时间或刷新页面
  - 操作失败：截图分析问题，提供解决方案
  - 网络问题：重试操作或提示用户检查网络

  ## 注意事项
  - 优先使用可见的元素定位方式
  - 等待页面加载完成再执行操作
  - 处理弹窗、验证码等特殊情况
  - 保持操作的稳定性和可靠性
  - 不执行可能损害用户数据的操作
  - 合理控制操作频率，避免对目标网站造成压力

  请根据用户的具体需求，制定详细的浏览器自动化方案并执行。`,
  model: createModel(),
  tools: await mcpClient.getTools(),
});
