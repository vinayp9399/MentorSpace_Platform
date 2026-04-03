export type UserRole = 'mentor' | 'student'
export type SessionStatus = 'scheduled' | 'active' | 'ended'
export type Language = 'javascript' | 'typescript' | 'python' | 'go' | 'rust'
export type MessageType = 'chat' | 'code' | 'system'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  bio?: string
  avatar_url?: string
}

export interface Session {
  id: string
  title: string
  mentor_id: string
  student_id?: string
  status: SessionStatus
  scheduled_at: string
  duration_minutes: string
  language: Language
  initial_code: string
  invite_token: string
  created_at: string
  started_at?: string
  ended_at?: string
  mentor?: Pick<User, 'id' | 'full_name' | 'email'>
  student?: Pick<User, 'id' | 'full_name' | 'email'>
}

export interface CreateSessionPayload {
  title: string
  scheduled_at: string
  duration_minutes: string
  language: Language
  initial_code?: string
}

export interface Message {
  id: string
  session_id: string
  sender_id?: string
  sender_name: string
  content: string
  message_type: MessageType
  timestamp: string
  is_self?: boolean
  role?: UserRole  // used by ChatPanel to colour mentor vs student name
}

export interface Participant {
  user_id: string
  user_name: string
  role: UserRole
}

export type WSMessageType =
  | 'code_update' | 'chat' | 'system' | 'language_change'
  | 'participants' | 'offer' | 'answer' | 'ice_candidate' | 'ping' | 'pong'

export interface WSMessage {
  type: WSMessageType
  [key: string]: unknown
}