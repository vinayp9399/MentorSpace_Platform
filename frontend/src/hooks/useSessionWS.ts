'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import type { WSMessage, Participant } from '@/types'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'

interface UseSessionWSOptions {
  sessionId: string
  userId: string
  userName: string
  role: string
  onCodeUpdate?: (code: string, senderId: string) => void
  onChat?: (msg: { message: string; sender_name: string; role: string; timestamp: string; is_self?: boolean }) => void
  onSystem?: (message: string) => void
  onParticipants?: (participants: Participant[]) => void
  onRTCSignal?: (signal: WSMessage) => void
}

export function useSessionWS({
  sessionId,
  userId,
  userName,
  role,
  onCodeUpdate,
  onChat,
  onSystem,
  onParticipants,
  onRTCSignal,
}: UseSessionWSOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const reconnectTimer = useRef<NodeJS.Timeout>()
  const pingTimer = useRef<NodeJS.Timeout>()

  const connect = useCallback(() => {
    const url = `${WS_URL}/ws/${sessionId}?user_id=${encodeURIComponent(userId)}&user_name=${encodeURIComponent(userName)}&role=${role}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      // Keepalive ping every 25s
      pingTimer.current = setInterval(() => {
        ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ type: 'ping' }))
      }, 25000)
    }

    ws.onclose = () => {
      setConnected(false)
      clearInterval(pingTimer.current)
      // Reconnect after 2s
      reconnectTimer.current = setTimeout(connect, 2000)
    }

    ws.onerror = () => ws.close()

    ws.onmessage = (event) => {
      try {
        const data: WSMessage = JSON.parse(event.data)
        switch (data.type) {
          case 'code_update':
            onCodeUpdate?.(data.code as string, data.sender_id as string)
            break
          case 'chat':
            onChat?.({
              message: data.message as string,
              sender_name: data.sender_name as string,
              role: data.role as string,
              timestamp: data.timestamp as string,
              is_self: data.is_self as boolean,
            })
            break
          case 'system':
            onSystem?.(data.message as string)
            break
          case 'participants':
            onParticipants?.(data.participants as Participant[])
            break
          case 'offer':
          case 'answer':
          case 'ice_candidate':
            onRTCSignal?.(data)
            break
        }
      } catch (_) {}
    }
  }, [sessionId, userId, userName, role])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      clearInterval(pingTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  const sendCodeUpdate = useCallback((code: string, cursor?: { line: number; col: number }) => {
    wsRef.current?.readyState === WebSocket.OPEN &&
      wsRef.current.send(JSON.stringify({ type: 'code_update', code, cursor }))
  }, [])

  const sendChat = useCallback((message: string) => {
    wsRef.current?.readyState === WebSocket.OPEN &&
      wsRef.current.send(JSON.stringify({ type: 'chat', message }))
  }, [])

  const sendLanguageChange = useCallback((language: string) => {
    wsRef.current?.readyState === WebSocket.OPEN &&
      wsRef.current.send(JSON.stringify({ type: 'language_change', language }))
  }, [])

  const sendRTCSignal = useCallback((signal: WSMessage) => {
    wsRef.current?.readyState === WebSocket.OPEN &&
      wsRef.current.send(JSON.stringify(signal))
  }, [])

  return { connected, sendCodeUpdate, sendChat, sendLanguageChange, sendRTCSignal }
}
