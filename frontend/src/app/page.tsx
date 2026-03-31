'use client'

import { useState, useEffect } from 'react'
import { useAuthStore, useSessionStore } from '@/store'
import { sessionsApi, authApi } from '@/lib/api'
import { SessionRoom } from '@/components/session/SessionRoom'
import type { Session } from '@/types'

// ─── AUTH SCREEN (RESTORED CSS) ──────────────────────────────────────────────
function AuthScreen() {
  const { setAuth } = useAuthStore()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [role, setRole] = useState<'student' | 'mentor'>('student')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!email || !password || (mode === 'register' && !name)) { 
      setError('Please fill all fields'); 
      return 
    }
    setLoading(true); setError('')
    try {
      const res = mode === 'login'
        ? await authApi.login({ email, password })
        : await authApi.register({ email, password, full_name: name, role })
      setAuth(res.user, res.token)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f1a' }}>
      <div style={{ width: 420, background: '#1a1a2e', border: '1px solid #2a2a3a', borderRadius: 16, padding: 32, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h2 style={{ color: '#fff', fontSize: 28, fontWeight: 800, fontFamily: 'Syne' }}>MentorSpace</h2>
            <p style={{ color: '#888', fontSize: 14 }}>{mode === 'login' ? 'Welcome back' : 'Create your account'}</p>
        </div>

        <div style={{ display: 'flex', background: '#0f0f1a', borderRadius: 8, padding: 3, marginBottom: 24, border: '1px solid #2a2a3a' }}>
          <button onClick={() => setMode('login')} style={{ flex: 1, padding: 10, background: mode === 'login' ? '#7c6fff' : 'transparent', border: 'none', color: '#fff', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Sign In</button>
          <button onClick={() => setMode('register')} style={{ flex: 1, padding: 10, background: mode === 'register' ? '#7c6fff' : 'transparent', border: 'none', color: '#fff', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Sign Up</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'register' && (
            <input className="input-field" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} />
          )}
          <input className="input-field" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input className="input-field" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
          
          {mode === 'register' && (
             <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setRole('student')} style={{ flex: 1, padding: 12, background: role === 'student' ? 'rgba(124,111,255,0.2)' : 'transparent', border: role === 'student' ? '1px solid #7c6fff' : '1px solid #333', color: '#fff', borderRadius: 10, cursor: 'pointer' }}>Student</button>
                <button onClick={() => setRole('mentor')} style={{ flex: 1, padding: 12, background: role === 'mentor' ? 'rgba(124,111,255,0.2)' : 'transparent', border: role === 'mentor' ? '1px solid #7c6fff' : '1px solid #333', color: '#fff', borderRadius: 10, cursor: 'pointer' }}>Mentor</button>
             </div>
          )}

          {error && <p style={{ color: '#ff5f7e', fontSize: 13, textAlign: 'center' }}>{error}</p>}
          <button onClick={handleSubmit} disabled={loading} style={{ padding: 14, background: '#7c6fff', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 16 }}>
            {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── DASHBOARD VIEW (RESTORED CSS) ───────────────────────────────────────────
function DashboardView({ sessions, user, onOpen }: { sessions: Session[], user: any, onOpen: (s: Session) => void }) {
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState("")
  const [lang, setLang] = useState("javascript")
  const { addSession } = useSessionStore()

  const handleCreate = async () => {
    if (!title) return;
    try {
      const newSession = await sessionsApi.create({
        title,
        language: lang,
        scheduled_at: new Date().toISOString(),
        mentor_id: user.id,
        student_id: user.id, 
        status: 'scheduled'
      });
      addSession(newSession);
      setShowCreate(false);
      setTitle("");
    } catch (error) {
      console.error("Failed to create session", error);
    }
  }

  return (
    <div style={{ padding: 32, overflowY: 'auto', height: '100%' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8, fontFamily: 'Syne' }}>
          Welcome back, <span style={{ background: 'linear-gradient(135deg, #fff 0%, #7c6fff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{user.full_name}</span>
        </h1>
        <p style={{ color: '#888', fontSize: 16 }}>Manage your upcoming sessions</p>
      </div>

      {showCreate && (
        <div style={{ background: 'var(--surface)', border: '1px solid #7c6fff', borderRadius: 12, padding: 24, marginBottom: 32 }}>
          <h3 style={{ color: '#fff', marginBottom: 20 }}>Schedule New Session</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input className="input-field" placeholder="Session Title" value={title} onChange={e => setTitle(e.target.value)} />
            <select className="input-field" value={lang} onChange={e => setLang(e.target.value)} style={{ background: '#0f0f1a', color: '#fff' }}>
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="typescript">TypeScript</option>
            </select>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={handleCreate} style={{ flex: 1, padding: 12, background: '#7c6fff', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700 }}>Save Session</button>
              <button onClick={() => setShowCreate(false)} style={{ flex: 1, padding: 12, background: 'transparent', border: '1px solid #333', borderRadius: 8, color: '#888' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
        {sessions.map(s => (
          <div key={s.id} onClick={() => onOpen(s)} className="session-card" style={{ background: '#1a1a2e', border: '1px solid #2a2a3a', borderRadius: 16, padding: 24, cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 11, padding: '4px 12px', background: 'rgba(124,111,255,0.1)', color: '#7c6fff', borderRadius: 20, fontWeight: 700 }}>{s.language.toUpperCase()}</span>
              <span style={{ fontSize: 12, color: '#555' }}>{new Date(s.scheduled_at).toLocaleDateString()}</span>
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{s.title}</h3>
            <p style={{ fontSize: 14, color: '#888' }}>Status: <span style={{ color: '#7c6fff' }}>{s.status}</span></p>
          </div>
        ))}
      </div>

      {user.role === 'mentor' && !showCreate && (
        <button onClick={() => setShowCreate(true)} style={{ width: '100%', marginTop: 32, padding: 18, background: '#7c6fff', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: 16, boxShadow: '0 4px 14px 0 rgba(124,111,255,0.39)' }}>
          + Schedule New Session
        </button>
      )}
    </div>
  )
}

// ─── APP SHELL (RESTORED CSS) ────────────────────────────────────────────────
function AppShell() {
  const { user, clearAuth } = useAuthStore()
  const { sessions, activeSession, setSessions, setActiveSession } = useSessionStore()
  const [view, setView] = useState<'dashboard' | 'room'>('dashboard')

  useEffect(() => {
    sessionsApi.getMy().then(setSessions).catch(() => {})
  }, [setSessions])

  if (!user) return null

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0f0f1a', fontFamily: 'Syne, sans-serif' }}>
      <div style={{ width: 260, borderRight: '1px solid #2a2a3a', padding: 32, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ color: '#fff', fontSize: 22, fontWeight: 800, marginBottom: 40 }}>MentorSpace</h3>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button onClick={() => setView('dashboard')} style={{ padding: 12, textAlign: 'left', background: view === 'dashboard' ? 'rgba(124,111,255,0.1)' : 'transparent', color: view === 'dashboard' ? '#7c6fff' : '#888', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Dashboard</button>
          <button onClick={() => setView('room')} style={{ padding: 12, textAlign: 'left', background: view === 'room' ? 'rgba(124,111,255,0.1)' : 'transparent', color: view === 'room' ? '#7c6fff' : '#888', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Live Room</button>
        </nav>
        <button onClick={clearAuth} style={{ marginTop: 'auto', padding: 12, textAlign: 'left', background: 'transparent', color: '#ff5f7e', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Sign Out</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', background: '#09090b' }}>
        {view === 'dashboard' ? (
          <DashboardView sessions={sessions} user={user} onOpen={(s) => { setActiveSession(s); setView('room') }} />
        ) : (
          activeSession ? <SessionRoom session={activeSession} currentUser={user} onEnd={() => setView('dashboard')} /> : <div style={{ padding: 60, color: '#444', textAlign: 'center' }}>No active session selected.</div>
        )}
      </div>
    </div>
  )
}

export default function Home() {
  const { user } = useAuthStore()
  return user ? <AppShell /> : <AuthScreen />
}