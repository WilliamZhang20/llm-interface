import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { decrypt } from '@/lib/crypto'
import { toNormalized, type DBMessage } from '@/lib/context/adapter'
import { maybeCompress } from '@/lib/context/compressor'
import { orderProviders, markUnavailable, type UserProvider } from '@/lib/router'
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
  const { data: keyRows, error: keyErr } = await supabase
    .from('provider_keys')
    .select('provider, enc_key, priority')
    .eq('user_id', user.id)
    .order('priority')

  if (keyErr) {
    return NextResponse.json(
      { error: `Could not load provider keys: ${keyErr.message}` },
      { status: 500 }
    )
  }
  if (!keyRows?.length) {
    return NextResponse.json(
      { error: `No provider keys found for this account (user ${user.id.slice(0, 8)}…). Make sure you saved them while logged in as the same user.` },
      { status: 400 }
    )
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

  // Build the ordered list of providers to try (preferred first, then the
  // rest by priority). Failover walks this list transparently.
  const candidates = orderProviders(userProviders, preferredProvider)
  if (candidates.length === 0) {
    return NextResponse.json(
      { error: 'No available providers. Add an API key in Settings.' },
      { status: 503 }
    )
  }

  // Compress against the first candidate's context window
  const { messages: compressed } = await maybeCompress(
    normalized,
    candidates[0].provider.contextLimit,
    userProviders,
    candidates[0].provider.estimateTokens.bind(candidates[0].provider)
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

  const assistantSeq = nextSeq + 1
  let fullResponse = ''
  let usedModel = ''

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()
      const send = (data: object) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`))

      for (let i = 0; i < candidates.length; i++) {
        const { provider, key } = candidates[i]
        const modelLabel = `${provider.id}/${provider.defaultModel}`
        let producedHere = false

        try {
          send({ model: modelLabel })
          for await (const chunk of provider.stream(normalized, key)) {
            producedHere = true
            fullResponse += chunk
            send({ content: chunk })
          }
          usedModel = modelLabel
          break // success
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Stream error'
          markUnavailable(provider.id)

          if (producedHere) {
            // Tokens already streamed — keep them, don't restart elsewhere
            send({ error: `${provider.name} failed mid-response: ${msg}` })
            usedModel = modelLabel
            break
          }

          const next = candidates[i + 1]
          if (next) {
            send({ notice: `${provider.name} unavailable (${msg}). Falling back to ${next.provider.name}…` })
          } else {
            send({ error: `${provider.name} failed: ${msg}. No more providers to try.` })
          }
        }
      }

      // Save assistant message (if we got anything)
      if (fullResponse) {
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: fullResponse,
          model_used: usedModel,
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
