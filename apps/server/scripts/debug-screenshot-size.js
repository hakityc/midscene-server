/**
 * 调试脚本：检查截图尺寸和屏幕尺寸是否匹配
 *
 * 用途：
 * 1. 获取屏幕尺寸（通过 getScreenSize）
 * 2. 获取截图并解析图片实际尺寸
 * 3. 对比两者是否一致
 *
 * 运行：node scripts/debug-screenshot-size.js
 */

const { screen } = require('@nut-tree/nut-js');
const fs = require('fs');
const path = require('path');

async function debugScreenshotSize() {
  console.log('='.repeat(80));
  console.log('调试：检查截图尺寸和屏幕尺寸匹配问题');
  console.log('='.repeat(80));
  console.log();

  try {
    // 1. 获取逻辑分辨率
    console.log('1️⃣ 获取系统报告的分辨率');
    console.log('-'.repeat(80));
    const logicalWidth = await screen.width();
    const logicalHeight = await screen.height();
    console.log(`✓ screen.width(): ${logicalWidth}`);
    console.log(`✓ screen.height(): ${logicalHeight}`);
    console.log();

    // 2. 使用 screen.grab() 获取截图
    console.log('2️⃣ 使用 screen.grab() 获取截图');
    console.log('-'.repeat(80));
    const grabbedImage = await screen.grab();
    console.log(`✓ screenshot.width: ${grabbedImage.width}`);
    console.log(`✓ screenshot.height: ${grabbedImage.height}`);
    console.log(`✓ screenshot.channels: ${grabbedImage.channels}`);
    console.log();

    // 3. 计算 DPR
    console.log('3️⃣ 计算 DPR');
    console.log('-'.repeat(80));
    const dpr = grabbedImage.width / logicalWidth;
    console.log(
      `✓ DPR = ${grabbedImage.width} ÷ ${logicalWidth} = ${dpr.toFixed(4)}`,
    );
    console.log();

    // 4. 模拟 windowsNativeImpl.getScreenSize() 的返回值
    console.log('4️⃣ windowsNativeImpl.getScreenSize() 返回值');
    console.log('-'.repeat(80));
    const screenSize = {
      width: grabbedImage.width, // 物理分辨率
      height: grabbedImage.height,
      dpr: dpr,
    };
    console.log(`width: ${screenSize.width}`);
    console.log(`height: ${screenSize.height}`);
    console.log(`dpr: ${screenSize.dpr.toFixed(4)}`);
    console.log();

    // 5. 验证：如果 AI 基于这个 size 返回坐标
    console.log('5️⃣ 验证场景');
    console.log('-'.repeat(80));
    console.log('假设 AI 要点击屏幕中心：');
    const aiTargetX = screenSize.width / 2;
    const aiTargetY = screenSize.height / 2;
    console.log(`AI 返回坐标（基于物理分辨率）: (${aiTargetX}, ${aiTargetY})`);
    console.log();

    console.log('坐标转换（物理 → 逻辑）：');
    const logicalTargetX = Math.round(aiTargetX / dpr);
    const logicalTargetY = Math.round(aiTargetY / dpr);
    console.log(`转换后的逻辑坐标: (${logicalTargetX}, ${logicalTargetY})`);
    console.log();

    console.log('鼠标实际移动位置（逻辑坐标系）：');
    console.log(`应该移动到: (${logicalTargetX}, ${logicalTargetY})`);
    console.log();

    // 6. 检查是否一致
    console.log('6️⃣ 一致性检查');
    console.log('-'.repeat(80));

    const expectedLogicalCenterX = logicalWidth / 2;
    const expectedLogicalCenterY = logicalHeight / 2;

    console.log(
      `逻辑分辨率中心: (${expectedLogicalCenterX}, ${expectedLogicalCenterY})`,
    );
    console.log(`转换后的中心: (${logicalTargetX}, ${logicalTargetY})`);

    const deltaX = Math.abs(logicalTargetX - expectedLogicalCenterX);
    const deltaY = Math.abs(logicalTargetY - expectedLogicalCenterY);

    if (deltaX < 2 && deltaY < 2) {
      console.log('✅ 坐标转换正确！误差 < 2 像素');
    } else {
      console.log(`❌ 坐标转换有误差！X 偏差: ${deltaX}, Y 偏差: ${deltaY}`);
    }
    console.log();

    // 7. 检查实际使用的流程
    console.log('7️⃣ 实际使用流程检查');
    console.log('-'.repeat(80));
    console.log('步骤 1: windowsDevice.size() 返回:');
    console.log(
      `  { width: ${screenSize.width}, height: ${screenSize.height}, dpr: ${dpr.toFixed(4)} }`,
    );
    console.log();

    console.log('步骤 2: windowsDevice.screenshotBase64() 返回的图片尺寸:');
    console.log(`  实际: ${grabbedImage.width}x${grabbedImage.height}`);
    console.log();

    console.log('步骤 3: Agent 接收到的 context:');
    console.log(
      `  size: { width: ${screenSize.width}, height: ${screenSize.height} }`,
    );
    console.log(
      `  screenshot: ${grabbedImage.width}x${grabbedImage.height} 的图片`,
    );
    console.log();

    if (
      screenSize.width === grabbedImage.width &&
      screenSize.height === grabbedImage.height
    ) {
      console.log('✅ size 和 screenshot 尺寸一致！');
    } else {
      console.log('❌ size 和 screenshot 尺寸不一致！');
      console.log(`  size: ${screenSize.width}x${screenSize.height}`);
      console.log(`  screenshot: ${grabbedImage.width}x${grabbedImage.height}`);
    }
    console.log();

    // 8. 检查可能的问题点
    console.log('8️⃣ 可能的问题点检查');
    console.log('-'.repeat(80));

    // 检查是否有地方在使用逻辑分辨率
    console.log('⚠️ 需要确认的地方：');
    console.log(
      '1. Agent 在创建 UIContext 时使用的 size 是否是我们返回的物理分辨率？',
    );
    console.log('2. AI 分析截图时，截图的实际尺寸和传入的 size 是否一致？');
    console.log(
      '3. convertToLogicalCoordinates 是否在所有鼠标操作中都被调用？',
    );
    console.log();

    console.log('推荐的调试步骤：');
    console.log('1. 在 windowsDevice.size() 中添加日志，确认返回值');
    console.log('2. 在 agent 接收 screenshot 时添加日志，检查图片尺寸');
    console.log('3. 在 mouseClick 时添加日志，确认坐标转换是否执行');
    console.log('4. 运行实际任务，查看日志输出');
    console.log();

    // 9. 生成测试代码
    console.log('9️⃣ 测试代码');
    console.log('-'.repeat(80));
    console.log('添加到 windowsDevice.ts 的 size() 方法：');
    console.log('');
    console.log('```typescript');
    console.log('async size(): Promise<Size> {');
    console.log('  // ... 现有代码 ...');
    console.log('  if (this.options.debug) {');
    console.log(
      '    console.log(`[DEBUG] windowsDevice.size() 返回:`, this.cachedSize);',
    );
    console.log('  }');
    console.log('  return this.cachedSize;');
    console.log('}');
    console.log('```');
    console.log();

    console.log('添加到 windowsDevice.ts 的 screenshotBase64() 方法：');
    console.log('');
    console.log('```typescript');
    console.log('async screenshotBase64(): Promise<string> {');
    console.log('  // ... 现有代码 ...');
    console.log('  if (this.options.debug) {');
    console.log('    // 解析 base64 图片尺寸');
    console.log(
      '    const base64Data = this.cachedScreenshot.replace(/^data:image\\/\\w+;base64,/, "");',
    );
    console.log('    const buffer = Buffer.from(base64Data, "base64");');
    console.log('    // PNG 文件头包含尺寸信息');
    console.log('    const width = buffer.readUInt32BE(16);');
    console.log('    const height = buffer.readUInt32BE(20);');
    console.log(
      '    console.log(`[DEBUG] screenshot 实际尺寸: ${width}x${height}`);',
    );
    console.log('  }');
    console.log('  return this.cachedScreenshot;');
    console.log('}');
    console.log('```');
    console.log();

    console.log('='.repeat(80));
    console.log('调试完成');
    console.log('='.repeat(80));
  } catch (error) {
    console.error('❌ 调试过程中出错:', error);
    console.error(error.stack);
  }
}

// 运行调试
debugScreenshotSize().catch(console.error);
