import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Loader2, SendHorizontal, Sparkles } from 'lucide-react'
import { buildAssistantContextSnapshot } from '@/lib/assistant-context'
import { postGroqChat, type ChatTurn } from '@/services/groq-assistant'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useActiveSemester } from '@/contexts/active-semester-context'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const SUGGESTIONS = [
  'Summarize enrollment for the selected term using the dashboard numbers.',
  'Which subjects have the most enrollments right now?',
  'What should I check before enrolling a student to avoid capacity errors?',
]

export function AssistantSheet() {
  const { session } = useAuth()
  const { semester, ready } = useActiveSemester()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatTurn[]>([])
  const [sending, setSending] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, open, sending])

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || !session?.access_token) {
        if (!session?.access_token) {
          toast.error('Sign in to use the assistant.')
        }
        return
      }

      setSending(true)
      const nextMessages: ChatTurn[] = [...messages, { role: 'user', content: trimmed }]
      setMessages(nextMessages)
      setInput('')

      try {
        const context = await buildAssistantContextSnapshot({ pathname, semester })
        const reply = await postGroqChat(session.access_token, nextMessages, context)
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
      } catch (e) {
        setMessages((prev) => prev.slice(0, -1))
        toast.error(e instanceof Error ? e.message : 'Assistant request failed')
      } finally {
        setSending(false)
      }
    },
    [messages, pathname, semester, session?.access_token],
  )

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void send(input)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 rounded-lg"
          disabled={!session}
          title={session ? 'Open assistant' : 'Sign in to use the assistant'}
        >
          <Sparkles className="size-4" />
          Assistant
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-full max-w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border px-6 py-4 text-left">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            LocalWeb assistant
          </SheetTitle>
          <SheetDescription>
            Answers use your current page path and the term selected in the header. The model cannot
            change data—use the app for enrollments and grades.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-3">
          {!ready ? (
            <p className="text-sm text-muted-foreground">Loading term context…</p>
          ) : (
            <>
              <ScrollArea className="min-h-[12rem] flex-1 pr-3">
                <div className="space-y-3 pb-2">
                  {messages.length === 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Try asking
                      </p>
                      <div className="flex flex-col gap-2">
                        {SUGGESTIONS.map((s) => (
                          <button
                            key={s}
                            type="button"
                            disabled={sending}
                            className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50"
                            onClick={() => void send(s)}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {messages.map((m, i) => (
                    <div
                      key={`${i}-${m.role}`}
                      className={cn(
                        'rounded-lg px-3 py-2 text-sm',
                        m.role === 'user'
                          ? 'ml-6 bg-primary text-primary-foreground'
                          : 'mr-2 border border-border bg-card text-card-foreground',
                      )}
                    >
                      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide opacity-70">
                        {m.role === 'user' ? 'You' : 'Assistant'}
                      </span>
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    </div>
                  ))}
                  {sending && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Thinking…
                    </div>
                  )}
                  <div ref={endRef} className="h-px shrink-0" aria-hidden />
                </div>
              </ScrollArea>

              <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                <Textarea
                  value={input}
                  onChange={(ev) => setInput(ev.target.value)}
                  placeholder="Ask about the current term, enrollments, or workflows…"
                  rows={3}
                  disabled={sending}
                  className="resize-none rounded-lg text-sm"
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter' && !ev.shiftKey) {
                      ev.preventDefault()
                      void send(input)
                    }
                  }}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-lg"
                    disabled={sending || messages.length === 0}
                    onClick={() => setMessages([])}
                  >
                    Clear
                  </Button>
                  <Button type="submit" size="sm" className="gap-2 rounded-lg" disabled={sending}>
                    {sending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <SendHorizontal className="size-4" />
                    )}
                    Send
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
