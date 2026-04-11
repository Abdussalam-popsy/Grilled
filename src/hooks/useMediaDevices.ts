import { useRef, useState, useCallback, useEffect } from 'react'

interface UseMediaDevicesReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>
  screenVideoRef: React.RefObject<HTMLVideoElement | null>
  isActive: boolean
  error: string | null
  isScreenSharing: boolean
  screenStream: MediaStream | null
  start: () => Promise<void>
  stop: () => void
  captureFrame: () => string | null
  getAudioStream: () => MediaStream | null
  startScreenShare: () => Promise<void>
  stopScreenShare: () => void
}

export function useMediaDevices(): UseMediaDevicesReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const screenVideoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const screenCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas')
        canvasRef.current.width = 640
        canvasRef.current.height = 480
      }

      setIsActive(true)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to access camera/microphone')
    }
  }, [])

  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop())
      screenStreamRef.current = null
    }
    setScreenStream(null)
    setIsScreenSharing(false)
  }, [])

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: 1280, height: 720 },
      })

      screenStreamRef.current = stream
      setScreenStream(stream)
      setIsScreenSharing(true)

      if (!screenCanvasRef.current) {
        screenCanvasRef.current = document.createElement('canvas')
        screenCanvasRef.current.width = 1280
        screenCanvasRef.current.height = 720
      }

      // Listen for browser's native "Stop sharing" button
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        stopScreenShare()
      })
    } catch (err) {
      // User cancelled the picker — not an error
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message)
      }
    }
  }, [stopScreenShare])

  const stop = useCallback(() => {
    stopScreenShare()
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsActive(false)
  }, [stopScreenShare])

  const captureFrame = useCallback((): string | null => {
    // When screen sharing, capture from screen video element
    if (isScreenSharing && screenVideoRef.current && screenCanvasRef.current) {
      const ctx = screenCanvasRef.current.getContext('2d')
      if (!ctx) return null
      ctx.drawImage(screenVideoRef.current, 0, 0, 1280, 720)
      const dataUrl = screenCanvasRef.current.toDataURL('image/jpeg', 0.6)
      return dataUrl.split(',')[1] ?? null
    }

    // Default: capture from camera
    if (!videoRef.current || !canvasRef.current) return null
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return null

    ctx.drawImage(videoRef.current, 0, 0, 640, 480)
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.6)
    return dataUrl.split(',')[1] ?? null
  }, [isScreenSharing])

  const getAudioStream = useCallback((): MediaStream | null => {
    return streamRef.current
  }, [])

  useEffect(() => {
    return () => { stop() }
  }, [stop])

  return {
    videoRef,
    screenVideoRef,
    isActive,
    error,
    isScreenSharing,
    screenStream,
    start,
    stop,
    captureFrame,
    getAudioStream,
    startScreenShare,
    stopScreenShare,
  }
}
