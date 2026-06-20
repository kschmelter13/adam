import { anthropic } from '@ai-sdk/anthropic'
import { defineAgent } from 'eve'

export default defineAgent({
  model: anthropic('claude-opus-4-8'),
  compaction: { thresholdPercent: 0.75 },
})
