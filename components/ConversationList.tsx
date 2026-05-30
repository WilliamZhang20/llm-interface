'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { getBrowserClient } from '@/lib/supabase-browser'

interface Conversation {
  id: string
  title: string
  updated_at: string
}

export default function ConversationList() {
  const router = useRouter()
  const params = useParams()
  const activeId = params?.id as string | undefined
  const [convos, setConvos] = useState<Conversation[]>([])

  const load = useCallback(async () => {
    const res = await fetch('/api/conversations')
    if (res.ok) setConvos(await res.json())
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.preventDefault()
    await fetch('/api/conversations', { method: 'DELETE', body: JSON.stringify({ id }), headers: { 'Content-Type': 'application/json' } })
    setConvos((c) => c.filter((x) => x.id !== id))
    if (activeId === id) router.push('/chat/new')
  }

  async function handleLogout() {
    const supabase = getBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
      <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
        <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">LLM Interface</span>
        <Link
          href="/chat/new"
          className="rounded-md px-2 py-1 text-xs bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-80 transition-opacity"
        >
          + New
        </Link>
      </div>

      <nav className="flex flex-1 flex-col overflow-y-auto gap-0.5 p-2">
        {convos.map((c) => (
          <div key={c.id} className="group relative">
            <Link
              href={`/chat/${c.id}`}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm truncate transition-colors ${
                activeId === c.id
                  ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50'
                  : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50'
              }`}
            >
              <span className="truncate">{c.title}</span>
            </Link>
            <button
              onClick={(e) => handleDelete(e, c.id)}
              className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center justify-center w-5 h-5 rounded text-zinc-400 hover:text-red-500 text-xs"
              aria-label="Delete"
            >
              ×
            </button>
          </div>
        ))}
        {convos.length === 0 && (
          <p className="px-3 py-4 text-xs text-zinc-400 dark:text-zinc-500">No conversations yet.</p>
        )}
      </nav>

      <div className="border-t border-zinc-200 dark:border-zinc-700 p-2 flex flex-col gap-1">
        <Link
          href="/settings"
          className="rounded-lg px-3 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors"
        >
          Settings
        </Link>
        <button
          onClick={handleLogout}
          className="rounded-lg px-3 py-2 text-sm text-left text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
