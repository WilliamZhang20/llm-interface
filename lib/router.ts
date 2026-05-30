import { openaiProvider } from './providers/openai'
import { anthropicProvider } from './providers/anthropic'
import { geminiProvider } from './providers/gemini'
import { grokProvider } from './providers/grok'
import { type LLMProvider, type ProviderID } from './providers/index'

const PROVIDERS: Record<ProviderID, LLMProvider> = {
  openai: openaiProvider,
  anthropic: anthropicProvider,
  gemini: geminiProvider,
  grok: grokProvider,
}

export function getProvider(id: ProviderID): LLMProvider {
  return PROVIDERS[id]
}

export function allProviders(): LLMProvider[] {
  return Object.values(PROVIDERS)
}

// In-memory circuit breaker: maps provider → timestamp when it becomes available again
const unavailableUntil = new Map<ProviderID, number>()

export function markUnavailable(id: ProviderID, durationMs = 60_000) {
  unavailableUntil.set(id, Date.now() + durationMs)
}

function isCircuitOpen(id: ProviderID): boolean {
  const until = unavailableUntil.get(id)
  return !!until && Date.now() < until
}

export interface UserProvider {
  provider: ProviderID
  key: string
  priority: number
}

export interface SelectedProvider {
  provider: LLMProvider
  key: string
}

/**
 * Picks the best available provider from the user's configured list.
 * Sorts by priority (ascending = higher priority), skips circuit-broken providers.
 */
export async function selectProvider(
  userProviders: UserProvider[],
  preferred?: ProviderID
): Promise<SelectedProvider | null> {
  const sorted = [...userProviders].sort((a, b) => a.priority - b.priority)

  // Try preferred first
  if (preferred) {
    const p = sorted.find((u) => u.provider === preferred)
    if (p && !isCircuitOpen(p.provider)) {
      return { provider: getProvider(p.provider), key: p.key }
    }
  }

  for (const { provider: id, key } of sorted) {
    if (isCircuitOpen(id)) continue
    return { provider: getProvider(id), key }
  }

  return null
}
