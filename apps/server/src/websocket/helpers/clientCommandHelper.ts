import type { WsInboundMessage, WsOutboundMessage } from "../../types/websocket"
import { createCommandMessage } from "../builders/messageBuilder"

/**
 * 遮罩控制器接口
 */
export interface MaskController {
  start: () => void
  stop: () => void
  withMask: <T>(action: () => Promise<T>) => Promise<T>
}

/**
 * 客户端命令辅助类
 * 用于向客户端发送各种控制命令
 */
export class ClientCommandHelper {
  constructor(
    private message: WsInboundMessage<string>,
    private send: (message: WsOutboundMessage<string>) => boolean,
  ) {}

  /**
   * 发送命令到客户端
   * @param command - 命令名称
   * @param payload - 可选的命令载荷
   */
  private sendCommand(command: string): void {
    const commandMessage = createCommandMessage(this.message, command)
    this.send(commandMessage)
  }

  /**
   * 显示全屏遮罩
   */
  showFullMask(): void {
    this.sendCommand("showFullMask")
  }

  /**
   * 隐藏全屏遮罩
   */
  hideFullMask(): void {
    this.sendCommand("hideFullMask")
  }

  /**
   * 在遮罩保护下执行操作
   * @param action - 要执行的异步操作
   * @param options - 配置选项
   * @returns 操作的结果
   */
  async executeWithMask<T>(
    action: () => Promise<T>,
    options: { enabled?: boolean } = {},
  ): Promise<T> {
    const { enabled = true } = options

    try {
      if (enabled) this.showFullMask()
      return await action()
    } finally {
      if (enabled) this.hideFullMask()
    }
  }


}

/**
 * 创建遮罩控制器（函数式 API）
 * @param message - 入站消息
 * @param send - 消息发送函数
 * @param enableMask - 是否启用遮罩控制，默认为 true
 * @returns 包含 start、stop 和 withMask 方法的控制器对象
 */
export const createMaskController = (
  message: WsInboundMessage<string>,
  send: (message: WsOutboundMessage<string>) => boolean,
  enableMask = true,
): MaskController => {
  const start = () => {
    if (!enableMask) return
    const command = createCommandMessage(message, "showFullMask")
    send(command)
  }

  const stop = () => {
    if (!enableMask) return
    const command = createCommandMessage(message, "hideFullMask")
    send(command)
  }

  const withMask = async <T>(action: () => Promise<T>): Promise<T> => {
    try {
      start()
      return await action()
    } finally {
      stop()
    }
  }

  return { start, stop, withMask }
}

/**
 * 创建客户端命令辅助实例的快捷函数
 * @param message - 入站消息
 * @param send - 消息发送函数
 * @returns ClientCommandHelper 实例
 */
export const createClientCommandHelper = (
  message: WsInboundMessage<string>,
  send: (message: WsOutboundMessage<string>) => boolean,
): ClientCommandHelper => {
  return new ClientCommandHelper(message, send)
}

