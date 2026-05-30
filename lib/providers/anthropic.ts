import Anthropic from '@anthropic-ai/sdk'
import { type LLMProvider, type NormalizedMessage, roughTokens } from './index'

export const anthropicProvider: LLMProvider = {
  id: 'anthropic',
  name: 'Anthropic',
  defaultModel: 'claude-sonnet-4-6',
  contextLimit: 200_000,

  async *stream(messages: NormalizedMessage[], apiKey: string) {
    const client = new Anthropic({ apiKey })
    const summaries = messages.filter((m) => m.role === 'summary')
    const chat = messages.filter((m) => m.role !== 'summary')

    const systemParts = [
      'You are a helpful assistant.',
      ...summaries.map((m) => m.content),
    ].join('\n\n')

    const formatted = chat.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const stream = client.messages.stream({
      model: this.defaultModel,
      max_tokens: 8096,
      system: systemParts,
      messages: formatted,
    })

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield event.delta.text
      }
    }
  },

  estimateTokens: roughTokens,

  async ping(apiKey: string) {
    try {
      const client = new Anthropic({ apiKey })
      await client.models.list()
      return true
    } catch {
      return false
    }
  },
}
