/**
 * 测试 browserAgent 的返回值处理
 * 验证 Agent 是否能正常接收和打印返回值
 */

const { mastra } = require('./dist/mastra/index.js');

async function testAgentReturn() {
  console.log('🧪 开始测试 browserAgent 返回值处理...\n');

  try {
    // 获取 browserAgent
    const browserAgent = mastra.getAgent('browserAgent');
    console.log('✅ browserAgent 获取成功');

    // 测试简单的文本响应
    console.log('\n📝 测试1: 简单文本响应');
    const simplePrompt = '你好，请简单介绍一下你自己';
    
    const response1 = await browserAgent.streamVNext(simplePrompt, {
      onStepFinish: ({ text, toolCalls, toolResults, finishReason, usage }) => {
        console.log('📊 Step Finish:', {
          text: text?.substring(0, 100) + (text?.length > 100 ? '...' : ''),
          toolCalls: toolCalls?.length || 0,
          toolResults: toolResults?.length || 0,
          finishReason,
          usage
        });
      },
      onFinish: ({ steps, text, finishReason, usage }) => {
        console.log('🏁 Finish:', {
          steps: steps?.length || 0,
          textLength: text?.length || 0,
          finishReason,
          usage
        });
        console.log('📄 完整响应:', text);
      }
    });

    // 处理流式响应
    let fullText = '';
    for await (const chunk of response1.textStream) {
      fullText += chunk;
      process.stdout.write(chunk);
    }

    console.log('\n✅ 测试1完成 - 简单文本响应正常');

    // 测试工具调用响应
    console.log('\n🔧 测试2: 工具调用响应');
    const toolPrompt = '请描述当前页面的内容';
    
    const response2 = await browserAgent.streamVNext(toolPrompt, {
      onStepFinish: ({ text, toolCalls, toolResults, finishReason, usage }) => {
        console.log('🔧 Tool Step:', {
          text: text?.substring(0, 50) + (text?.length > 50 ? '...' : ''),
          toolCalls: toolCalls?.map(tc => ({
            name: tc.toolName,
            args: tc.args
          })) || [],
          toolResults: toolResults?.map(tr => ({
            toolCallId: tr.toolCallId,
            result: typeof tr.result === 'string' ? tr.result.substring(0, 100) + '...' : tr.result
          })) || [],
          finishReason,
          usage
        });
      },
      onFinish: ({ steps, text, finishReason, usage }) => {
        console.log('🏁 Tool Finish:', {
          steps: steps?.length || 0,
          textLength: text?.length || 0,
          finishReason,
          usage
        });
      }
    });

    // 处理工具调用的流式响应
    let toolText = '';
    for await (const chunk of response2.textStream) {
      toolText += chunk;
      process.stdout.write(chunk);
    }

    console.log('\n✅ 测试2完成 - 工具调用响应正常');

    // 测试抖音视频下载场景
    console.log('\n🎬 测试3: 抖音视频下载场景');
    const douyinPrompt = '如果我在抖音视频播放页面，请获取当前页面URL并获取视频下载链接';
    
    const response3 = await browserAgent.streamVNext(douyinPrompt, {
      onStepFinish: ({ text, toolCalls, toolResults, finishReason, usage }) => {
        console.log('🎬 Douyin Step:', {
          text: text?.substring(0, 50) + (text?.length > 50 ? '...' : ''),
          toolCalls: toolCalls?.map(tc => ({
            name: tc.toolName,
            args: tc.args
          })) || [],
          toolResults: toolResults?.map(tr => ({
            toolCallId: tr.toolCallId,
            result: typeof tr.result === 'string' ? tr.result.substring(0, 100) + '...' : tr.result
          })) || [],
          finishReason,
          usage
        });
      },
      onFinish: ({ steps, text, finishReason, usage }) => {
        console.log('🏁 Douyin Finish:', {
          steps: steps?.length || 0,
          textLength: text?.length || 0,
          finishReason,
          usage
        });
      }
    });

    // 处理抖音场景的流式响应
    let douyinText = '';
    for await (const chunk of response3.textStream) {
      douyinText += chunk;
      process.stdout.write(chunk);
    }

    console.log('\n✅ 测试3完成 - 抖音视频下载场景正常');

    console.log('\n🎉 所有测试完成！browserAgent 返回值处理正常');

  } catch (error) {
    console.error('❌ 测试失败:', error);
    console.error('错误详情:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
  }
}

// 运行测试
testAgentReturn().catch(console.error);
