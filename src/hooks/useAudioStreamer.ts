import { useRef, useCallback } from 'react'

// Captures audio from MediaStream and calls back with base64 PCM chunks
export function useAudioStreamer() {
  const workletRef = useRef<AudioWorkletNode | null>(null)
  const contextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)

  const start = useCallback(async (
    stream: MediaStream,
    onAudioChunk: (base64: string) => void
  ) => {
    const audioCtx = new AudioContext({ sampleRate: 16000 })
    contextRef.current = audioCtx

    // Use ScriptProcessor as fallback (simpler, works everywhere)
    const source = audioCtx.createMediaStreamSource(stream)
    sourceRef.current = source

    // Use a ScriptProcessorNode for capturing audio
    // (AudioWorklet would be cleaner but ScriptProcessor is simpler for a hackathon)
    const processor = audioCtx.createScriptProcessor(4096, 1, 1)
    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0)
      // Convert Float32 to Int16 PCM
      const pcm16 = new Int16Array(inputData.length)
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]))
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
      }

      // Convert to base64
      const bytes = new Uint8Array(pcm16.buffer)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      onAudioChunk(btoa(binary))
    }

    source.connect(processor)
    processor.connect(audioCtx.destination)

    // Store for cleanup
    workletRef.current = processor as unknown as AudioWorkletNode
  }, [])

  const stop = useCallback(() => {
    workletRef.current?.disconnect()
    sourceRef.current?.disconnect()
    contextRef.current?.close()
    workletRef.current = null
    sourceRef.current = null
    contextRef.current = null
  }, [])

  return { start, stop }
}
