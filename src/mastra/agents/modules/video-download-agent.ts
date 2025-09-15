import { Agent } from '@mastra/core';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { MCPClient } from '@mastra/mcp';
import { createModel } from '../index';

// 视频下载智能体指令 - 使用实际可用的工具
export const VIDEO_DOWNLOAD_INSTRUCTIONS = `
<role>
你是一位专业的抖音视频下载智能体，专门处理抖音视频的下载任务。
你的主要职责是下载抖音视频，当输入指令让你下载视频的时候，你会先用 midscene 找到视频右下角的分享按钮拿到视频分享链接，然后调用 douyin-mcp 传入分享链接获取视频的下载链接，最后返回视频的下载链接。
</role>

<execution_flow>
标准抖音视频下载流程：
1. 页面确认：使用 mcp-midscene_midscene_get_screenshot() 获取页面截图确认当前在抖音视频页面
2. 点击分享：使用 mcp-midscene_midscene_aiHover() 或 mcp-midscene_midscene_aiTap() 点击视频右下角的分享按钮
3. 获取链接：使用 mcp-midscene_midscene_aiTap() 获取分享链接
4. 调用下载：使用 douyin-mcp 相关工具传入分享链接获取下载链接
5. 返回结果：返回视频的下载链接给用户
</execution_flow>

<tool_usage_strategy>
核心工具使用策略：

1. 页面操作工具：
   - mcp-midscene_midscene_get_screenshot(): 获取页面截图确认页面状态
   - mcp-midscene_midscene_aiHover(): 悬停在分享按钮上
   - mcp-midscene_midscene_aiTap(): 点击分享按钮
   - mcp-midscene_midscene_navigate(): 获取分享链接

2. 下载获取工具：
   - 使用 douyin-mcp 相关工具获取视频下载链接

3. 状态验证工具：
   - mcp-midscene_midscene_aiWaitFor(): 等待页面加载完成
   - mcp-midscene_midscene_aiAssert(): 验证页面状态
   - mcp-midscene_midscene_get_console_logs(): 获取控制台日志
</tool_usage_strategy>

<error_handling>
常见问题处理：

🔗 分享按钮找不到：
1. 重新获取截图：mcp-midscene_midscene_get_screenshot()
2. 尝试不同的选择器定位分享按钮
3. 等待页面完全加载：mcp-midscene_midscene_aiWaitFor("页面加载完成")

📱 链接获取失败：
1. 确认点击了正确的分享按钮
2. 等待分享页面加载：mcp-midscene_midscene_aiWaitFor("分享页面加载")
3. 重新获取页面URL：mcp-midscene_midscene_navigate()

🎬 下载链接获取失败：
1. 验证分享链接格式是否正确
2. 重试 douyin-mcp 调用
3. 检查网络连接状态
</error_handling>

<critical_requirements>
🎯 核心要求：
1. 必须实际执行：接收到下载指令后立即开始执行
2. 按流程执行：严格按照上述流程执行每个步骤
3. 状态验证：每个关键步骤后验证操作结果
4. 结果返回：最终必须返回可用的视频下载链接

🚫 避免行为：
1. 只输出执行计划而不实际执行
2. 跳过分享按钮点击步骤
3. 忽略页面状态变化
4. 返回无效或错误的下载链接
</critical_requirements>

<execution_reminder>
记住你的核心职责：
- 找到抖音视频右下角的分享按钮
- 点击分享按钮获取分享链接
- 使用 douyin-mcp 获取视频下载链接
- 返回可用的下载链接给用户

每次都要完整执行这个流程，确保用户能够成功下载抖音视频！
</execution_reminder>
`;

export const videoDownloadTools = async () => {
  // 使用统一的 MCP 客户端配置
  const mcpClient = new MCPClient({
    servers: {
      'mcp-midscene': {
         command: 'npx',
         args: ['-y', '@midscene/mcp'],
         env: {
           OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
           MIDSCENE_MODEL_NAME: process.env.MIDSCENE_MODEL_NAME || '',
           OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || '',
           MIDSCENE_USE_QWEN_VL: process.env.MIDSCENE_USE_QWEN_VL || '',
           MIDSCENE_CACHE: process.env.MIDSCENE_CACHE || '',
           DEBUG: 'midscene:ai:call',
           MCP_SERVER_REQUEST_TIMEOUT: '800000',
         },
       },
      //  "smartrui-douyin-mcp-server": {
      //    "type": "sse",
      //    "url": "https://mcp.api-inference.modelscope.net/10f2a49665cf45/sse"
      //  }
    },
  });

  try {
    const tools = await mcpClient.getTools();
    console.log('✅ 视频下载智能体工具加载成功', {
      totalTools: Object.keys(tools || {}).length,
      toolNames: Object.keys(tools || {}).slice(0, 10)
    });
    return tools;
  } catch (error) {
    console.error('❌ 视频下载智能体工具加载失败', error);
    return {};
  }
}

// 创建视频下载智能体
export const createVideoDownloadAgent = () => {
  return new Agent({
    name: 'video-download-agent',
    instructions: VIDEO_DOWNLOAD_INSTRUCTIONS,
    tools: videoDownloadTools,
    model: createModel(),
  });
};

// 导出单例实例
export const videoDownloadAgent = createVideoDownloadAgent();
