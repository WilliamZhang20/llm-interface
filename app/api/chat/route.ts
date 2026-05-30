import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { decrypt } from '@/lib/crypto'
import { toNormalized, type DBMessage } from '@/lib/context/adapter'
import { maybeCompress } from '@/lib/context/compressor'
import { selectProvider, markUnavailable, type UserProvider } from '@/lib/router'
import { type ProviderID } from '@/lib/providers/index'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { conversationId, message, preferredProvider } = await request.json()
  if (!conversationId || !message) {
    return NextResponse.json({ error: 'Missing conversationId or message' }, { status: 400 })
  }

  // Load user's provider keys
  const { data: keyRows } = await supabase
    .from('provider_keys')
    .select('provider, enc_key, priority')
    .eq('user_id', user.id)
    .order('priority')

  if (!keyRows?.length) {
    return NextResponse.json({ error: 'No provider keys configured. Go to Settings to add one.' }, { status: 400 })
  }

  const userProviders: UserProvider[] = keyRows.map((r) => ({
    provider: r.provider as ProviderID,
    key: decrypt(r.enc_key),
    priority: r.priority,
  }))

  // Ensure conversation exists
  await supabase.from('conversations').upsert(
    { id: conversationId, user_id: user.id, title: 'New Chat' },
    { onConflict: 'id', ignoreDuplicates: true }
  )

  // Load existing messages
  const { data: existingMessages } = await supabase
    .from('messages')
    .select('role, content, model_used, sequence_num, is_summary, summary_range')
    .eq('conversation_id', conversationId)
    .order('sequence_num')

  const nextSeq = ((existingMessages ?? []).reduce((m, r) => Math.max(m, r.sequence_num), -1)) + 1

  // Save user message
  await supabase.from('messages').insert({
    conversation_id: conversationId,
    role: 'user',
    content: message,
    sequence_num: nextSeq,
  })

  // Build context for the model
  const userMsg = { role: 'user' as const, content: message }
  let normalized = [
    ...toNormalized((existingMessages ?? []) as DBMessage[]),
    userMsg,
  ]

  // Select provider (may fail if all unavailable)
  const selected = await selectProvider(userProviders, preferredProvider)
  if (!selected) {
    return NextResponse.json({ error: 'No available providers. Check your API keys or try again later.' }, { status: 503 })
  }

  // Compress if context is too large
  const { messages: compressed } = await maybeCompress(
    normalized,
    selected.provider.contextLimit,
    userProviders,
    selected.provider.estimateTokens.bind(selected.provider)
  )
  normalized = compressed

  // Auto-generate title from first user message
  if (nextSeq === 0) {
    const title = message.slice(0, 60).trim() + (message.length > 60 ? '…' : '')
    await supabase
      .from('conversations')
      .update({ title })
      .eq('id', conversationId)
      .eq('user_id', user.id)
  }

  const modelUsed = `${selected.provider.id}/${selected.provider.defaultModel}`
  const assistantSeq = nextSeq + 1
  let fullResponse = ''

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()
      const send = (data: object) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`))

      send({ model: modelUsed })

      try {
        for await (const chunk of selected.provider.stream(normalized, selected.key)) {
          fullResponse += chunk
          send({ content: chunk })
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Stream error'
        markUnavailable(selected.provider.id)

        // Try fallback provider
        const fallback = await selectProvider(
          userProviders.filter((p) => p.provider !== selected.provider.id),
          undefined
        )

        if (fallback) {
          send({ model: `${fallback.provider.id}/${fallback.provider.defaultModel}` })
          try {
            for await (const chunk of fallback.provider.stream(normalized, fallback.key)) {
              fullResponse += chunk
              send({ content: chunk })
            }
          } catch (fallbackErr) {
            send({ error: fallbackErr instanceof Error ? fallbackErr.message : 'Fallback failed' })
          }
        } else {
          send({ error: msg })
        }
      }

      // Save assistant message
      if (fullResponse) {
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: fullResponse,
          model_used: modelUsed,
          sequence_num: assistantSeq,
        })
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId)
      }

      send({ done: true })
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
