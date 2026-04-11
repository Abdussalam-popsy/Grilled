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
    const model = 'gemini-2.0-flash-live-001'
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${GEMINI_API_KEY}`

    this.ws = new WebSocket(wsUrl)

    this.ws.onopen = () => {
      // Send setup message
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

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.handleMessage(data)
      } catch {
        console.error('Failed to parse Gemini message')
      }
    }

    this.ws.onerror = () => {
      this.callbacks.onError?.('WebSocket connection error')
    }

    this.ws.onclose = () => {
      this.callbacks.onClose?.()
    }
  }

  private handleMessage(data: Record<string, unknown>): void {
    // Setup complete
    if ('setupComplete' in data) {
      this.isSetupComplete = true
      this.callbacks.onReady?.()
      return
    }

    // Server content (audio/text responses)
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
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`

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

For visual_description use: "Clean, minimal educational diagram explaining [topic]. Style: textbook illustration, white background, labelled clearly. Concept: [specific gap]. No text longer than 5 words per label."

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
