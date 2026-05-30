import OpenAI from 'openai'
import { type LLMProvider, type NormalizedMessage, roughTokens } from './index'

// xAI Grok uses an OpenAI-compatible API
export const grokProvider: LLMProvider = {
  id: 'grok',
  name: 'xAI',
  defaultModel: 'grok-3',
  contextLimit: 131_072,

  async *stream(messages: NormalizedMessage[], apiKey: string) {
    const client = new OpenAI({
      apiKey,
      baseURL: 'https://api.x.ai/v1',
    })

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
      formatted.push({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })
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
      const client = new OpenAI({ apiKey, baseURL: 'https://api.x.ai/v1' })
      await client.models.list()
      return true
    } catch {
      return false
    }
  },
}
