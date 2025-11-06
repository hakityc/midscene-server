import { Agent } from '@mastra/core/agent';
import { createQwen } from 'qwen-ai-provider';
import 'dotenv/config';

const DOC_SUMMARY_INSTRUCTIONS = `你是一位专业的网页内容分析专家，擅长从图片中的网页文档里提取关键信息和梳理逻辑脉络。你的任务是仔细分析提供的图片中的网页文档内容，总结文档的关键信息和逻辑脉络：
1. **核心主题（Core Topic）**
明确网页的核心目的，例如传递信息、推广产品、阐述观点或者解答问题等。提炼出 一段话的核心主旨，避免被次要内容干扰。

## 输入:
- 用户会通过消息内容提供网页文档的截图图片，请仔细分析图片中的内容。

## 输出格式:
请按照以下 JSON 格式（不要带markdown格式）输出结果，内容不确定或模糊则置为空字符串：
{
    "CoreTopic": "核心主旨",
}

请严格按照上述格式输出结果。
`;

const qwen = createQwen({
  apiKey: process.env.SUMMARIZE_OPENAI_API_KEY || '',
  baseURL: process.env.SUMMARIZE_OPENAI_BASE_URL || '',
});

export const documentSummaryAgent = new Agent({
  name: 'Document Summary Agent',
  description: '对文档截图进行信息抽取与结构化总结的 Agent',
  instructions: DOC_SUMMARY_INSTRUCTIONS,
  model: qwen(process.env.SUMMARIZE_MODEL_NAME),
});
