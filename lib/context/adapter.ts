import { type NormalizedMessage } from '../providers/index'

export interface DBMessage {
  role: string
  content: string
  model_used: string | null
  sequence_num: number
  is_summary: boolean
  summary_range: number[] | null
}

export function toNormalized(dbMessages: DBMessage[]): NormalizedMessage[] {
  return dbMessages
    .sort((a, b) => a.sequence_num - b.sequence_num)
    .map((m) => ({
      role: m.role as NormalizedMessage['role'],
      content: m.content,
    }))
}
