export type ProviderID = 'openai' | 'anthropic' | 'gemini' | 'grok'

export interface NormalizedMessage {
  role: 'user' | 'assistant' | 'summary'
  content: string
}

export interface LLMProvider {
  readonly id: ProviderID
  readonly name: string
  readonly defaultModel: string
  readonly contextLimit: number
  stream(messages: NormalizedMessage[], apiKey: string): AsyncGenerator<string>
  estimateTokens(messages: NormalizedMessage[]): number
  ping(apiKey: string): Promise<boolean>
}

// Rough token estimate: ~4 chars per token
export function roughTokens(messages: NormalizedMessage[]): number {
  return Math.ceil(messages.reduce((sum, m) => sum + m.content.length, 0) / 4)
}
