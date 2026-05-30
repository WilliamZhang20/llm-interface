import { GoogleGenerativeAI } from '@google/generative-ai'
import { type LLMProvider, type NormalizedMessage, roughTokens } from './index'

export const geminiProvider: LLMProvider = {
  id: 'gemini',
  name: 'Google',
  defaultModel: 'gemini-2.5-flash',
  contextLimit: 1_000_000,

  async *stream(messages: NormalizedMessage[], apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey)

    const summaries = messages.filter((m) => m.role === 'summary')
    const chat = messages.filter((m) => m.role !== 'summary')
    const systemInstruction = summaries.map((m) => m.content).join('\n\n') || undefined

    const model = genAI.getGenerativeModel({
      model: this.defaultModel,
      ...(systemInstruction && { systemInstruction }),
    })

    // Gemini requires alternating user/model turns and starts with user
    const history = chat.slice(0, -1).map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }))

    const lastMessage = chat[chat.length - 1]
    if (!lastMessage) return

    const chatSession = model.startChat({ history })
    const result = await chatSession.sendMessageStream(lastMessage.content)

    for await (const chunk of result.stream) {
      const text = chunk.text()
      if (text) yield text
    }
  },

  estimateTokens: roughTokens,

  async ping(apiKey: string) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
      await model.countTokens('ping')
      return true
    } catch {
      return false
    }
  },
}
