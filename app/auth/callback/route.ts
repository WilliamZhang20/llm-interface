import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// Handles the email-confirmation / OAuth redirect. Supabase appends a `?code=…`
// which must be exchanged for a session here, otherwise the user lands logged-out.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/chat/new'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    )
  }

  return NextResponse.redirect(`${origin}/login?error=missing_code`)
}
