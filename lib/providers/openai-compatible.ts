import OpenAI from 'openai'
import { type LLMProvider, type NormalizedMessage, type ProviderID, roughTokens } from './index'

interface Config {
  id: ProviderID
  name: string
  defaultModel: string
  contextLimit: number
  baseURL: string
}

// Builds a provider for any OpenAI-compatible API (xAI, Groq, Cerebras, …).
// Summaries are passed as a leading system message; chat turns map 1:1.
export function createOpenAICompatibleProvider(config: Config): LLMProvider {
  return {
    id: config.id,
    name: config.name,
    defaultModel: config.defaultModel,
    contextLimit: config.contextLimit,

    async *stream(messages: NormalizedMessage[], apiKey: string) {
      const client = new OpenAI({ apiKey, baseURL: config.baseURL })

      const summaries = messages.filter((m) => m.role === 'summary')
      const chat = messages.filter((m) => m.role !== 'summary')
      const formatted: OpenAI.Chat.ChatCompletionMessageParam[] = []

      if (summaries.length > 0) {
        formatted.push({
          role: 'system',
          content: summaries.map((m) => m.content).join('\n\n'),
        })
      }
      for (const m of chat) {
        formatted.push({ role: m.role as 'user' | 'assistant', content: m.content })
      }

      const stream = await client.chat.completions.create({
        model: config.defaultModel,
        messages: formatted,
        stream: true,
      })

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content
        if (content) yield content
      }
    },

    estimateTokens: roughTokens,

    async ping(apiKey: string) {
      try {
        const client = new OpenAI({ apiKey, baseURL: config.baseURL })
        await client.models.list()
        return true
      } catch {
        return false
      }
    },
  }
}
