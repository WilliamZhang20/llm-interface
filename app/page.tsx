import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/chat/new')
  } else {
    redirect('/login')
  }
}
