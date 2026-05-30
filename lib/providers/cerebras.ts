import { createOpenAICompatibleProvider } from './openai-compatible'

// Cerebras — free tier, extremely fast inference. OpenAI-compatible API.
export const cerebrasProvider = createOpenAICompatibleProvider({
  id: 'cerebras',
  name: 'Cerebras',
  defaultModel: 'gpt-oss-120b',
  contextLimit: 65_536,
  baseURL: 'https://api.cerebras.ai/v1',
})
