import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleGroqChatPost } from './lib/groq-chat-handler'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  const body =
    typeof req.body === 'string'
      ? (() => {
          try {
            return JSON.parse(req.body) as unknown
          } catch {
            return undefined
          }
        })()
      : req.body

  const result = await handleGroqChatPost(body, req.headers.authorization, {
    GROQ_API_KEY: process.env.GROQ_API_KEY ?? '',
    GROQ_MODEL: process.env.GROQ_MODEL,
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? '',
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ?? '',
  })

  res.status(result.status).setHeader('Content-Type', 'application/json')
  res.end(result.body)
}
