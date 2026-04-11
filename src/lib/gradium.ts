const GRADIUM_API_KEY = import.meta.env.VITE_GRADIUM_API_KEY

export async function generateVoiceDebrief(text: string): Promise<string> {
  // Gradium TTS API - generates audio from text
  const response = await fetch('https://api.gradium.ai/v1/tts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GRADIUM_API_KEY}`,
    },
    body: JSON.stringify({
      text,
      voice: 'default',
      format: 'mp3',
    })
  })

  if (!response.ok) {
    throw new Error(`Gradium API error: ${response.status}`)
  }

  // Return audio as blob URL for playback
  const blob = await response.blob()
  return URL.createObjectURL(blob)
}
