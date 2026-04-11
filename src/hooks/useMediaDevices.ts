import { useRef, useState, useCallback, useEffect } from 'react'

interface UseMediaDevicesReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>
  isActive: boolean
  error: string | null
  start: () => Promise<void>
  stop: () => void
  captureFrame: () => string | null
  getAudioStream: () => MediaStream | null
}

export function useMediaDevices(): UseMediaDevicesReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsActive(false)
  }, [])

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return null

    ctx.drawImage(videoRef.current, 0, 0, 640, 480)
    // Return base64 without the data URL prefix
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.6)
    return dataUrl.split(',')[1] ?? null
  }, [])

  const getAudioStream = useCallback((): MediaStream | null => {
    return streamRef.current
  }, [])

  useEffect(() => {
    return () => { stop() }
  }, [stop])

  return { videoRef, isActive, error, start, stop, captureFrame, getAudioStream }
}
