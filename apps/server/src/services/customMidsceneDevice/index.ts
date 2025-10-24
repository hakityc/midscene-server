/**
 * Custom Midscene Device - Windows 平台实现
 *
 * 这个模块提供了 Windows 平台的 Midscene 设备实现
 * 使用 nut-js 在本地直接执行 Windows 操作
 *
 * 核心组件：
 * - WindowsDevice: 本地 Windows 设备实现（使用 nut-js）
 * - AgentOverWindows: Windows 平台的 Agent 实现
 * - WindowsDeviceProxy: 远程模式实现（已弃用，保留用于兼容）
 */

export {
  type AgentOverWindowsOpt,
  default as AgentOverWindows,
} from './agentOverWindows';

// 核心实现（本地模式，使用 nut-js）
export {
  default as WindowsDevice,
  type WindowsDeviceOptions,
} from './windowsDevice';

// 远程模式（已弃用，保留用于兼容）
export {
  default as WindowsDeviceProxy,
  type WindowsDeviceProxyOptions,
} from './windowsDeviceProxy';
