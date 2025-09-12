/**
 * 诊断 AGENT_STREAM_VNEXT_FAILED 错误
 */

const { mastra } = require('./dist/mastra/index.js');

async function debugAgentError() {
  console.log('🔍 开始诊断 Agent 错误...\n');

  try {
    // 1. 检查环境变量
    console.log('📋 检查环境变量:');
    console.log('TASK_MIDSCENE_MODEL_NAME:', process.env.TASK_MIDSCENE_MODEL_NAME ? '✓ 已设置' : '❌ 未设置');
    console.log('TASK_OPENAI_API_KEY:', process.env.TASK_OPENAI_API_KEY ? '✓ 已设置' : '❌ 未设置');
    console.log('TASK_OPENAI_BASE_URL:', process.env.TASK_OPENAI_BASE_URL ? '✓ 已设置' : '❌ 未设置');
    console.log('');

    // 2. 检查 Agent 获取
    console.log('🤖 检查 Agent 获取:');
    try {
      const browserAgent = mastra.getAgent('browserAgent');
      console.log('✅ browserAgent 获取成功');
      console.log('Agent 名称:', browserAgent.name);
      console.log('Agent 描述:', browserAgent.description?.substring(0, 100) + '...');
    } catch (agentError) {
      console.error('❌ browserAgent 获取失败:', agentError.message);
      return;
    }

    // 3. 检查工具配置
    console.log('\n🔧 检查工具配置:');
    try {
      const tools = await browserAgent.tools();
      console.log('✅ 工具获取成功');
      console.log('工具数量:', Object.keys(tools).length);
      console.log('工具列表:', Object.keys(tools).slice(0, 5).join(', ') + (Object.keys(tools).length > 5 ? '...' : ''));
    } catch (toolsError) {
      console.error('❌ 工具获取失败:', toolsError.message);
    }

    // 4. 测试简单调用
    console.log('\n🧪 测试简单调用:');
    try {
      const response = await browserAgent.streamVNext('你好', {
        onStepFinish: ({ text, toolCalls, toolResults, finishReason, usage }) => {
          console.log('📊 Step Finish:', {
            textLength: text?.length || 0,
            toolCalls: toolCalls?.length || 0,
            toolResults: toolResults?.length || 0,
            finishReason
          });
        },
        onFinish: ({ steps, text, finishReason, usage }) => {
          console.log('🏁 Finish:', {
            steps: steps?.length || 0,
            textLength: text?.length || 0,
            finishReason
          });
        }
      });

      let text = '';
      for await (const chunk of response.textStream) {
        text += chunk;
        process.stdout.write(chunk);
      }
      
      console.log('\n✅ 简单调用成功');
    } catch (callError) {
      console.error('❌ 简单调用失败:', callError.message);
      console.error('错误详情:', {
        name: callError.name,
        code: callError.code,
        stack: callError.stack
      });
    }

    // 5. 测试工具调用
    console.log('\n🔧 测试工具调用:');
    try {
      const response = await browserAgent.streamVNext('请获取当前页面的URL', {
        onStepFinish: ({ text, toolCalls, toolResults, finishReason, usage }) => {
          console.log('🔧 Tool Step:', {
            textLength: text?.length || 0,
            toolCalls: toolCalls?.map(tc => ({
              name: tc.toolName,
              args: tc.args
            })) || [],
            toolResults: toolResults?.map(tr => ({
              toolCallId: tr.toolCallId,
              result: typeof tr.result === 'string' ? tr.result.substring(0, 50) + '...' : tr.result
            })) || [],
            finishReason
          });
        }
      });

      let text = '';
      for await (const chunk of response.textStream) {
        text += chunk;
        process.stdout.write(chunk);
      }
      
      console.log('\n✅ 工具调用成功');
    } catch (toolError) {
      console.error('❌ 工具调用失败:', toolError.message);
      console.error('工具错误详情:', {
        name: toolError.name,
        code: toolError.code,
        stack: toolError.stack
      });
    }

  } catch (error) {
    console.error('❌ 诊断过程中发生错误:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

debugAgentError();
