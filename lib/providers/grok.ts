import { createOpenAICompatibleProvider } from './openai-compatible'

// xAI Grok — OpenAI-compatible API.
export const grokProvider = createOpenAICompatibleProvider({
  id: 'grok',
  name: 'xAI',
  defaultModel: 'grok-3',
  contextLimit: 131_072,
  baseURL: 'https://api.x.ai/v1',
})
