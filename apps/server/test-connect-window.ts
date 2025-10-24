/**
 * connectWindow 功能测试脚本
 *
 * 测试场景：
 * 1. 获取窗口列表
 * 2. 通过窗口标题连接窗口
 * 3. 验证截图使用连接的窗口
 * 4. 切换到另一个窗口
 * 5. 断开窗口连接
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import WindowsDevice from './src/services/customMidsceneDevice/windowsDevice';

async function testConnectWindow() {
  console.log('🧪 开始测试 connectWindow 功能\n');

  const device = new WindowsDevice({
    deviceName: 'Test Device',
    debug: true,
  });

  try {
    // 启动设备
    await device.launch();
    console.log('✅ 设备启动成功\n');

    // ==================== 测试 1: 获取窗口列表 ====================
    console.log('📋 测试 1: 获取窗口列表');
    console.log('-----------------------------------');
    const windows = await device.getWindowList();
    console.log(`找到 ${windows.length} 个窗口:\n`);

    windows.slice(0, 10).forEach((win, index) => {
      console.log(`${index + 1}. ID: ${win.id}`);
      console.log(`   标题: ${win.title}`);
      console.log(`   尺寸: ${win.width}x${win.height}`);
      console.log('');
    });

    if (windows.length === 0) {
      console.log('❌ 未找到窗口，测试终止');
      return;
    }

    // ==================== 测试 2: 连接到第一个有标题的窗口 ====================
    console.log('🪟 测试 2: 连接到窗口');
    console.log('-----------------------------------');

    const targetWindow = windows.find(
      (w) => w.title && w.title.trim().length > 0,
    );

    if (!targetWindow) {
      console.log('❌ 未找到有效标题的窗口，测试终止');
      return;
    }

    console.log(`目标窗口: "${targetWindow.title}" (ID: ${targetWindow.id})\n`);

    // 通过窗口标题连接（模糊匹配）
    const titlePart = targetWindow.title.substring(
      0,
      Math.min(5, targetWindow.title.length),
    );
    console.log(`使用标题片段连接: "${titlePart}"`);

    const connectedInfo1 = await device.connectWindow({
      windowTitle: titlePart,
    });
    console.log(
      `✅ 连接成功: "${connectedInfo1.title}" (ID: ${connectedInfo1.id})\n`,
    );

    // ==================== 测试 3: 截图验证 ====================
    console.log('📸 测试 3: 验证截图使用连接的窗口');
    console.log('-----------------------------------');

    const screenshot1 = await device.screenshotBase64();
    const base64Data1 = screenshot1.replace(/^data:image\/\w+;base64,/, '');
    const buffer1 = Buffer.from(base64Data1, 'base64');
    const filepath1 = join(process.cwd(), 'test-connected-window-1.jpg');
    writeFileSync(filepath1, buffer1);
    console.log(`✅ 窗口截图已保存: ${filepath1}\n`);

    // ==================== 测试 4: 切换窗口 ====================
    if (windows.length > 1) {
      console.log('🔄 测试 4: 切换到另一个窗口');
      console.log('-----------------------------------');

      const anotherWindow = windows.find(
        (w) =>
          w.id !== connectedInfo1.id && w.title && w.title.trim().length > 0,
      );

      if (anotherWindow) {
        console.log(
          `切换到窗口: "${anotherWindow.title}" (ID: ${anotherWindow.id})`,
        );

        const connectedInfo2 = await device.connectWindow({
          windowId: anotherWindow.id,
        });
        console.log(
          `✅ 切换成功: "${connectedInfo2.title}" (ID: ${connectedInfo2.id})\n`,
        );

        // 再次截图
        const screenshot2 = await device.screenshotBase64();
        const base64Data2 = screenshot2.replace(/^data:image\/\w+;base64,/, '');
        const buffer2 = Buffer.from(base64Data2, 'base64');
        const filepath2 = join(process.cwd(), 'test-connected-window-2.jpg');
        writeFileSync(filepath2, buffer2);
        console.log(`✅ 新窗口截图已保存: ${filepath2}\n`);
      } else {
        console.log('⚠️ 未找到其他有效窗口，跳过切换测试\n');
      }
    }

    // ==================== 测试 5: 获取连接信息 ====================
    console.log('ℹ️  测试 5: 获取当前连接的窗口信息');
    console.log('-----------------------------------');

    const currentWindow = device.getConnectedWindow();
    if (currentWindow) {
      console.log(
        `当前连接窗口: "${currentWindow.title}" (ID: ${currentWindow.id})`,
      );
      console.log(`窗口尺寸: ${currentWindow.width}x${currentWindow.height}\n`);
    } else {
      console.log('⚠️ 未连接到任何窗口\n');
    }

    // ==================== 测试 6: 断开窗口连接 ====================
    console.log('🔌 测试 6: 断开窗口连接');
    console.log('-----------------------------------');

    device.disconnectWindow();
    console.log('✅ 窗口连接已断开\n');

    // 验证断开后回到全屏模式
    const disconnectedWindow = device.getConnectedWindow();
    console.log(
      `断开后的连接状态: ${disconnectedWindow === null ? '无连接（全屏模式）' : '仍有连接'}\n`,
    );

    // 全屏截图
    const screenshot3 = await device.screenshotBase64();
    const base64Data3 = screenshot3.replace(/^data:image\/\w+;base64,/, '');
    const buffer3 = Buffer.from(base64Data3, 'base64');
    const filepath3 = join(process.cwd(), 'test-fullscreen.jpg');
    writeFileSync(filepath3, buffer3);
    console.log(`✅ 全屏截图已保存: ${filepath3}\n`);

    console.log('✅ 所有测试完成！');
    console.log('\n生成的文件:');
    console.log('  - test-connected-window-1.jpg (第一个连接的窗口)');
    if (windows.length > 1) {
      console.log('  - test-connected-window-2.jpg (第二个连接的窗口)');
    }
    console.log('  - test-fullscreen.jpg (断开连接后的全屏截图)');
  } catch (error) {
    console.error('❌ 测试失败:', error);
    throw error;
  } finally {
    // 清理
    await device.destroy();
    console.log('\n🛑 设备已销毁');
  }
}

// 运行测试
testConnectWindow().catch(console.error);
