import { type ProviderID } from '@/lib/providers/index'

interface Props {
  value: ProviderID | 'auto'
  onChange: (v: ProviderID | 'auto') => void
  availableProviders: ProviderID[]
}

const LABELS: Record<ProviderID | 'auto', string> = {
  auto: 'Auto',
  openai: 'GPT-4o',
  anthropic: 'Claude',
  gemini: 'Gemini',
  grok: 'Grok',
  groq: 'Groq',
  cerebras: 'Cerebras',
}

export default function ModelPicker({ value, onChange, availableProviders }: Props) {
  const options: (ProviderID | 'auto')[] = ['auto', ...availableProviders]

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ProviderID | 'auto')}
      className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-400 transition-colors"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {LABELS[o]}
        </option>
      ))}
    </select>
  )
}
