import { defineAgent } from 'eve'
import { dynamicAnthropic } from '../lib/dynamic-anthropic.js'

export default defineAgent({
  model: dynamicAnthropic,
  modelContextWindowTokens: 200_000,
  compaction: { thresholdPercent: 0.75 },
})
