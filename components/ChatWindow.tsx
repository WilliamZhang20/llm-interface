'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import MessageBubble from './MessageBubble'
import ModelPicker from './ModelPicker'
import { type ProviderID } from '@/lib/providers/index'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'summary'
  content: string
  modelUsed?: string
  streaming?: boolean
}

interface Props {
  conversationId: string
}

export default function ChatWindow({ conversationId }: Props) {
  const router = useRouter()
  const isNew = conversationId === 'new'
  const [realId] = useState(() => (isNew ? uuidv4() : conversationId))
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [model, setModel] = useState<ProviderID | 'auto'>('auto')
  const [availableProviders, setAvailableProviders] = useState<ProviderID[]>([])
  const [error, setError] = useState('')
  const [notices, setNotices] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // A fresh "/chat/new" gets a real UUID in the URL right away. This is a true
  // navigation (the page is keyed by route id), so the component remounts into
  // a clean blank state — and every "+ New" click does too. No messages exist
  // yet, so there's nothing to clobber.
  useEffect(() => {
    if (isNew) router.replace(`/chat/${realId}`)
  }, [isNew, realId, router])

  // Load available providers from settings
  useEffect(() => {
    fetch('/api/providers')
      .then((r) => r.json())
      .then((data: { provider: ProviderID }[]) => {
        setAvailableProviders(data.map((d) => d.provider))
      })
  }, [])

  // Load existing messages for non-new conversations
  useEffect(() => {
    if (isNew) return
    fetch(`/api/conversations/${conversationId}`)
      .then((r) => r.json())
      .then((data: { role: string; content: string; model_used: string | null }[]) => {
        setMessages(
          data
            .filter((m) => m.role !== 'summary')
            .map((m) => ({
              id: uuidv4(),
              role: m.role as Message['role'],
              content: m.content,
              modelUsed: m.model_used ?? undefined,
            }))
        )
      })
      .catch(() => {})
  }, [isNew, conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [])

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setError('')
    setNotices([])
    setLoading(true)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    const userMsg: Message = { id: uuidv4(), role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])

    const assistantId = uuidv4()
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      streaming: true,
    }
    setMessages((prev) => [...prev, assistantMsg])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: realId,
          message: text,
          preferredProvider: model === 'auto' ? undefined : model,
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        setError(json.error || 'Request failed')
        setMessages((prev) => prev.filter((m) => m.id !== assistantId))
        setLoading(false)
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue
          try {
            const event = JSON.parse(raw)
            if (event.content) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + event.content }
                    : m
                )
              )
            }
            if (event.model) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, modelUsed: event.model } : m
                )
              )
            }
            if (event.notice) {
              setNotices((prev) => [...prev, event.notice])
            }
            if (event.error) {
              setError(event.error)
            }
            if (event.done) {
              setMessages((prev) =>
                prev
                  // Drop the assistant bubble if nothing was ever streamed
                  .filter((m) => !(m.id === assistantId && !m.content))
                  .map((m) =>
                    m.id === assistantId ? { ...m, streaming: false } : m
                  )
              )
            }
          } catch {}
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
      setMessages((prev) => prev.filter((m) => m.id !== assistantId))
    }

    setLoading(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages */}
      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-6">
        <div className="mx-auto w-full max-w-2xl flex flex-col gap-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center flex-1 py-24 gap-3">
              <p className="text-zinc-400 dark:text-zinc-500 text-sm">
                Send a message to start chatting.
              </p>
            </div>
          )}
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              role={m.role}
              content={m.content}
              modelUsed={m.modelUsed}
              streaming={m.streaming}
            />
          ))}
          {notices.map((n, i) => (
            <p key={i} className="text-xs text-zinc-400 dark:text-zinc-500 text-center italic">
              {n}
            </p>
          ))}
          {error && (
            <p className="text-xs text-red-500 text-center">{error}</p>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3">
        <div className="mx-auto w-full max-w-2xl flex flex-col gap-2">
          <div className="flex items-end gap-2 rounded-2xl border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 px-4 py-3 focus-within:ring-2 focus-within:ring-zinc-400 transition-shadow">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); autoResize() }}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Message…"
              className="flex-1 resize-none bg-transparent text-sm text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 outline-none leading-relaxed"
              style={{ maxHeight: '200px' }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="shrink-0 rounded-lg bg-zinc-900 dark:bg-zinc-50 px-3 py-1.5 text-xs font-medium text-white dark:text-zinc-900 hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {loading ? '…' : 'Send'}
            </button>
          </div>
          <div className="flex items-center justify-between px-1">
            <ModelPicker
              value={model}
              onChange={setModel}
              availableProviders={availableProviders}
            />
            <span className="text-[10px] text-zinc-400">
              Shift+Enter for newline
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
