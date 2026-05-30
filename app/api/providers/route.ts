import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { encrypt, decrypt } from '@/lib/crypto'
import { type ProviderID } from '@/lib/providers/index'

const VALID_PROVIDERS: ProviderID[] = ['openai', 'anthropic', 'gemini', 'grok']

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('provider_keys')
    .select('provider, priority, enc_key')
    .eq('user_id', user.id)
    .order('priority')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []).map((row) => {
    let masked = '••••••••'
    try {
      const raw = decrypt(row.enc_key)
      masked = raw.slice(0, 4) + '••••' + raw.slice(-4)
    } catch {}
    return { provider: row.provider, priority: row.priority, masked }
  })

  return NextResponse.json(rows)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { provider, key, priority = 0 } = body

  if (!VALID_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
  }
  if (!key || typeof key !== 'string' || key.length < 8) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 })
  }

  const enc_key = encrypt(key.trim())

  const { error } = await supabase.from('provider_keys').upsert(
    { user_id: user.id, provider, enc_key, priority },
    { onConflict: 'user_id,provider' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { provider } = await request.json()
  if (!VALID_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
  }

  const { error } = await supabase
    .from('provider_keys')
    .delete()
    .eq('user_id', user.id)
    .eq('provider', provider)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { providers } = await request.json() // [{ provider, priority }]
  if (!Array.isArray(providers)) {
    return NextResponse.json({ error: 'providers must be array' }, { status: 400 })
  }

  for (const { provider, priority } of providers) {
    await supabase
      .from('provider_keys')
      .update({ priority })
      .eq('user_id', user.id)
      .eq('provider', provider)
  }

  return NextResponse.json({ ok: true })
}
