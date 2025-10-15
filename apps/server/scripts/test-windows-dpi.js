/**
 * Windows DPI 缩放问题诊断脚本
 *
 * 用途：
 * 1. 检测 nut-js 的 screen.width/height 返回的是逻辑分辨率还是物理分辨率
 * 2. 检测 screen.capture/grab 返回的图片分辨率
 * 3. 验证 mouse.move 使用的坐标系统
 * 4. 计算实际的 DPR
 *
 * 运行方法：
 * node scripts/test-windows-dpi.js
 */

const { screen, mouse, Point, FileType } = require('@nut-tree/nut-js');
const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');

async function diagnoseWindowsDPI() {
  console.log('='.repeat(80));
  console.log('Windows DPI 缩放诊断');
  console.log('='.repeat(80));
  console.log();

  try {
    // 1. 获取 screen.width/height
    console.log('1️⃣ 检查 screen.width() 和 screen.height()');
    console.log('-'.repeat(80));
    const logicalWidth = await screen.width();
    const logicalHeight = await screen.height();
    console.log(`✓ screen.width(): ${logicalWidth}`);
    console.log(`✓ screen.height(): ${logicalHeight}`);
    console.log();

    // 2. 捕获截图并检查实际图片尺寸
    console.log('2️⃣ 捕获截图并检查图片尺寸');
    console.log('-'.repeat(80));

    // 方法 A: 使用 screen.grab()
    console.log('方法 A: 使用 screen.grab()');
    const grabbedImage = await screen.grab();
    console.log(`✓ grabbedImage.width: ${grabbedImage.width}`);
    console.log(`✓ grabbedImage.height: ${grabbedImage.height}`);
    console.log(`✓ grabbedImage.channels: ${grabbedImage.channels}`);
    console.log();

    // 方法 B: 使用 screen.capture() 保存到文件
    console.log('方法 B: 使用 screen.capture() 保存到文件');
    const tempFileName = 'dpi_test_screenshot';
    const tempFilePath = tmpdir();
    const savedPath = await screen.capture(
      tempFileName,
      FileType.PNG,
      tempFilePath,
    );
    console.log(`✓ 截图已保存: ${savedPath}`);

    // 读取 PNG 文件头获取尺寸
    const pngBuffer = fs.readFileSync(savedPath);
    const pngWidth = pngBuffer.readUInt32BE(16);
    const pngHeight = pngBuffer.readUInt32BE(20);
    console.log(`✓ PNG 文件宽度: ${pngWidth}`);
    console.log(`✓ PNG 文件高度: ${pngHeight}`);
    console.log();

    // 3. 计算 DPR
    console.log('3️⃣ 计算 DPR (Device Pixel Ratio)');
    console.log('-'.repeat(80));
    const dprFromGrab = grabbedImage.width / logicalWidth;
    const dprFromPNG = pngWidth / logicalWidth;
    console.log(`✓ DPR (从 grab): ${dprFromGrab.toFixed(4)}`);
    console.log(`✓ DPR (从 PNG): ${dprFromPNG.toFixed(4)}`);

    if (Math.abs(dprFromGrab - dprFromPNG) < 0.01) {
      console.log(`✓ 两种方法的 DPR 一致`);
    } else {
      console.log(`⚠️ 警告: 两种方法的 DPR 不一致!`);
    }
    console.log();

    // 4. 分析结果
    console.log('4️⃣ 分析结果');
    console.log('-'.repeat(80));

    const dpr = dprFromGrab;

    if (Math.abs(dpr - 1.0) < 0.01) {
      console.log(`✓ DPR = 1.0 (100% 缩放)`);
      console.log(`  screen.width/height 和截图尺寸一致`);
      console.log(`  可能情况:`);
      console.log(`  - Windows 缩放设置为 100%`);
      console.log(`  - 或者 nut-js 已经处理了 DPI 缩放`);
    } else {
      console.log(`⚠️ DPR = ${dpr.toFixed(4)} (${Math.round(dpr * 100)}% 缩放)`);
      console.log(`  screen.width/height: ${logicalWidth}x${logicalHeight}`);
      console.log(
        `  截图实际尺寸: ${grabbedImage.width}x${grabbedImage.height}`,
      );
      console.log();
      console.log(`  结论:`);

      if (dpr > 1) {
        console.log(
          `  ❌ 问题确认: 截图是物理分辨率，但 screen.width/height 是逻辑分辨率`,
        );
        console.log(`  ❌ 这会导致坐标不匹配!`);
        console.log();
        console.log(`  修复方案:`);
        console.log(
          `  1. 在 getScreenSize() 中返回物理分辨率 (${grabbedImage.width}x${grabbedImage.height})`,
        );
        console.log(`  2. 确保 DPR = ${dpr.toFixed(4)}`);
        console.log(
          `  3. AI 返回的坐标基于物理分辨率，可以直接用于 mouse.move()`,
        );
      }
    }
    console.log();

    // 5. 测试鼠标移动（需要用户确认）
    console.log('5️⃣ 测试鼠标坐标系统');
    console.log('-'.repeat(80));
    console.log(`准备测试鼠标移动...`);
    console.log(`将移动鼠标到以下位置（逻辑坐标）:`);

    const testPoints = [
      { name: '左上角', x: 100, y: 100 },
      {
        name: '逻辑中心',
        x: Math.round(logicalWidth / 2),
        y: Math.round(logicalHeight / 2),
      },
    ];

    console.log();
    console.log('⚠️ 请观察鼠标是否移动到正确位置');
    console.log();

    for (const point of testPoints) {
      console.log(`测试点: ${point.name} (${point.x}, ${point.y})`);
      await mouse.move([new Point(point.x, point.y)]);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const currentPos = await mouse.getPosition();
      console.log(`  当前鼠标位置: (${currentPos.x}, ${currentPos.y})`);

      if (
        Math.abs(currentPos.x - point.x) < 2 &&
        Math.abs(currentPos.y - point.y) < 2
      ) {
        console.log(`  ✓ 移动成功 - mouse.move() 使用逻辑坐标`);
      } else {
        console.log(`  ⚠️ 位置不一致 - 需要进一步调查`);
      }
      console.log();
    }

    // 6. 生成修复建议
    console.log('6️⃣ 修复建议');
    console.log('-'.repeat(80));
    console.log();
    console.log('基于诊断结果，修改 windowsNativeImpl.ts:');
    console.log();
    console.log('```typescript');
    console.log('getScreenSize(): ScreenInfo {');
    console.log('  return this.runSync(async () => {');
    console.log('    const logicalWidth = await screen.width();');
    console.log('    const logicalHeight = await screen.height();');
    console.log();
    console.log('    // 通过截图获取物理分辨率');
    console.log('    const screenshot = await screen.grab();');
    console.log('    const physicalWidth = screenshot.width;');
    console.log('    const physicalHeight = screenshot.height;');
    console.log();
    console.log('    // 计算 DPR');
    console.log(
      `    const dpr = physicalWidth / logicalWidth; // 当前测试值: ${dpr.toFixed(4)}`,
    );
    console.log();
    console.log('    return {');
    console.log('      width: physicalWidth,   // 使用物理分辨率');
    console.log('      height: physicalHeight,');
    console.log('      dpr,');
    console.log('    };');
    console.log('  }) || { width: 1920, height: 1080, dpr: 1 };');
    console.log('}');
    console.log();
    console.log('mouseClick(x: number, y: number): void {');
    console.log('  // x, y 是基于物理分辨率的坐标（AI 从截图中识别）');
    console.log('  // 需要转换为逻辑坐标给 nut-js');
    console.log('  this.runSync(async () => {');
    console.log('    const screenInfo = this.getScreenSize();');
    console.log(
      `    const logicalX = Math.round(x / ${dpr.toFixed(4)}); // 转换为逻辑坐标`,
    );
    console.log(`    const logicalY = Math.round(y / ${dpr.toFixed(4)});`);
    console.log('    await mouse.move([new Point(logicalX, logicalY)]);');
    console.log('    await mouse.click(Button.LEFT);');
    console.log('  });');
    console.log('}');
    console.log('```');
    console.log();

    // 7. 总结
    console.log('='.repeat(80));
    console.log('诊断完成');
    console.log('='.repeat(80));
    console.log();
    console.log(`系统信息:`);
    console.log(`  逻辑分辨率: ${logicalWidth}x${logicalHeight}`);
    console.log(`  物理分辨率: ${grabbedImage.width}x${grabbedImage.height}`);
    console.log(`  DPR: ${dpr.toFixed(4)} (${Math.round(dpr * 100)}%)`);
    console.log();
    console.log(`截图保存位置: ${savedPath}`);
    console.log(`请检查截图文件确认分辨率`);
    console.log();

    // 清理临时文件
    fs.unlinkSync(savedPath);
    console.log('临时文件已清理');
  } catch (error) {
    console.error('❌ 诊断过程中出错:', error);
    console.error(error.stack);
  }
}

// 运行诊断
diagnoseWindowsDPI().catch(console.error);
