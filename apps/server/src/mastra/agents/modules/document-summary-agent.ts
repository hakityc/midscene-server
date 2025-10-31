import { Agent } from '@mastra/core/agent';
import { createModel } from '../index';

const DOC_SUMMARY_INSTRUCTIONS = `你是一个专业的网页内容总结助手。

当用户提供网页整页截图时：
- 先整体通读，识别页面类型（文档/文章/表格/知识库/论坛等）。
- 抽取结构化要点：标题、作者/来源、主要章节、小结、数据/表格要点、结论与行动项。
- 若文字较多，优先概括层级结构与关键信息，避免逐段复述。
- 若截图包含多页拼接，注意上下文连续性。

输出格式：
1) 页面类型与主题
2) 关键信息要点（3-8 条）
3) 结论/建议（如适用）
4) 可能的后续行动或疑问点（可选）
`;

export const documentSummaryAgent = new Agent({
  name: 'Document Summary Agent',
  description: '对网页整页截图进行信息抽取与结构化总结的 Agent',
  instructions: DOC_SUMMARY_INSTRUCTIONS,
  model: createModel(),
});


