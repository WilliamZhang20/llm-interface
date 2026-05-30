import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  role: 'user' | 'assistant' | 'summary'
  content: string
  modelUsed?: string
  streaming?: boolean
}

const PROVIDER_COLORS: Record<string, string> = {
  openai: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  anthropic: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  gemini: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  grok: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  groq: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
  cerebras: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
}

export default function MessageBubble({ role, content, modelUsed, streaming }: Props) {
  if (role === 'summary') return null

  const isUser = role === 'user'
  const providerKey = modelUsed?.split('/')[0]
  const modelLabel = modelUsed?.split('/')[1]
  const badgeColor = providerKey ? (PROVIDER_COLORS[providerKey] ?? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300') : ''

  return (
    <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed break-words ${
          isUser
            ? 'bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-br-sm whitespace-pre-wrap'
            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 rounded-bl-sm'
        }`}
      >
        {isUser ? (
          content
        ) : (
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
        {streaming && (
          <span className="ml-1 inline-block h-3 w-0.5 animate-pulse bg-current opacity-70" />
        )}
      </div>
      {modelLabel && !isUser && (
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badgeColor}`}>
          {modelLabel}
        </span>
      )}
    </div>
  )
}
