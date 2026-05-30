import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import ConversationList from '@/components/ConversationList'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-zinc-900">
      <ConversationList />
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  )
}
