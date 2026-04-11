import { getSystemInstruction } from './prompts'
import type { Mode } from '../types'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

// Gemini Live API WebSocket connection
// Docs: https://ai.google.dev/gemini-api/docs/live

export interface GeminiLiveCallbacks {
  onAudioOutput?: (audioData: string) => void   // base64 PCM audio
  onTextOutput?: (text: string) => void
  onInterrupted?: () => void
  onError?: (error: string) => void
  onClose?: () => void
  onReady?: () => void
}

export class GeminiLiveSession {
  private ws: WebSocket | null = null
  private callbacks: GeminiLiveCallbacks
  private isSetupComplete = false

  constructor(callbacks: GeminiLiveCallbacks) {
    this.callbacks = callbacks
  }

  connect(mode: Mode, goal: string, resourceContext: string): void {
    const model = 'gemini-2.5-flash-native-audio-preview-12-2025'
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${GEMINI_API_KEY}`

    this.ws = new WebSocket(wsUrl)

    this.ws.onopen = () => {
      const setupMessage = {
        setup: {
          model: `models/${model}`,
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: 'Aoede'
                }
              }
            }
          },
          systemInstruction: {
            parts: [{ text: getSystemInstruction(mode, goal, resourceContext) }]
          },
          tools: [{ googleSearch: {} }]
        }
      }
      this.ws?.send(JSON.stringify(setupMessage))
    }

    this.ws.onmessage = async (event) => {
      try {
        const raw = event.data instanceof Blob ? await event.data.text() : event.data
        const data = JSON.parse(raw)
        this.handleMessage(data)
      } catch (e) {
        console.error('Failed to parse Gemini message:', e)
      }
    }

    this.ws.onerror = () => {
      this.callbacks.onError?.('WebSocket connection error')
    }

    this.ws.onclose = (event) => {
      if (!this.isSetupComplete) {
        this.callbacks.onError?.(`Connection closed before setup completed (code: ${event.code})`)
      }
      this.callbacks.onClose?.()
    }
  }

  private handleMessage(data: Record<string, unknown>): void {
    if ('setupComplete' in data) {
      this.isSetupComplete = true
      this.callbacks.onReady?.()
      return
    }

    if ('error' in data) {
      const err = data.error as Record<string, unknown>
      this.callbacks.onError?.(err.message as string ?? 'Unknown server error')
      return
    }

    const serverContent = data.serverContent as Record<string, unknown> | undefined
    if (serverContent) {
      if (serverContent.interrupted) {
        this.callbacks.onInterrupted?.()
        return
      }

      const parts = (serverContent.modelTurn as Record<string, unknown>)?.parts as Array<Record<string, unknown>> | undefined
      if (parts) {
        for (const part of parts) {
          if (part.text) {
            this.callbacks.onTextOutput?.(part.text as string)
          }
          const inlineData = part.inlineData as Record<string, string> | undefined
          if (inlineData?.mimeType?.startsWith('audio/')) {
            this.callbacks.onAudioOutput?.(inlineData.data)
          }
        }
      }
    }
  }

  sendAudio(base64Audio: string): void {
    if (!this.ws || !this.isSetupComplete) return
    this.ws.send(JSON.stringify({
      realtimeInput: {
        mediaChunks: [{
          mimeType: 'audio/pcm;rate=16000',
          data: base64Audio
        }]
      }
    }))
  }

  sendVideoFrame(base64Image: string): void {
    if (!this.ws || !this.isSetupComplete) return
    this.ws.send(JSON.stringify({
      realtimeInput: {
        mediaChunks: [{
          mimeType: 'image/jpeg',
          data: base64Image
        }]
      }
    }))
  }

  sendText(text: string): void {
    if (!this.ws || !this.isSetupComplete) return
    this.ws.send(JSON.stringify({
      clientContent: {
        turns: [{ role: 'user', parts: [{ text }] }],
        turnComplete: true
      }
    }))
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.isSetupComplete
  }
}

// Standard Gemini API call for gap report generation
export async function generateGapReport(transcript: string, mode: Mode, goal: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `You conducted a ${mode === 'interview' ? 'mock interview' : 'exam practice'} session for: "${goal}"\n\nSession transcript:\n${transcript}\n\nNow generate the gap report.`
        }]
      }],
      systemInstruction: {
        parts: [{
          text: `Generate a JSON gap report with this exact schema:
{
  "strong": [{"topic": "string", "justification": "string"}],
  "shaky": [{"topic": "string", "what_was_missing": "string"}],
  "weak": [{"topic": "string", "correct_answer": "string", "review_angle": "string"}],
  "readiness_score": number,
  "readiness_justification": "string",
  "top_cram_topics": [{"topic": "string", "visual_description": "string"}]
}

For visual_description, write an image generation prompt. Describe a simple visual metaphor or conceptual scene — NOT a diagram with labels or text. Focus on objects, colors, spatial relationships, and visual analogies that represent the concept. Style: clean 3D render or flat illustration on a solid background. Example: for "load balancing" use "A central glowing sphere distributing streams of light evenly to five smaller orbs arranged in a semicircle, dark background, soft blue and white tones". NEVER include readable text, labels, arrows, or annotations in the description.

Return ONLY valid JSON. No markdown fences, no extra text.`
        }]
      },
      generationConfig: {
        responseMimeType: 'application/json'
      }
    })
  })

  const result = await response.json()
  return result.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}
