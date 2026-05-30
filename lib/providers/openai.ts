import OpenAI from 'openai'
import { type LLMProvider, type NormalizedMessage, roughTokens } from './index'

export const openaiProvider: LLMProvider = {
  id: 'openai',
  name: 'OpenAI',
  defaultModel: 'gpt-4o',
  contextLimit: 128_000,

  async *stream(messages: NormalizedMessage[], apiKey: string) {
    const client = new OpenAI({ apiKey })
    const { system, chat } = splitMessages(messages)
    const formatted = chat.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))
    if (system) {
      formatted.unshift({ role: 'assistant' as const, content: system })
      formatted.unshift({ role: 'user' as const, content: '(context loaded)' })
    }

    const stream = await client.chat.completions.create({
      model: this.defaultModel,
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
      const client = new OpenAI({ apiKey })
      await client.models.list()
      return true
    } catch {
      return false
    }
  },
}

function splitMessages(messages: NormalizedMessage[]): {
  system: string
  chat: NormalizedMessage[]
} {
  const summaries = messages.filter((m) => m.role === 'summary')
  const chat = messages.filter((m) => m.role !== 'summary')
  const system = summaries.map((m) => m.content).join('\n\n')
  return { system, chat }
}
