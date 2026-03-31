'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import type { WSMessage } from '@/types'

interface UseWebRTCOptions {
  localVideoRef: React.RefObject<HTMLVideoElement>
  remoteVideoRef: React.RefObject<HTMLVideoElement>
  onSignal: (signal: WSMessage) => void
  targetUserId: string
  currentUserId: string
}

export function useWebRTC({
  localVideoRef,
  remoteVideoRef,
  onSignal,
  targetUserId,
  currentUserId,
}: UseWebRTCOptions) {
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)

  const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]

  const createPC = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        onSignal({ type: 'ice_candidate', candidate: JSON.stringify(e.candidate), target_id: targetUserId })
      }
    }

    pc.ontrack = (e) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = e.streams[0]
      }
    }

    pc.onconnectionstatechange = () => {
      setIsConnected(pc.connectionState === 'connected')
    }

    return pc
  }, [targetUserId, onSignal])

  const startLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      localStreamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream
      return stream
    } catch (err) {
      console.error('Media error:', err)
      return null
    }
  }, [])

  const startCall = useCallback(async () => {
    const stream = await startLocalStream()
    if (!stream) return

    const pc = createPC()
    pcRef.current = pc
    stream.getTracks().forEach(track => pc.addTrack(track, stream))

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    onSignal({ type: 'offer', sdp: JSON.stringify(offer), target_id: targetUserId })
  }, [createPC, startLocalStream, onSignal, targetUserId])

  const handleRTCSignal = useCallback(async (signal: WSMessage) => {
    if (signal.type === 'offer') {
      const stream = await startLocalStream()
      const pc = createPC()
      pcRef.current = pc
      stream?.getTracks().forEach(track => pc.addTrack(track, stream!))

      await pc.setRemoteDescription(JSON.parse(signal.sdp as string))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      onSignal({ type: 'answer', sdp: JSON.stringify(answer), target_id: signal.from_id as string })
    } else if (signal.type === 'answer' && pcRef.current) {
      await pcRef.current.setRemoteDescription(JSON.parse(signal.sdp as string))
    } else if (signal.type === 'ice_candidate' && pcRef.current) {
      await pcRef.current.addIceCandidate(JSON.parse(signal.candidate as string))
    }
  }, [createPC, startLocalStream, onSignal])

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = isMuted })
      setIsMuted(v => !v)
    }
  }, [isMuted])

  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = isCameraOff })
      setIsCameraOff(v => !v)
    }
  }, [isCameraOff])

  const toggleScreenShare = useCallback(async () => {
    if (!pcRef.current || !localStreamRef.current) return
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        const screenTrack = screenStream.getVideoTracks()[0]
        const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video')
        sender?.replaceTrack(screenTrack)
        if (localVideoRef.current) localVideoRef.current.srcObject = screenStream
        screenTrack.onended = () => toggleScreenShare()
        setIsScreenSharing(true)
      } catch (_) {}
    } else {
      const camTrack = localStreamRef.current.getVideoTracks()[0]
      const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video')
      sender?.replaceTrack(camTrack)
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current
      setIsScreenSharing(false)
    }
  }, [isScreenSharing])

  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop())
      pcRef.current?.close()
    }
  }, [])

  return {
    startCall,
    handleRTCSignal,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    isMuted,
    isCameraOff,
    isConnected,
    isScreenSharing,
  }
}
