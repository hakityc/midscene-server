import { OperateService } from "../../services/operateService"
import type { MessageHandler } from "../../types/websocket"
import { createErrorResponse, createSuccessResponse } from "../builders/messageBuilder"
import { wsLogger } from "../../utils/logger"

const siteScriptMap = {
  bilibili: {
    PAUSE: "document.querySelector('.bpx-player-video-wrap')?.click()", // 暂停
    PLAY: "document.querySelector('.bpx-player-video-wrap')?.click()", // 播放
    PREV: "document.querySelector('.bpx-player-ctrl-prev')?.click()", // 上一集
    NEXT: "document.querySelector('.bpx-player-ctrl-next')?.click()", // 下一集
    EPISODE: "document.querySelector('.numberListItem_number_list_item__T2VKO[title=\"{x}\"]')?.click()", // 第x集
    DANMAKU_TOGGLE: "document.querySelector('.bui-danmaku-switch-input')?.click()", // 打开/关闭弹幕
    FULLSCREEN_TOGGLE: "document.querySelector('.f')?.click()", // 全屏/取消全屏
    MUTE_TOGGLE: "document.querySelector('.bpx-player-ctrl-volume-icon')?.click()", // 静音/打开声音
    HDR: "document.querySelector('[data-value=\"125\"]').click()", // [切换/打开]HDR真彩
    RES_4K: "document.querySelector('[data-value=\"120\"]').click()", // [切换/打开]4K/超高清/最高清晰度
    RES_1080P_HIGH: "document.querySelector('[data-value=\"112\"]').click()", // [切换/打开]1080P高码率/高清
    RES_1080P: "document.querySelector('[data-value=\"80\"]').click()", // [切换/打开]1080P
    RES_720P: "document.querySelector('[data-value=\"64\"]').click()", // [切换/打开]720P/准高清
    RES_480P: "document.querySelector('[data-value=\"32\"]').click()", // [切换/打开]480P/标清
    RES_360P: "document.querySelector('[data-value=\"16\"]').click()", // [切换/打开]360P/流畅/最低清晰度
    RATE_2: "document.querySelector('.bpx-player-ctrl-playbackrate-menu-item[data-value=\"2\"]')?.click()", // 2倍速
    RATE_1: "document.querySelector('.bpx-player-ctrl-playbackrate-menu-item[data-value=\"1\"]')?.click()", // 1倍速
    RATE_1_25: "document.querySelector('.bpx-player-ctrl-playbackrate-menu-item[data-value=\"1.25\"]')?.click()", // 1.25倍速
    RATE_1_5: "document.querySelector('.bpx-player-ctrl-playbackrate-menu-item[data-value=\"1.5\"]')?.click()", // 1.5倍速
    RATE_0_5: "document.querySelector('.bpx-player-ctrl-playbackrate-menu-item[data-value=\"0.5\"]')?.click()", // 0.5倍速
  },
} as const

type SiteMap = typeof siteScriptMap
type Site = keyof SiteMap
type Command = keyof SiteMap[Site]

// 请求处理器
export function handleSiteScriptHandler(): MessageHandler {
  return async ({ send }, message) => {
    const { payload } = message
    try {
      wsLogger.info(message, "处理站点脚本请求")
      const operateService = OperateService.getInstance()
      const agent = operateService.agent
      const site = payload.site as Site
      let script = siteScriptMap[site][payload.params as Command] as string
      if (script.includes("{x}")) {
        const x = (payload as any).value ?? (payload as any).x
        script = script.replace("{x}", String(x))
      }
      const data = await agent.evaluateJavaScript(script)
      if(data.result.subtype === 'error'){
        throw new Error(data.result.description)
      }
      const response = createSuccessResponse(message, `处理完成`)
      send(response)
    } catch (error) {
      wsLogger.error(message, "处理站点脚本请求失败")
      const response = createErrorResponse(message, error, "处理失败")
      send(response)
    }
  }
}
