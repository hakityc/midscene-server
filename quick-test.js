/**
 * 快速测试 Agent 基本功能
 */

const { mastra } = require('./dist/mastra/index.js');

async function quickTest() {
  console.log('⚡ 快速测试 Agent...\n');

  try {
    const browserAgent = mastra.getAgent('browserAgent');
    console.log('✅ Agent 获取成功');

    const response = await browserAgent.streamVNext('你好');

    let text = '';
    for await (const chunk of response.textStream) {
      text += chunk;
      process.stdout.write(chunk);
    }

    console.log('\n✅ 测试成功！');
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

quickTest();
