import { createOpenAICompatibleProvider } from './openai-compatible'

// Groq — free, no credit card, very fast. OpenAI-compatible API.
export const groqProvider = createOpenAICompatibleProvider({
  id: 'groq',
  name: 'Groq',
  defaultModel: 'llama-3.3-70b-versatile',
  contextLimit: 128_000,
  baseURL: 'https://api.groq.com/openai/v1',
})
