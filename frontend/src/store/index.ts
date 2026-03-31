import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Session, Message } from '@/types'

// ─── AUTH STORE ───────────────────────────────────────────────────────────────
interface AuthStore {
  user: User | null
  token: string | null
  setAuth: (user: User, token: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        localStorage.setItem('ms_token', token)
        set({ user, token })
      },
      clearAuth: () => {
        localStorage.removeItem('ms_token')
        set({ user: null, token: null })
      },
    }),
    { name: 'ms_auth', partialize: (s) => ({ user: s.user, token: s.token }) }
  )
)

// ─── SESSION STORE ────────────────────────────────────────────────────────────
interface SessionStore {
  sessions: Session[]
  activeSession: Session | null
  setSessions: (sessions: Session[]) => void
  addSession: (session: Session) => void
  updateSession: (session: Session) => void
  setActiveSession: (session: Session | null) => void
}

export const useSessionStore = create<SessionStore>((set) => ({
  sessions: [],
  activeSession: null,
  setSessions: (sessions) => set({ sessions }),
  addSession: (session) => set((s) => ({ sessions: [session, ...s.sessions] })),
  updateSession: (session) =>
    set((s) => ({ sessions: s.sessions.map((x) => (x.id === session.id ? session : x)) })),
  setActiveSession: (activeSession) => set({ activeSession }),
}))

// ─── CHAT STORE ───────────────────────────────────────────────────────────────
interface ChatStore {
  messages: Record<string, Message[]>  // keyed by session_id
  addMessage: (sessionId: string, msg: Message) => void
  setMessages: (sessionId: string, msgs: Message[]) => void
  clearMessages: (sessionId: string) => void
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: {},
  addMessage: (sessionId, msg) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [sessionId]: [...(s.messages[sessionId] || []), msg],
      },
    })),
  setMessages: (sessionId, msgs) =>
    set((s) => ({ messages: { ...s.messages, [sessionId]: msgs } })),
  clearMessages: (sessionId) =>
    set((s) => {
      const next = { ...s.messages }
      delete next[sessionId]
      return { messages: next }
    }),
}))
