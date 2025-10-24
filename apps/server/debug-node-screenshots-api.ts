/**
 * 调试 node-screenshots API
 */

import { Monitor, Window } from 'node-screenshots';

console.log('🔍 检查 Monitor API...\n');

// 获取所有显示器
const monitors = Monitor.all();
console.log(`找到 ${monitors.length} 个显示器\n`);

if (monitors.length > 0) {
  const monitor = monitors[0];
  console.log('Monitor 对象:', monitor);
  console.log('Monitor 类型:', typeof monitor);
  console.log('Monitor 原型:', Object.getPrototypeOf(monitor));
  console.log('Monitor 方法列表:', Object.getOwnPropertyNames(Object.getPrototypeOf(monitor)));
  console.log('');

  // 尝试不同的调用方式
  try {
    console.log('尝试 monitor.id():', monitor.id());
  } catch (e) {
    console.log('monitor.id() 失败:', e.message);
  }

  try {
    console.log('尝试 monitor.width():', monitor.width());
  } catch (e) {
    console.log('monitor.width() 失败:', e.message);
  }

  try {
    console.log('尝试 monitor.height():', monitor.height());
  } catch (e) {
    console.log('monitor.height() 失败:', e.message);
  }

  try {
    console.log('尝试 monitor.isPrimary():', monitor.isPrimary());
  } catch (e) {
    console.log('monitor.isPrimary() 失败:', e.message);
  }
}

console.log('\n🔍 检查 Window API...\n');

// 获取所有窗口
const windows = Window.all();
console.log(`找到 ${windows.length} 个窗口\n`);

if (windows.length > 0) {
  const window = windows[0];
  console.log('Window 对象:', window);
  console.log('Window 类型:', typeof window);
  console.log('Window 原型:', Object.getPrototypeOf(window));
  console.log('Window 方法列表:', Object.getOwnPropertyNames(Object.getPrototypeOf(window)));
  console.log('');

  // 尝试不同的调用方式
  try {
    console.log('尝试 window.id():', window.id());
  } catch (e) {
    console.log('window.id() 失败:', e.message);
  }

  try {
    console.log('尝试 window.title():', window.title());
  } catch (e) {
    console.log('window.title() 失败:', e.message);
  }

  try {
    console.log('尝试 window.x():', window.x());
  } catch (e) {
    console.log('window.x() 失败:', e.message);
  }
}

