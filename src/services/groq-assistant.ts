export type ChatTurn = { role: 'user' | 'assistant'; content: string }

export async function postGroqChat(
  accessToken: string,
  messages: ChatTurn[],
  context: Record<string, unknown>,
): Promise<string> {
  const res = await fetch('/api/groq-chat', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages, context }),
  })

  const text = await res.text()
  let data: unknown
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    throw new Error(text.slice(0, 240) || `Request failed (${res.status})`)
  }

  if (!res.ok) {
    const err = data as { error?: string } | null
    throw new Error(err?.error ?? `Request failed (${res.status})`)
  }

  const ok = data as { message?: { content?: string } }
  const content = ok.message?.content?.trim()
  if (!content) {
    throw new Error('Empty assistant response')
  }
  return content
}
