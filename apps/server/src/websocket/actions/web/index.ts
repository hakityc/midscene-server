/**
 * Web 端 Actions 导出模块
 *
 * 此模块包含所有 Web 客户端特定的操作处理器
 * 这些处理器使用 WebOperateService 与浏览器标签页交互
 */

export { createCommandHandler } from '../command';
export { createConnectTabHandler } from '../connect';
export { createDownloadVideoHandler } from '../downloadVideo';
export { createAiHandler } from '../execute';
export { executeScriptHandler } from '../executeScript';
export { handleSiteScriptHandler } from '../siteScript';
