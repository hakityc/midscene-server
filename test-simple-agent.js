/**
 * 简单测试 browserAgent 的返回值处理
 */

const { mastra } = require('./dist/mastra/index.js');

async function testSimpleAgent() {
  console.log('🧪 开始简单测试 browserAgent...\n');

  try {
    // 获取 browserAgent
    const browserAgent = mastra.getAgent('browserAgent');
    console.log('✅ browserAgent 获取成功');

    // 测试1: 简单对话
    console.log('\n📝 测试1: 简单对话');
    const response1 = await browserAgent.streamVNext(
      '你好，请简单介绍一下你自己',
    );

    let text1 = '';
    for await (const chunk of response1.textStream) {
      text1 += chunk;
      process.stdout.write(chunk);
    }

    console.log('\n✅ 测试1完成');

    // 测试2: 工具调用
    console.log('\n🔧 测试2: 工具调用');
    const response2 = await browserAgent.streamVNext('请获取当前页面的URL');

    let text2 = '';
    for await (const chunk of response2.textStream) {
      text2 += chunk;
      process.stdout.write(chunk);
    }

    console.log('\n✅ 测试2完成');

    // 测试3: 抖音视频下载
    console.log('\n🎬 测试3: 抖音视频下载');
    const response3 = await browserAgent.streamVNext(
      '如果我在抖音视频播放页面，请获取视频下载链接',
    );

    let text3 = '';
    for await (const chunk of response3.textStream) {
      text3 += chunk;
      process.stdout.write(chunk);
    }

    console.log('\n✅ 测试3完成');

    console.log('\n🎉 所有测试完成！');
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

testSimpleAgent();
