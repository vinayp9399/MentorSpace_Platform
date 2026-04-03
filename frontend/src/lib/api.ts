import axios from 'axios'
import type { User, Session, Message, CreateSessionPayload } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://mentor-space-platformbackend.vercel.app'

const api = axios.create({ baseURL: API_URL })

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('ms_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; password: string; full_name: string; role: string; bio?: string }) =>
    api.post<{ token: string; user: User }>('/api/auth/register', data).then(r => r.data),

  login: (data: { email: string; password: string }) =>
    api.post<{ token: string; user: User }>('/api/auth/login', data).then(r => r.data),

  me: () =>
    api.get<User>('/api/auth/me').then(r => r.data),
}

// ─── SESSIONS ─────────────────────────────────────────────────────────────────
export const sessionsApi = {
  create: (data: CreateSessionPayload) =>
    api.post<Session>('/api/sessions/create', data).then(r => r.data),

  join: (invite_token: string) =>
    api.post<Session>('/api/sessions/join', { invite_token }).then(r => r.data),

  end: (session_id: string) =>
    api.post<Session>(`/api/sessions/${session_id}/end`).then(r => r.data),

  getMy: () =>
    api.get<Session[]>('/api/sessions/my').then(r => r.data),

  getById: (id: string) =>
    api.get<Session>(`/api/sessions/${id}`).then(r => r.data),

  getByToken: (token: string) =>
    api.get<Session>(`/api/sessions/by-token/${token}`).then(r => r.data),
}

// ─── MESSAGES ─────────────────────────────────────────────────────────────────
export const messagesApi = {
  getForSession: (session_id: string) =>
    api.get<Message[]>(`/api/messages/${session_id}`).then(r => r.data),

  save: (data: { session_id: string; content: string; message_type?: string }) =>
    api.post('/api/messages/save', data).then(r => r.data),
}

export default api
