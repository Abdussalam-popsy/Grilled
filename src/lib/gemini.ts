import { getSystemInstruction } from './prompts'
import type { Mode } from '../types'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

// Gemini Live API WebSocket connection
// Docs: https://ai.google.dev/gemini-api/docs/live

export interface GeminiLiveCallbacks {
  onAudioOutput?: (audioData: string) => void
  onTextOutput?: (text: string) => void
  onTranscript?: (text: string, isUser: boolean) => void
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
    const model = 'gemini-2.5-flash-preview-native-audio-dialog'
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${GEMINI_API_KEY}`

    console.log('[Gemini] Connecting to Live API...')
    this.ws = new WebSocket(wsUrl)

    this.ws.onopen = () => {
      console.log('[Gemini] WebSocket open, sending setup...')
      const setupMessage = {
        setup: {
          model: `models/${model}`,
          generation_config: {
            response_modalities: ['AUDIO'],
            speech_config: {
              voice_config: {
                prebuilt_voice_config: {
                  voice_name: 'Aoede'
                }
              }
            }
          },
          system_instruction: {
            parts: [{ text: getSystemInstruction(mode, goal, resourceContext) }]
          },
          tools: [{ google_search: {} }],
          // Enable transcriptions so we can build the gap report from text
          output_audio_transcription: {},
          input_audio_transcription: {},
        }
      }
      this.ws?.send(JSON.stringify(setupMessage))
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.handleMessage(data)
      } catch (err) {
        console.error('[Gemini] Failed to parse message:', err)
      }
    }

    this.ws.onerror = (event) => {
      console.error('[Gemini] WebSocket error:', event)
      this.callbacks.onError?.('WebSocket connection error — check your API key and network')
    }

    this.ws.onclose = (event) => {
      console.log('[Gemini] WebSocket closed:', event.code, event.reason)
      this.callbacks.onClose?.()
    }
  }

  private handleMessage(data: Record<string, unknown>): void {
    // Setup complete
    if ('setupComplete' in data) {
      console.log('[Gemini] Setup complete, ready for streaming')
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

      // Model audio/text turn
      const modelTurn = serverContent.modelTurn as Record<string, unknown> | undefined
      if (modelTurn?.parts) {
        const parts = modelTurn.parts as Array<Record<string, unknown>>
        for (const part of parts) {
          if (part.text) {
            this.callbacks.onTextOutput?.(part.text as string)
          }
          const inlineData = part.inlineData as Record<string, string> | undefined
          if (inlineData?.mimeType?.startsWith('audio/') || inlineData?.mime_type?.startsWith('audio/')) {
            this.callbacks.onAudioOutput?.(inlineData.data)
          }
        }
      }

      // Output audio transcription (what Gemini said, as text)
      const outputTranscription = serverContent.outputTranscription as Record<string, string> | undefined
      if (outputTranscription?.text) {
        this.callbacks.onTranscript?.(outputTranscription.text, false)
      }

      // Input audio transcription (what user said, as text)
      const inputTranscription = serverContent.inputTranscription as Record<string, string> | undefined
      if (inputTranscription?.text) {
        this.callbacks.onTranscript?.(inputTranscription.text, true)
      }
    }
  }

  sendAudio(base64Audio: string): void {
    if (!this.ws || !this.isSetupComplete) return
    this.ws.send(JSON.stringify({
      realtime_input: {
        media_chunks: [{
          mime_type: 'audio/pcm',
          data: base64Audio
        }]
      }
    }))
  }

  sendVideoFrame(base64Image: string): void {
    if (!this.ws || !this.isSetupComplete) return
    this.ws.send(JSON.stringify({
      realtime_input: {
        media_chunks: [{
          mime_type: 'image/jpeg',
          data: base64Image
        }]
      }
    }))
  }

  sendText(text: string): void {
    if (!this.ws || !this.isSetupComplete) return
    this.ws.send(JSON.stringify({
      client_content: {
        turns: [{ role: 'user', parts: [{ text }] }],
        turn_complete: true
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
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`

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

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error ${response.status}: ${errorText}`)
  }

  const result = await response.json()
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error('Empty response from Gemini')
  }
  return text
}

// Gemini image generation (replaces fal)
export async function generateStudyImage(prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${GEMINI_API_KEY}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE']
      }
    })
  })

  if (!response.ok) {
    throw new Error(`Image generation error: ${response.status}`)
  }

  const result = await response.json()
  const parts = result.candidates?.[0]?.content?.parts ?? []
  for (const part of parts) {
    if (part.inlineData?.mimeType?.startsWith('image/')) {
      // Return as data URL
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
    }
  }

  throw new Error('No image in response')
}
