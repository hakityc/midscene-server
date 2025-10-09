/**
 * Custom Midscene Device - Windows 平台实现
 * 
 * 这个模块提供了 Windows 平台的 Midscene 设备实现
 * 
 * 核心组件：
 * - WindowsDeviceProxy: 通过 WebSocket 代理 Windows 操作
 * - AgentOverWindows: Windows 平台的 Agent 实现
 * - WindowsDevice: Mock 实现（保留作为参考）
 */

// 核心实现（使用 WebSocket 代理）
export { default as WindowsDeviceProxy, type WindowsDeviceProxyOptions } from "./windowsDeviceProxy"
export { default as AgentOverWindows, type AgentOverWindowsOpt } from "./agentOverWindows"

// Mock 实现（仅作为参考和测试）
export { default as WindowsDevice, type WindowsDeviceOptions } from "./windowsDevice"

