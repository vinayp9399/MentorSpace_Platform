'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { CodeEditor } from '@/components/editor/CodeEditor'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { VideoCall } from '@/components/video/VideoCall'
import { useSessionWS } from '@/hooks/useSessionWS'
import { useChatStore } from '@/store'
import { messagesApi } from '@/lib/api'
import type { Session, User, Participant, Language, WSMessage, Message } from '@/types'

interface SessionRoomProps {
  session: Session
  currentUser: User
  onEnd?: () => void
}

// Deduplicate participants by user_id — prevents duplicate chips when the
// server sends multiple participants events (e.g. on reconnect)
function dedupeParticipants(list: Participant[]): Participant[] {
  const map = new Map<string, Participant>()
  for (const p of list) map.set(p.user_id, p)
  return Array.from(map.values())
}

export function SessionRoom({ session, currentUser, onEnd }: SessionRoomProps) {
  const [code, setCode] = useState(session.initial_code)
  const [language, setLanguage] = useState<Language>(session.language)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [activePanel, setActivePanel] = useState<'editor' | 'video'>('editor')
  const [remoteTyping, setRemoteTyping] = useState(false)
  const [remoteUserName, setRemoteUserName] = useState('')
  const [incomingRTCSignal, setIncomingRTCSignal] = useState<WSMessage | null>(null)
  const [runOutput, setRunOutput] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [copied, setCopied] = useState(false)
  const typingTimer = useRef<NodeJS.Timeout>()

  // Keep a ref to participants so handleCodeUpdate can read the latest value
  // without being re-created every time participants changes — avoids stale
  // closure where participants was always [] on first render
  const participantsRef = useRef<Participant[]>([])
  useEffect(() => { participantsRef.current = participants }, [participants])

  const { messages, addMessage, setMessages } = useChatStore()
  const sessionMessages = messages[session.id] || []

  // Load message history — setMessages added to deps to satisfy exhaustive-deps
  useEffect(() => {
    messagesApi.getForSession(session.id).then(msgs => setMessages(session.id, msgs)).catch(() => {})
  }, [session.id, setMessages])

  // FIX: read participants via ref instead of closing over the state value.
  // Previously participants was in the dep array which caused handleCodeUpdate
  // to be recreated on every join/leave, re-registering the WS handler repeatedly.
  const handleCodeUpdate = useCallback((newCode: string, senderId: string) => {
    setCode(newCode)
    const sender = participantsRef.current.find(p => p.user_id === senderId)
    if (sender) {
      setRemoteTyping(true)
      setRemoteUserName(sender.user_name)
      clearTimeout(typingTimer.current)
      typingTimer.current = setTimeout(() => setRemoteTyping(false), 1500)
    }
  }, []) // no deps needed — participants accessed via ref

  const handleChat = useCallback((data: { message: string; sender_name: string; role: string; timestamp: string; is_self?: boolean }) => {
    const msg: Message = {
      id: Date.now().toString(),
      session_id: session.id,
      sender_id: data.is_self ? currentUser.id : undefined,
      sender_name: data.sender_name,
      content: data.message,
      message_type: 'chat',
      timestamp: data.timestamp,
      is_self: data.is_self,
      role: data.role as any,
    }
    addMessage(session.id, msg)
    // Persist to backend
    if (data.is_self) {
      messagesApi.save({ session_id: session.id, content: data.message, message_type: 'chat' }).catch(() => {})
    }
  }, [session.id, currentUser.id, addMessage])

  const handleSystem = useCallback((message: string) => {
    addMessage(session.id, {
      id: Date.now().toString(),
      session_id: session.id,
      sender_name: 'System',
      content: message,
      message_type: 'system',
      timestamp: new Date().toISOString(),
    })
  }, [session.id, addMessage])

  // FIX: wrap setParticipants with dedup so duplicate user entries from
  // multiple server broadcasts (e.g. on reconnect) are collapsed by user_id
  const handleParticipants = useCallback((incoming: Participant[]) => {
    setParticipants(dedupeParticipants(incoming))
  }, [])

  const { connected, sendCodeUpdate, sendChat, sendLanguageChange, sendRTCSignal } = useSessionWS({
    sessionId: session.id,
    userId: currentUser.id,
    userName: currentUser.full_name,
    role: currentUser.role,
    onCodeUpdate: handleCodeUpdate,
    onChat: handleChat,
    onSystem: handleSystem,
    onParticipants: handleParticipants, // FIX: was passing raw setParticipants
    onRTCSignal: setIncomingRTCSignal,
  })

  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode)
    sendCodeUpdate(newCode)
  }, [sendCodeUpdate])

  const handleSendChat = useCallback((message: string) => {
    sendChat(message)
  }, [sendChat])

  const handleLanguageChange = useCallback((lang: Language) => {
    setLanguage(lang)
    sendLanguageChange(lang)
  }, [sendLanguageChange])

  const handleRun = async () => {
    setIsRunning(true)
    setRunOutput(null)
    await new Promise(r => setTimeout(r, 900))
    // In production: POST to a sandboxed code runner service
    setRunOutput(language === 'python'
      ? `$ python3 session.py\nFetching results...\n✅ Execution complete (0.12s)`
      : `$ node session.js\n> Running...\n✅ No errors (87ms)`
    )
    setIsRunning(false)
  }

  const copyInvite = () => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${session.invite_token}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const s = {
    root: { display: 'flex', height: '100%', flexDirection: 'column' as const, overflow: 'hidden' },
    topbar: { padding: '10px 20px', borderBottom: '1px solid #2a2a3a', display: 'flex', alignItems: 'center', gap: 12, background: '#12121a', flexShrink: 0 },
    tabs: { display: 'flex', borderBottom: '1px solid #2a2a3a', background: '#12121a', flexShrink: 0 },
    tab: (active: boolean) => ({ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', border: 'none', borderBottom: `2px solid ${active ? '#7c6fff' : 'transparent'}`, background: 'transparent', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13, color: active ? '#7c6fff' : '#8888aa', transition: 'all 0.15s' }),
    body: { flex: 1, display: 'flex', overflow: 'hidden' },
    main: { flex: 1, display: 'flex', flexDirection: 'column' as const, padding: 16, gap: 12, overflow: 'hidden', background: '#0a0a0f' },
    sidebar: { width: 300, borderLeft: '1px solid #2a2a3a', flexShrink: 0, display: 'flex', flexDirection: 'column' as const },
    toolbar: { display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 },
  }

  return (
    <div style={s.root}>
      {/* Top bar */}
      <div style={s.topbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#4fffb0' : '#ff5f7e', boxShadow: `0 0 6px ${connected ? '#4fffb0' : '#ff5f7e'}` }} />
          <span style={{ fontWeight: 800, fontSize: 15, fontFamily: 'Syne, sans-serif', color: '#e8e8f0' }}>{session.title}</span>
          <span style={{ fontSize: 11, color: '#8888aa', fontFamily: 'Space Mono, monospace' }}>· {session.duration_minutes}min</span>
        </div>

        {/* Participants — keyed by user_id to prevent wrong reconciliation */}
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          {participants.map((p) => (
            <div key={p.user_id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: '#0a0a0f', borderRadius: 20, border: '1px solid #2a2a3a' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: p.role === 'mentor' ? '#7c6fff' : '#4fffb0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#000' }}>
                {p.user_name[0]}
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'Syne, sans-serif', color: '#e8e8f0' }}>{p.user_name.split(' ')[0]}</span>
            </div>
          ))}
        </div>

        {/* Language */}
        <select value={language} onChange={e => handleLanguageChange(e.target.value as Language)} style={{ background: '#0a0a0f', border: '1px solid #2a2a3a', color: '#e8e8f0', padding: '6px 10px', borderRadius: 8, fontFamily: 'Space Mono, monospace', fontSize: 12, cursor: 'pointer', outline: 'none' }}>
          {(['javascript', 'typescript', 'python', 'go', 'rust'] as Language[]).map(l => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>

        <button onClick={copyInvite} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#0a0a0f', border: '1px solid #2a2a3a', borderRadius: 8, cursor: 'pointer', color: copied ? '#4fffb0' : '#8888aa', fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700, transition: 'all 0.2s' }}>
          {copied ? '✓ Copied!' : '🔗 Invite'}
        </button>

        {currentUser.role === 'mentor' && (
          <button onClick={onEnd} style={{ padding: '6px 14px', background: 'rgba(255,95,126,0.1)', border: '1px solid rgba(255,95,126,0.25)', borderRadius: 8, cursor: 'pointer', color: '#ff5f7e', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 12 }}>
            End Session
          </button>
        )}
      </div>

      {/* Panel tabs */}
      <div style={s.tabs}>
        <button style={s.tab(activePanel === 'editor')} onClick={() => setActivePanel('editor')}>💻 Code Editor</button>
        <button style={s.tab(activePanel === 'video')} onClick={() => setActivePanel('video')}>📹 Video Call</button>
      </div>

      <div style={s.body}>
        <div style={s.main}>
          {activePanel === 'editor' && (
            <>
              <div style={{ flex: 1, minHeight: 0 }}>
                <CodeEditor
                  code={code}
                  language={language}
                  onChange={handleCodeChange}
                  remoteTyping={remoteTyping}
                  remoteUserName={remoteUserName}
                />
              </div>
              <div style={s.toolbar}>
                <button onClick={handleRun} disabled={isRunning} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', background: isRunning ? '#12121a' : 'rgba(79,255,176,0.1)', border: `1px solid ${isRunning ? '#2a2a3a' : 'rgba(79,255,176,0.25)'}`, borderRadius: 8, cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13, color: isRunning ? '#8888aa' : '#4fffb0', transition: 'all 0.2s' }}>
                  {isRunning ? '⏳ Running...' : '▶ Run Code'}
                </button>
                <button style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', background: 'transparent', border: '1px solid #2a2a3a', borderRadius: 8, cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13, color: '#8888aa' }}>
                  💾 Save Snapshot
                </button>
                {runOutput && (
                  <div style={{ flex: 1, padding: '8px 14px', background: '#0a0f0a', border: '1px solid rgba(79,255,176,0.2)', borderRadius: 8, fontFamily: 'Space Mono, monospace', fontSize: 12, color: '#4fffb0', whiteSpace: 'pre' }}>
                    {runOutput}
                  </div>
                )}
              </div>
            </>
          )}

          {activePanel === 'video' && (
            <div style={{ flex: 1, minHeight: 0 }}>
              <VideoCall
                currentUser={currentUser}
                participants={participants}
                onRTCSignal={sendRTCSignal}
                incomingSignal={incomingRTCSignal}
              />
            </div>
          )}
        </div>

        {/* Chat sidebar */}
        <div style={s.sidebar}>
          <ChatPanel
            messages={sessionMessages}
            onSend={handleSendChat}
            currentUserId={currentUser.id}
          />
        </div>
      </div>
    </div>
    
  )
}
