/**
 * 测试截图质量压缩功能
 *
 * 测试不同质量设置对文件大小和性能的影响
 */

import WindowsDevice from '../src/services/customMidsceneDevice/windowsDevice';

async function testScreenshotQuality() {
  console.log('🧪 开始测试截图质量压缩功能\n');

  // 测试配置
  const testConfigs = [
    { name: 'PNG（无压缩）', format: 'png' as const, quality: undefined },
    { name: 'JPEG 质量 90（推荐）', format: 'jpeg' as const, quality: 90 },
    { name: 'JPEG 质量 80', format: 'jpeg' as const, quality: 80 },
    { name: 'JPEG 质量 70', format: 'jpeg' as const, quality: 70 },
    { name: 'JPEG 质量 60', format: 'jpeg' as const, quality: 60 },
  ];

  const results: Array<{
    name: string;
    size: number;
    time: number;
    base64Length: number;
  }> = [];

  for (const config of testConfigs) {
    console.log(`\n📸 测试: ${config.name}`);
    console.log('━'.repeat(60));

    try {
      // 创建设备实例
      const device = new WindowsDevice({
        deviceName: 'Test Device',
        debug: false,
        screenshot: {
          format: config.format,
          quality: config.quality,
        },
      });

      // 启动设备
      await device.launch();

      // 截图并计时
      const startTime = Date.now();
      const screenshot = await device.screenshotBase64();
      const endTime = Date.now();

      // 计算大小
      const base64Length = screenshot.length;
      const estimatedSize = (base64Length * 0.75) / 1024; // KB

      const result = {
        name: config.name,
        size: estimatedSize,
        time: endTime - startTime,
        base64Length,
      };

      results.push(result);

      console.log(`  ✓ 截图成功`);
      console.log(`  ⏱️  耗时: ${result.time}ms`);
      console.log(`  📦 大小: ${result.size.toFixed(2)}KB`);
      console.log(`  📏 Base64 长度: ${result.base64Length.toLocaleString()}`);

      // 清理
      await device.destroy();
    } catch (error) {
      console.error(`  ❌ 测试失败:`, error);
    }

    // 等待一下，避免截图太频繁
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // 输出对比表格
  console.log('\n\n📊 测试结果对比');
  console.log('━'.repeat(80));
  console.log(
    `${'配置'.padEnd(20)} | ${'大小 (KB)'.padEnd(12)} | ${'耗时 (ms)'.padEnd(12)} | ${'压缩率'.padEnd(10)}`,
  );
  console.log('━'.repeat(80));

  const baselineSize = results[0]?.size || 1;
  for (const result of results) {
    const compressionRatio = ((1 - result.size / baselineSize) * 100).toFixed(
      1,
    );
    console.log(
      `${result.name.padEnd(20)} | ${result.size.toFixed(2).padEnd(12)} | ${result.time.toString().padEnd(12)} | ${compressionRatio}%`,
    );
  }

  console.log('━'.repeat(80));

  // 输出建议
  console.log('\n💡 建议:');
  console.log('  • 默认使用 JPEG 质量 90，与 web 版本对齐');
  console.log('  • 对于高 DPI 屏幕，JPEG 90 可减少 80-90% 的文件大小');
  console.log('  • 如果需要最高质量，可使用 PNG 格式');
  console.log('  • JPEG 70-80 适合网络较慢的场景\n');
}

// 运行测试
testScreenshotQuality().catch((error) => {
  console.error('测试失败:', error);
  process.exit(1);
});
