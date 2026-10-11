'use client'

import { type FormEvent, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bot, ChevronDown, MessageCircle, Send, Sparkles, X } from 'lucide-react'

type ChatMessage = {
  id: number
  role: 'assistant' | 'user'
  text: string
  href?: string
  link?: string
  suggestions?: string[]
  citations?: { title: string; url: string }[]
}

const starterQuestions = [
  'How do I donate food?',
  'How does NGO approval work?',
  'How can an NGO pause requests?',
]

function cleanAssistantLine(line: string) {
  return line
    .replace(/^\s{0,3}#{1,3}\s+/, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .trim()
}

function AssistantAnswer({ text }: { text: string }) {
  const blocks = text.split('\n').flatMap((rawLine, index) => {
    const line = rawLine.trim()
    if (!line) return []

    const titledLine = line.match(/^\*\*(.+?)\*\*\s*[-–—:：]\s*(.+)$/)
    if (titledLine) {
      return [
        <section key={index} className="space-y-1.5">
          <h3 className="font-bold text-foreground">{cleanAssistantLine(titledLine[1])}</h3>
          <p>{cleanAssistantLine(titledLine[2])}</p>
        </section>,
      ]
    }

    const isHeading = /^#{1,3}\s+/.test(line) || /^\*\*.+\*\*$/.test(line) || /^__.+__$/.test(line)
    const listItem = line.match(/^(?:[-*+]\s+|\d+[.)]\s+)(.+)$/)
    if (isHeading) {
      return [<h3 key={index} className="font-bold text-foreground">{cleanAssistantLine(line)}</h3>]
    }
    if (listItem) {
      return [
        <div key={index} className="flex gap-2">
          <span className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-brand-green" aria-hidden="true" />
          <p>{cleanAssistantLine(listItem[1])}</p>
        </div>,
      ]
    }
    return [<p key={index}>{cleanAssistantLine(line)}</p>]
  })

  return <div className="space-y-2.5">{blocks}</div>
}

export function HelpChatbotView({ aiConfigured }: { aiConfigured: boolean }) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: 'assistant',
      text: aiConfigured
        ? 'Hi! I’m your AI assistant. Ask me about FoodRescue or general topics. I use a free-tier model; live web search is not enabled.'
        : 'The AI assistant is ready once a Gemini API key is added to the server environment.',
      suggestions: aiConfigured ? starterQuestions : undefined,
    },
  ])
  const nextId = useRef(2)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    inputRef.current?.focus()
  }, [messages, open, sending])

  async function sendMessage(rawMessage: string) {
    const message = rawMessage.trim()
    if (!message || sending) return

    const userMessage: ChatMessage = { id: nextId.current++, role: 'user', text: message }
    const conversation = [...messages, userMessage]
      .filter((item) => item.role === 'user' || item.id !== 1)
      .slice(-12)
      .map(({ role, text }) => ({ role, content: text }))
    setMessages((current) => [...current, userMessage])
    setInput('')
    setSending(true)
    try {
      const response = await fetch('/api/help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversation }),
      })
      const result = (await response.json()) as {
        answer?: string
        href?: string
        link?: string
        suggestions?: string[]
        citations?: { title: string; url: string }[]
        error?: string
      }
      if (!response.ok) throw new Error(result.error || 'I could not answer just now.')
      setMessages((current) => [
        ...current,
        {
          id: nextId.current++,
          role: 'assistant',
          text: result.answer || 'I could not find an answer to that.',
          href: result.href,
          link: result.link,
          suggestions: result.suggestions,
          citations: result.citations,
        },
      ])
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: nextId.current++,
          role: 'assistant',
          text: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
        },
      ])
    } finally {
      setSending(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendMessage(input)
  }

  return (
    <div className="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <section
          aria-label="FoodRescue help chat"
          className="flex h-[min(640px,calc(100dvh-7rem))] max-h-[calc(100dvh-7rem)] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-[0_24px_80px_-20px_rgba(0,0,0,0.35)]"
        >
          <header className="flex items-center justify-between bg-foreground px-4 py-4 text-background">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-foreground">
                <Sparkles className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-extrabold">FoodRescue Assistant</h2>
                <p className="mt-0.5 text-xs text-background/70">{aiConfigured ? 'Gemini AI · free tier' : 'AI setup required'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-xl p-2 text-background/80 transition-colors hover:bg-background/10 hover:text-background"
            >
              <ChevronDown className="size-5" aria-hidden="true" />
            </button>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto bg-muted/35 p-4" aria-live="polite" aria-relevant="additions text">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-3 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'rounded-br-md bg-foreground text-background'
                      : 'rounded-bl-md border border-border bg-card text-card-foreground shadow-sm'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-brand-green">
                      <Bot className="size-3" aria-hidden="true" />
                      FoodRescue
                    </p>
                  )}
                  {message.role === 'assistant' ? <AssistantAnswer text={message.text} /> : <p className="whitespace-pre-wrap">{message.text}</p>}
                  {message.href && message.link && (
                    <Link href={message.href} onClick={() => setOpen(false)} className="mt-2 inline-flex font-bold text-brand-blue underline-offset-4 hover:underline">
                      {message.link} →
                    </Link>
                  )}
                  {message.citations && message.citations.length > 0 && (
                    <div className="mt-3 border-t border-border pt-2">
                      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Web sources</p>
                      <ul className="space-y-1">
                        {message.citations.map((citation) => (
                          <li key={citation.url}>
                            <a href={citation.url} target="_blank" rel="noreferrer" className="break-words text-xs font-semibold text-brand-blue underline-offset-4 hover:underline">
                              {citation.title || citation.url} ↗
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {message.suggestions && (
                    <div className="mt-3 flex flex-col gap-2">
                      {message.suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          disabled={sending}
                          onClick={() => void sendMessage(suggestion)}
                          className="rounded-xl border border-border bg-background px-3 py-2 text-left text-xs font-bold transition-colors hover:border-brand-green/50 hover:bg-brand-green/5 disabled:opacity-50"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start" role="status" aria-label="Assistant is typing">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3 shadow-sm">
                  <span className="size-1.5 animate-bounce rounded-full bg-brand-green [animation-delay:-0.2s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-brand-green [animation-delay:-0.1s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-brand-green" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border bg-card p-3">
            <label htmlFor="help-chat-input" className="sr-only">Ask FoodRescue a question</label>
            <input
              ref={inputRef}
              id="help-chat-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={aiConfigured ? 'Ask anything...' : 'Add a Gemini API key to enable chat'}
              maxLength={500}
              disabled={sending || !aiConfigured}
              className="min-w-0 flex-1 rounded-xl border border-input bg-muted/50 px-3.5 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-brand-green focus:bg-background disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending || !aiConfigured}
              aria-label="Send message"
              className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-foreground transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              <Send className="size-4" aria-hidden="true" />
            </button>
          </form>
          <p className="bg-card px-4 pb-3 text-center text-[10px] text-muted-foreground">AI answers may be inaccurate or out of date. Verify important facts.</p>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={open ? 'Close FoodRescue help chat' : 'Open FoodRescue help chat'}
        aria-expanded={open}
        className="group flex items-center gap-2.5 rounded-full bg-foreground py-3 pl-4 pr-5 text-background shadow-[0_12px_30px_-8px_rgba(0,0,0,0.4)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_38px_-8px_rgba(0,0,0,0.45)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/60"
      >
        <span className="relative flex size-9 items-center justify-center rounded-full bg-primary text-foreground">
          {open ? <X className="size-4" aria-hidden="true" /> : <MessageCircle className="size-4 transition-transform group-hover:scale-110" aria-hidden="true" />}
          {!open && <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-foreground bg-brand-green" />}
        </span>
        <span className="text-sm font-extrabold">{open ? 'Close' : 'Ask FoodRescue'}</span>
      </button>
    </div>
  )
}

export const HelpChatbot = HelpChatbotView
