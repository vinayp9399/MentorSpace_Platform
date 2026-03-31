'use client'

import { useRef, useEffect } from 'react'
import { useWebRTC } from '@/hooks/useWebRTC'
import type { WSMessage, User, Participant } from '@/types'

interface VideoCallProps {
  currentUser: User
  participants: Participant[]
  onRTCSignal: (signal: WSMessage) => void
  incomingSignal: WSMessage | null
}

export function VideoCall({ currentUser, participants, onRTCSignal, incomingSignal }: VideoCallProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)

  const remoteParticipant = participants.find(p => p.user_id !== currentUser.id)

  const {
    startCall, handleRTCSignal, toggleMute, toggleCamera, toggleScreenShare,
    isMuted, isCameraOff, isConnected, isScreenSharing,
  } = useWebRTC({
    localVideoRef,
    remoteVideoRef,
    onSignal: onRTCSignal,
    targetUserId: remoteParticipant?.user_id || '',
    currentUserId: currentUser.id,
  })

  useEffect(() => {
    if (incomingSignal) handleRTCSignal(incomingSignal)
  }, [incomingSignal, handleRTCSignal])

  const s = {
    wrapper: { height: '100%', display: 'flex', flexDirection: 'column' as const, gap: 16, padding: 20, background: '#0a0a0f' },
    videos: { flex: 1, display: 'flex', gap: 16, minHeight: 0 },
    remoteVideo: { flex: 2, borderRadius: 12, overflow: 'hidden', position: 'relative' as const, background: '#080810', border: '1px solid #2a2a3a', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    localVideo: { flex: 1, borderRadius: 12, overflow: 'hidden', position: 'relative' as const, background: '#080810', border: '1px solid #2a2a3a', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    videoEl: { width: '100%', height: '100%', objectFit: 'cover' as const },
    avatar: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 10 },
    avatarCircle: (color: string) => ({ width: 64, height: 64, borderRadius: '50%', background: `${color}30`, border: `2px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color, fontFamily: 'Syne, sans-serif' }),
    label: { position: 'absolute' as const, bottom: 10, left: 12, padding: '4px 10px', background: 'rgba(0,0,0,0.6)', borderRadius: 6, fontSize: 12, fontWeight: 700, fontFamily: 'Syne, sans-serif', color: '#e8e8f0' },
    controls: { display: 'flex', justifyContent: 'center', gap: 12 },
    ctrlBtn: (active: boolean, danger = false) => ({
      display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 6,
      padding: '12px 20px', borderRadius: 12, cursor: 'pointer',
      background: danger && active ? 'rgba(255,95,126,0.15)' : active ? 'rgba(255,95,126,0.15)' : '#12121a',
      border: `1px solid ${danger && active ? 'rgba(255,95,126,0.3)' : active ? 'rgba(255,95,126,0.3)' : '#2a2a3a'}`,
      color: active ? '#ff5f7e' : '#8888aa', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 11,
      transition: 'all 0.2s',
    }),
    connectBadge: { position: 'absolute' as const, top: 10, right: 10, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: isConnected ? 'rgba(79,255,176,0.15)' : 'rgba(255,209,102,0.15)', color: isConnected ? '#4fffb0' : '#ffd166', border: `1px solid ${isConnected ? 'rgba(79,255,176,0.3)' : 'rgba(255,209,102,0.3)'}` },
  }

  return (
    <div style={s.wrapper}>
      <div style={s.videos}>
        {/* Remote */}
        <div style={s.remoteVideo}>
          <video ref={remoteVideoRef} autoPlay playsInline style={s.videoEl} />
          {!isConnected && (
            <div style={s.avatar}>
              <div style={s.avatarCircle('#7c6fff')}>
                {remoteParticipant ? remoteParticipant.user_name[0] : '?'}
              </div>
              <p style={{ color: '#8888aa', fontSize: 14, fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>
                {remoteParticipant?.user_name || 'Waiting for participant...'}
              </p>
              <button onClick={startCall} style={{ padding: '8px 20px', background: 'rgba(124,111,255,0.15)', border: '1px solid rgba(124,111,255,0.3)', borderRadius: 8, color: '#7c6fff', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13 }}>
                📹 Start Call
              </button>
            </div>
          )}
          <div style={s.connectBadge}>{isConnected ? '● Connected' : '○ Not connected'}</div>
          {remoteParticipant && <div style={s.label}>{remoteParticipant.user_name}</div>}
        </div>

        {/* Local */}
        <div style={s.localVideo}>
          <video ref={localVideoRef} autoPlay playsInline muted style={s.videoEl} />
          {isCameraOff && (
            <div style={s.avatar}>
              <div style={s.avatarCircle('#4fffb0')}>{currentUser.full_name[0]}</div>
              <p style={{ color: '#8888aa', fontSize: 12, fontFamily: 'Syne, sans-serif' }}>Camera off</p>
            </div>
          )}
          <div style={s.label}>You</div>
        </div>
      </div>

      {/* Controls */}
      <div style={s.controls}>
        <button style={s.ctrlBtn(isMuted, true)} onClick={toggleMute}>
          <span style={{ fontSize: 20 }}>{isMuted ? '🔇' : '🎤'}</span>
          {isMuted ? 'Unmute' : 'Mute'}
        </button>
        <button style={s.ctrlBtn(isCameraOff, true)} onClick={toggleCamera}>
          <span style={{ fontSize: 20 }}>{isCameraOff ? '📷' : '📸'}</span>
          {isCameraOff ? 'Cam On' : 'Cam Off'}
        </button>
        <button style={s.ctrlBtn(isScreenSharing)} onClick={toggleScreenShare}>
          <span style={{ fontSize: 20 }}>🖥️</span>
          {isScreenSharing ? 'Stop Share' : 'Share Screen'}
        </button>
      </div>
    </div>
  )
}
