const FAL_API_KEY = import.meta.env.VITE_FAL_API_KEY

export async function generateStudyAidImage(prompt: string): Promise<string> {
  const response = await fetch('https://queue.fal.run/fal-ai/fast-sdxl', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Key ${FAL_API_KEY}`,
    },
    body: JSON.stringify({
      prompt,
      image_size: 'landscape_16_9',
      num_inference_steps: 25,
      num_images: 1,
    })
  })

  if (!response.ok) {
    throw new Error(`fal API error: ${response.status}`)
  }

  const data = await response.json()

  // fal queue API returns request_id for async processing
  const requestId = data.request_id
  if (requestId) {
    return pollFalResult(requestId)
  }

  // Direct response
  return data.images?.[0]?.url ?? ''
}

async function pollFalResult(requestId: string): Promise<string> {
  const maxAttempts = 30
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 2000))

    const response = await fetch(`https://queue.fal.run/fal-ai/fast-sdxl/requests/${requestId}/status`, {
      headers: { 'Authorization': `Key ${FAL_API_KEY}` }
    })
    const status = await response.json()

    if (status.status === 'COMPLETED') {
      const resultResponse = await fetch(`https://queue.fal.run/fal-ai/fast-sdxl/requests/${requestId}`, {
        headers: { 'Authorization': `Key ${FAL_API_KEY}` }
      })
      const result = await resultResponse.json()
      return result.images?.[0]?.url ?? ''
    }

    if (status.status === 'FAILED') {
      throw new Error('Image generation failed')
    }
  }

  throw new Error('Image generation timed out')
}
