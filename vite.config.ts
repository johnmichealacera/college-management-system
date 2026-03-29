import path from 'path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { handleGroqChatPost } from './server/groq-chat-handler'

function readRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function groqApiPlugin(): Plugin {
  return {
    name: 'groq-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0] ?? ''
        if (req.method !== 'POST' || url !== '/api/groq-chat') {
          next()
          return
        }
        const nodeRes = res as ServerResponse
        const env = loadEnv(server.config.mode, process.cwd(), '')
        let raw: string
        try {
          raw = await readRequestBody(req as IncomingMessage)
        } catch {
          nodeRes.statusCode = 400
          nodeRes.setHeader('Content-Type', 'application/json')
          nodeRes.end(JSON.stringify({ error: 'Failed to read body' }))
          return
        }
        let body: unknown
        try {
          body = raw ? JSON.parse(raw) : undefined
        } catch {
          nodeRes.statusCode = 400
          nodeRes.setHeader('Content-Type', 'application/json')
          nodeRes.end(JSON.stringify({ error: 'Invalid JSON' }))
          return
        }
        const authHeader = req.headers.authorization
        const result = await handleGroqChatPost(body, authHeader, {
          GROQ_API_KEY: env.GROQ_API_KEY ?? '',
          GROQ_MODEL: env.GROQ_MODEL,
          VITE_SUPABASE_URL: env.VITE_SUPABASE_URL ?? '',
          VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY ?? '',
        })
        nodeRes.statusCode = result.status
        nodeRes.setHeader('Content-Type', 'application/json')
        nodeRes.end(result.body)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), groqApiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
