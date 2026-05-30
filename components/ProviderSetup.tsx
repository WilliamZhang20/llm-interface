'use client'

import { useEffect, useState } from 'react'
import { type ProviderID } from '@/lib/providers/index'

const PROVIDERS: { id: ProviderID; label: string; placeholder: string }[] = [
  { id: 'openai', label: 'OpenAI', placeholder: 'sk-…' },
  { id: 'anthropic', label: 'Anthropic', placeholder: 'sk-ant-…' },
  { id: 'gemini', label: 'Google Gemini', placeholder: 'AIza…' },
  { id: 'grok', label: 'xAI Grok', placeholder: 'xai-…' },
]

interface StoredKey {
  provider: ProviderID
  priority: number
  masked: string
}

export default function ProviderSetup() {
  const [stored, setStored] = useState<StoredKey[]>([])
  const [inputs, setInputs] = useState<Record<ProviderID, string>>({
    openai: '', anthropic: '', gemini: '', grok: '',
  })
  const [saving, setSaving] = useState<ProviderID | null>(null)
  const [status, setStatus] = useState<Record<ProviderID, string>>({
    openai: '', anthropic: '', gemini: '', grok: '',
  })

  useEffect(() => {
    fetch('/api/providers').then((r) => r.json()).then(setStored)
  }, [])

  function getStored(id: ProviderID): StoredKey | undefined {
    return stored.find((s) => s.provider === id)
  }

  async function saveKey(id: ProviderID) {
    const key = inputs[id].trim()
    if (!key) return
    setSaving(id)
    const res = await fetch('/api/providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: id, key, priority: PROVIDERS.findIndex((p) => p.id === id) }),
    })
    const json = await res.json()
    setSaving(null)
    if (res.ok) {
      setStatus((s) => ({ ...s, [id]: 'Saved!' }))
      setInputs((i) => ({ ...i, [id]: '' }))
      const updated = await fetch('/api/providers').then((r) => r.json())
      setStored(updated)
    } else {
      setStatus((s) => ({ ...s, [id]: json.error || 'Error' }))
    }
    setTimeout(() => setStatus((s) => ({ ...s, [id]: '' })), 3000)
  }

  async function removeKey(id: ProviderID) {
    await fetch('/api/providers', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: id }),
    })
    setStored((s) => s.filter((x) => x.provider !== id))
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Add your API keys below. They are encrypted and stored securely. The model with the lowest
        priority number is tried first; if it fails, the next one is used automatically.
      </p>

      {PROVIDERS.map(({ id, label, placeholder }) => {
        const s = getStored(id)
        return (
          <div key={id} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 w-28">{label}</span>
              {s && (
                <span className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-700/50 px-3 py-1.5 text-xs font-mono text-zinc-500 dark:text-zinc-400">
                  {s.masked}
                </span>
              )}
              {s && (
                <button
                  onClick={() => removeKey(id)}
                  className="text-xs text-red-500 hover:text-red-700 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder={s ? 'Replace key…' : placeholder}
                value={inputs[id]}
                onChange={(e) => setInputs((i) => ({ ...i, [id]: e.target.value }))}
                className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-700 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 font-mono outline-none focus:ring-2 focus:ring-zinc-400"
              />
              <button
                onClick={() => saveKey(id)}
                disabled={!inputs[id].trim() || saving === id}
                className="rounded-lg bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-xs font-medium text-white dark:text-zinc-900 hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {saving === id ? 'Saving…' : 'Save'}
              </button>
            </div>
            {status[id] && (
              <p className={`text-xs ${status[id] === 'Saved!' ? 'text-green-500' : 'text-red-500'}`}>
                {status[id]}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
