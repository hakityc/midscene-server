/**
 * 测试修复后的 Agent 功能
 * 验证 AGENT_STREAM_VNEXT_FAILED 错误是否已解决
 */

const { mastra } = require('./dist/mastra/index.js');

async function testAgentFix() {
  console.log('🔧 测试修复后的 Agent 功能...\n');

  try {
    // 1. 检查 Agent 获取
    console.log('🤖 检查 Agent 获取:');
    const browserAgent = mastra.getAgent('browserAgent');
    console.log('✅ browserAgent 获取成功');

    // 2. 检查工具配置
    console.log('\n🔧 检查工具配置:');
    const tools = await browserAgent.tools();
    console.log('✅ 工具获取成功');
    console.log('工具数量:', Object.keys(tools).length);

    // 3. 测试简单对话
    console.log('\n📝 测试简单对话:');
    const response1 = await browserAgent.streamVNext(
      '你好，请简单介绍一下你自己',
      {
        onStepFinish: ({ text, toolCalls, toolResults, finishReason }) => {
          console.log('📊 Step:', {
            textLength: text?.length || 0,
            toolCalls: toolCalls?.length || 0,
            toolResults: toolResults?.length || 0,
            finishReason,
          });
        },
        onFinish: ({ steps, text, finishReason }) => {
          console.log('🏁 Finish:', {
            steps: steps?.length || 0,
            textLength: text?.length || 0,
            finishReason,
          });
        },
      },
    );

    let text1 = '';
    for await (const chunk of response1.textStream) {
      text1 += chunk;
      process.stdout.write(chunk);
    }

    console.log('\n✅ 简单对话测试成功');

    // 4. 测试工具调用
    console.log('\n🔧 测试工具调用:');
    const response2 = await browserAgent.streamVNext('请获取当前页面的URL', {
      onStepFinish: ({ text, toolCalls, toolResults, finishReason }) => {
        console.log('🔧 Tool Step:', {
          textLength: text?.length || 0,
          toolCalls:
            toolCalls?.map((tc) => ({
              name: tc.toolName,
              args: tc.args,
            })) || [],
          toolResults:
            toolResults?.map((tr) => ({
              toolCallId: tr.toolCallId,
              result:
                typeof tr.result === 'string'
                  ? tr.result.substring(0, 50) + '...'
                  : tr.result,
            })) || [],
          finishReason,
        });
      },
    });

    let text2 = '';
    for await (const chunk of response2.textStream) {
      text2 += chunk;
      process.stdout.write(chunk);
    }

    console.log('\n✅ 工具调用测试成功');

    // 5. 测试抖音视频下载场景
    console.log('\n🎬 测试抖音视频下载场景:');
    const response3 = await browserAgent.streamVNext(
      '如果我在抖音视频播放页面，请获取视频下载链接',
      {
        onStepFinish: ({ text, toolCalls, toolResults, finishReason }) => {
          console.log('🎬 Douyin Step:', {
            textLength: text?.length || 0,
            toolCalls:
              toolCalls?.map((tc) => ({
                name: tc.toolName,
                args: tc.args,
              })) || [],
            toolResults:
              toolResults?.map((tr) => ({
                toolCallId: tr.toolCallId,
                result:
                  typeof tr.result === 'string'
                    ? tr.result.substring(0, 50) + '...'
                    : tr.result,
              })) || [],
            finishReason,
          });
        },
      },
    );

    let text3 = '';
    for await (const chunk of response3.textStream) {
      text3 += chunk;
      process.stdout.write(chunk);
    }

    console.log('\n✅ 抖音视频下载场景测试成功');

    console.log('\n🎉 所有测试完成！Agent 修复成功！');
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('错误详情:', {
      name: error.name,
      code: error.code,
      stack: error.stack,
    });
  }
}

testAgentFix();
