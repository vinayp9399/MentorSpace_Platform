'use client'

import { useRef, useEffect, useState, KeyboardEvent, useMemo } from 'react'
import type { Message } from '@/types'
import { formatDistanceToNow } from 'date-fns'

interface ChatPanelProps {
  messages: Message[]
  onSend: (message: string) => void
  currentUserId: string
}

export function ChatPanel({ messages, onSend, currentUserId }: ChatPanelProps) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // FIX: Deduplicate messages by ID to prevent UI glitches if the data source provides duplicates
  const uniqueMessages = useMemo(() => {
    const seen = new Set();
    return messages.filter(msg => {
      const duplicate = seen.has(msg.id);
      seen.add(msg.id);
      return !duplicate;
    });
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [uniqueMessages]) // Use uniqueMessages here

  const handleSend = () => {
    if (!input.trim()) return
    onSend(input.trim())
    setInput('')
  }

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const isSelf = (msg: Message) => msg.sender_id === currentUserId || msg.is_self

  const s = {
    wrapper: { display: 'flex', flexDirection: 'column' as const, height: '100%', background: '#12121a' },
    header: { padding: '14px 16px', borderBottom: '1px solid #2a2a3a', display: 'flex', alignItems: 'center', gap: 8 },
    messages: { flex: 1, overflowY: 'auto' as const, padding: '12px 14px', display: 'flex', flexDirection: 'column' as const, gap: 10 },
    inputRow: { padding: '12px', borderTop: '1px solid #2a2a3a', display: 'flex', gap: 8 },
    input: { flex: 1, background: '#0a0a0f', border: '1px solid #2a2a3a', color: '#e8e8f0', padding: '9px 12px', borderRadius: 8, fontFamily: 'Syne, sans-serif', fontSize: 13, outline: 'none' },
    sendBtn: { width: 38, height: 38, borderRadius: 8, background: '#7c6fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  }

  return (
    <div style={s.wrapper}>
      <div style={s.header}>
        <span style={{ fontSize: 15 }}>💬</span>
        <span style={{ fontWeight: 800, fontSize: 14, fontFamily: 'Syne, sans-serif', color: '#e8e8f0' }}>Session Chat</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#8888aa', fontFamily: 'Space Mono, monospace' }}>{uniqueMessages.length} msgs</span>
      </div>

      <div style={s.messages}>
        {uniqueMessages.map((msg) => { // Render deduplicated list
          const self = isSelf(msg)
          if (msg.message_type === 'system') {
            return (
              <div key={msg.id} style={{ textAlign: 'center', padding: '4px 0' }}>
                <span style={{ fontSize: 11, color: '#44445a', fontFamily: 'Space Mono, monospace', padding: '3px 10px', background: '#1a1a26', borderRadius: 20 }}>{msg.content}</span>
              </div>
            )
          }
          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: self ? 'flex-end' : 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'Syne, sans-serif', color: msg.role === 'mentor' ? '#7c6fff' : '#4fffb0' }}>
                  {self ? 'You' : (msg.sender_name?.split(' ')[0] || 'User')}
                </span>
                <span style={{ fontSize: 10, color: '#44445a', fontFamily: 'Space Mono, monospace' }}>
                  {/* {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })} */}
                </span>
              </div>
              <div style={{
                maxWidth: '85%', padding: '8px 12px',
                background: self ? 'rgba(124,111,255,0.12)' : '#0a0a0f',
                border: `1px solid ${self ? 'rgba(124,111,255,0.25)' : '#2a2a3a'}`,
                borderRadius: self ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                fontSize: 13, fontFamily: 'Syne, sans-serif', color: '#e8e8f0', lineHeight: 1.5, wordBreak: 'break-word' as const,
              }}>
                {msg.message_type === 'code'
                  ? <code style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, color: '#4fffb0' }}>{msg.content}</code>
                  : msg.content}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div style={s.inputRow}>
        <input
          style={s.input}
          placeholder="Type a message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
        />
        <button style={s.sendBtn} onClick={handleSend}>
          <svg width="15" height="15" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  )
}