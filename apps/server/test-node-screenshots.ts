/**
 * node-screenshots 截图功能测试
 * 
 * 测试内容：
 * 1. 全屏截图
 * 2. 窗口截图（通过 ID）
 * 3. 窗口截图（通过标题）
 * 4. 获取窗口列表
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import WindowsDevice from './src/services/customMidsceneDevice/windowsDevice';
import { windowsNative } from './src/services/customMidsceneDevice/windowsNativeImpl';

async function testNodeScreenshots() {
  console.log('🧪 开始测试 node-screenshots 截图功能\n');

  try {
    // ==================== 测试 1: 获取窗口列表 ====================
    console.log('📋 测试 1: 获取窗口列表');
    console.log('-----------------------------------');
    const windows = windowsNative.getAllWindows();
    console.log(`找到 ${windows.length} 个窗口:\n`);
    
    windows.forEach((win, index) => {
      console.log(`${index + 1}. ID: ${win.id}`);
      console.log(`   标题: ${win.title}`);
      console.log(`   位置: (${win.x}, ${win.y})`);
      console.log(`   尺寸: ${win.width}x${win.height}`);
      console.log('');
    });

    // ==================== 测试 2: 全屏截图 ====================
    console.log('📸 测试 2: 全屏截图（使用 WindowsDevice）');
    console.log('-----------------------------------');
    
    const device = new WindowsDevice({
      deviceName: 'Test Device',
      debug: true,
      screenshot: {
        format: 'jpeg',
        quality: 80,
        mode: 'screen', // 全屏模式
      },
    });

    await device.launch();
    
    const screenSize = await device.size();
    console.log(`屏幕尺寸: ${screenSize.width}x${screenSize.height} (DPR: ${screenSize.dpr})`);
    
    const screenshot1 = await device.screenshotBase64();
    
    // 保存到文件
    const base64Data1 = screenshot1.replace(/^data:image\/\w+;base64,/, '');
    const buffer1 = Buffer.from(base64Data1, 'base64');
    const filepath1 = join(process.cwd(), 'test-fullscreen.jpg');
    writeFileSync(filepath1, buffer1);
    console.log(`✓ 全屏截图已保存: ${filepath1}\n`);

    // ==================== 测试 3: 窗口截图（通过 ID） ====================
    if (windows.length > 0) {
      console.log('🪟 测试 3: 窗口截图（通过 ID）');
      console.log('-----------------------------------');
      
      const targetWindow = windows[0];
      console.log(`目标窗口: "${targetWindow.title}" (ID: ${targetWindow.id})`);
      
      const device2 = new WindowsDevice({
        deviceName: 'Window Test Device',
        debug: true,
        screenshot: {
          format: 'png',
          quality: 100,
          mode: 'window',
          windowId: targetWindow.id,
        },
      });

      await device2.launch();
      const screenshot2 = await device2.screenshotBase64();
      
      const base64Data2 = screenshot2.replace(/^data:image\/\w+;base64,/, '');
      const buffer2 = Buffer.from(base64Data2, 'base64');
      const filepath2 = join(process.cwd(), `test-window-${targetWindow.id}.png`);
      writeFileSync(filepath2, buffer2);
      console.log(`✓ 窗口截图已保存: ${filepath2}\n`);

      await device2.destroy();
    }

    // ==================== 测试 4: 窗口截图（通过标题） ====================
    if (windows.length > 0) {
      console.log('🔍 测试 4: 窗口截图（通过标题）');
      console.log('-----------------------------------');
      
      // 查找一个有实际标题的窗口
      const namedWindow = windows.find(w => w.title && w.title.trim().length > 0);
      
      if (namedWindow) {
        // 使用标题的一部分来测试模糊匹配
        const titlePart = namedWindow.title.substring(0, Math.min(5, namedWindow.title.length));
        console.log(`搜索标题包含: "${titlePart}"`);
        console.log(`找到窗口: "${namedWindow.title}"`);
        
        const device3 = new WindowsDevice({
          deviceName: 'Window Title Test Device',
          debug: true,
          screenshot: {
            format: 'jpeg',
            quality: 90,
            mode: 'window',
            windowTitle: titlePart,
          },
        });

        await device3.launch();
        const screenshot3 = await device3.screenshotBase64();
        
        const base64Data3 = screenshot3.replace(/^data:image\/\w+;base64,/, '');
        const buffer3 = Buffer.from(base64Data3, 'base64');
        const filepath3 = join(process.cwd(), 'test-window-by-title.jpg');
        writeFileSync(filepath3, buffer3);
        console.log(`✓ 窗口截图已保存: ${filepath3}\n`);

        await device3.destroy();
      } else {
        console.log('⚠️ 未找到有效标题的窗口，跳过此测试\n');
      }
    }

    // ==================== 测试 5: 直接使用 windowsNative ====================
    console.log('⚡ 测试 5: 直接使用 windowsNative API');
    console.log('-----------------------------------');
    
    const screenshot5 = await windowsNative.captureScreenAsync({
      format: 'jpeg',
      quality: 70,
    });
    
    const base64Data5 = screenshot5.replace(/^data:image\/\w+;base64,/, '');
    const buffer5 = Buffer.from(base64Data5, 'base64');
    const filepath5 = join(process.cwd(), 'test-native-api.jpg');
    writeFileSync(filepath5, buffer5);
    console.log(`✓ Native API 截图已保存: ${filepath5}\n`);

    // 清理
    await device.destroy();

    console.log('✅ 所有测试完成！');
    console.log('\n生成的文件:');
    console.log('  - test-fullscreen.jpg (全屏截图)');
    if (windows.length > 0) {
      console.log(`  - test-window-${windows[0].id}.png (窗口截图)`);
      console.log('  - test-window-by-title.jpg (通过标题的窗口截图)');
    }
    console.log('  - test-native-api.jpg (Native API 截图)');

  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
testNodeScreenshots().catch(console.error);

