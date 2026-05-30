import { type NormalizedMessage } from '../providers/index'
import { type UserProvider, selectProvider } from '../router'

const KEEP_RECENT = 10 // always keep this many raw turns at the end

/**
 * If the estimated token count exceeds the threshold, summarize the oldest
 * portion of the conversation using the cheapest available provider.
 *
 * Returns the compressed message list (summary node + recent raw turns).
 * If no compression is needed, returns the original list unchanged.
 */
export async function maybeCompress(
  messages: NormalizedMessage[],
  contextLimit: number,
  userProviders: UserProvider[],
  estimateTokens: (msgs: NormalizedMessage[]) => number
): Promise<{ messages: NormalizedMessage[]; compressed: boolean }> {
  const tokens = estimateTokens(messages)
  const threshold = contextLimit * 0.8

  if (tokens <= threshold || messages.length <= KEEP_RECENT) {
    return { messages, compressed: false }
  }

  const recent = messages.slice(-KEEP_RECENT)
  const toSummarize = messages.slice(0, -KEEP_RECENT)

  const summaryText = await summarize(toSummarize, userProviders)
  if (!summaryText) {
    // Couldn't summarize; return as-is rather than dropping context silently
    return { messages, compressed: false }
  }

  const summary: NormalizedMessage = {
    role: 'summary',
    content: `[Earlier conversation summary]\n${summaryText}`,
  }

  return { messages: [summary, ...recent], compressed: true }
}

async function summarize(
  messages: NormalizedMessage[],
  userProviders: UserProvider[]
): Promise<string | null> {
  const selected = await selectProvider(userProviders)
  if (!selected) return null

  const transcript = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n')

  const prompt: NormalizedMessage[] = [
    {
      role: 'user',
      content: `Summarize the following conversation concisely. Preserve key decisions, facts, and context that would be needed to continue the conversation intelligently.\n\n${transcript}\n\nSummary:`,
    },
  ]

  let result = ''
  for await (const chunk of selected.provider.stream(prompt, selected.key)) {
    result += chunk
  }
  return result.trim() || null
}
