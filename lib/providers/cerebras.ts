import { createOpenAICompatibleProvider } from './openai-compatible'

// Cerebras — free tier, extremely fast inference. OpenAI-compatible API.
export const cerebrasProvider = createOpenAICompatibleProvider({
  id: 'cerebras',
  name: 'Cerebras',
  defaultModel: 'llama-3.3-70b',
  contextLimit: 32_768,
  baseURL: 'https://api.cerebras.ai/v1',
})
