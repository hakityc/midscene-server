import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

type WebSocketStatus = "idle" | "connecting" | "open" | "closing" | "closed" | "error"

export default function MidsceneDebugPage() {
  const [status, setStatus] = useState<WebSocketStatus>("idle")
  const [input, setInput] = useState<string>('{\n  "type": "ping"\n}')
  const [error, setError] = useState<string>("")
  const socketRef = useRef<WebSocket | null>(null)

  const endpoint = useMemo(() => {
    return "ws://localhost:3000/ws"
  }, [])

  const { parsed, isValid } = useMemo(() => {
    try {
      const data = JSON.parse(input)
      return { parsed: data as unknown, isValid: true }
    } catch {
      return { parsed: null as unknown, isValid: false }
    }
  }, [input])

  const init = useCallback(() => {
    // Close previous socket if any
    if (
      socketRef.current &&
      (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)
    ) {
      try {
        socketRef.current.close(1000, "reconnect")
      } catch {}
    }

    setError("")
    setStatus("connecting")

    try {
      const ws = new WebSocket(endpoint)
      socketRef.current = ws

      ws.onopen = () => {
        setStatus("open")
      }
      ws.onclose = () => {
        setStatus("closed")
      }
      ws.onerror = () => {
        setStatus("error")
        setError("WebSocket 连接出错")
      }
      ws.onmessage = () => {
        // 这里不展示消息内容，避免包含用户相关字段
      }
    } catch (e) {
      setStatus("error")
      setError(e instanceof Error ? e.message : "WebSocket 初始化失败")
    }
  }, [endpoint])

  const send = useCallback(() => {
    setError("")
    const ws = socketRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setError("WebSocket 未连接")
      return
    }

    try {
      // 不包含用户字段，仅发送提供的 JSON
      ws.send(JSON.stringify(parsed))
    } catch (e) {
      setError("JSON 解析失败，请检查格式是否正确")
    }
  }, [parsed])

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        try {
          socketRef.current.close(1000, "page unmount")
        } catch {}
      }
    }
  }, [])

  return (
    <div className="min-h-screen w-full bg-[repeating-linear-gradient(135deg,white,white_14px,#f2f2f2_14px,#f2f2f2_28px)] text-foreground">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center p-6">
        <Card className="w-4/5 rounded-none border-2 border-black bg-white shadow-[8px_8px_0_0_#000]">
          <CardHeader className="pb-2 px-4">
            <CardTitle className="text-2xl font-extrabold tracking-tight">
              <span className="relative inline-block">
                <span className="relative z-10">Midscene Debug</span>
                <span className="absolute inset-x-0 bottom-0 z-0 h-2 translate-y-1 bg-amber-300"></span>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-20">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={init}
                disabled={status === "connecting"}
                className="rounded-none border-2 border-black bg-lime-300 px-4 py-2 font-bold text-black shadow-[4px_4px_0_0_#000] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] disabled:opacity-60"
              >
                {status === "connecting" ? "连接中..." : status === "open" ? "已连接(重新初始化)" : "初始化"}
              </Button>
              <span className="inline-flex items-center gap-2 rounded-none border-2 border-black bg-white px-3 py-1 text-xs font-bold text-black shadow-[3px_3px_0_0_#000]">
                <span
                  className={
                    "size-2.5 rounded-full border border-black " +
                    (status === "open"
                      ? "bg-green-400"
                      : status === "connecting"
                      ? "bg-amber-400"
                      : status === "error"
                      ? "bg-red-400"
                      : "bg-gray-300")
                  }
                />
                <span>状态：{status}</span>
              </span>
            </div>

            <Separator className="h-2 rounded-none border-2 border-black bg-black" />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  className="font-extrabold"
                >
                  JSON 内容
                </Label>
                <span className={"text-xs font-bold " + (isValid ? "text-green-700" : "text-red-700")}>
                  {isValid ? "格式有效" : "格式无效"}
                </span>
              </div>
              <Textarea
                className="h-600 resize-none rounded-none border-2 border-black bg-white font-mono text-sm leading-tight shadow-[4px_4px_0_0_#000] focus-visible:ring-0"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="在此粘贴或编写 JSON"
                spellCheck={false}
                aria-invalid={!isValid}
              />
              <div className="flex justify-end">
                <Button
                  onClick={send}
                  variant="default"
                  disabled={!isValid || status !== "open"}
                  className="rounded-none border-2 border-black bg-cyan-300 px-4 py-2 font-extrabold text-black shadow-[4px_4px_0_0_#000] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] disabled:opacity-60"
                >
                  发送
                </Button>
              </div>
            </div>

            {error ? (
              <div className="rounded-none border-2 border-black bg-red-200 p-3 text-sm font-bold text-red-900 shadow-[3px_3px_0_0_#000]">
                {error}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
