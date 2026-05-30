import ChatWindow from '@/components/ChatWindow'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ChatPage({ params }: Props) {
  const { id } = await params
  return <ChatWindow conversationId={id} />
}
