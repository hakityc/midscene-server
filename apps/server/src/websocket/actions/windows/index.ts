/**
 * Windows 端 Actions 导出模块
 *
 * 此模块包含所有 Windows 客户端特定的操作处理器
 */

export { createWindowsCommandHandler } from './command';
export { createWindowsAiHandler } from './execute';
export { executeWindowsScriptHandler } from './executeScript';
export { executeTestHandler } from './test';
