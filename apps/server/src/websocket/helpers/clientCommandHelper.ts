import type { WsInboundMessage, WsOutboundMessage } from "../../types/websocket"
import { createCommandMessage } from "../builders/messageBuilder"

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
   * @note 如果执行成功，会隐藏遮罩；如果执行失败，保持遮罩显示，让用户看到错误状态
   */
  async executeWithMask<T>(
    action: () => Promise<T>,
    options: { enabled?: boolean } = {},
  ): Promise<T> {
    const { enabled = false } = options
    if (enabled) this.showFullMask()

    try {
      const result = await action()
      // 只有成功时才隐藏遮罩
      if (enabled) this.hideFullMask()
      return result
    } catch (error) {
      // 出错时不隐藏遮罩，让用户看到错误状态
      throw error
    }
  }


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

