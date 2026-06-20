import { anthropic, createAnthropic } from '@ai-sdk/anthropic'
import type { LanguageModel } from 'ai'
import { userAnthropicKey } from '../agent/state/user-key.js'

const MODEL_ID = 'claude-opus-4-8'

/**
 * Per-session BYOK Anthropic model. A Proxy over a template LanguageModel
 * that intercepts doGenerate/doStream and constructs a fresh Anthropic
 * provider per call with the API key pulled from session-scoped defineState.
 *
 * Why a Proxy and not a plain object: AI SDK LanguageModels are class
 * instances; methods aren't enumerable so a spread would lose them. Proxy
 * delegates everything (static fields, optional methods, future additions)
 * to the template and only swaps in the two method overrides.
 */
const templateModel = anthropic(MODEL_ID)

export const dynamicAnthropic: LanguageModel = new Proxy(templateModel, {
  get(target, prop, receiver) {
    if (prop === 'doGenerate' || prop === 'doStream') {
      return (opts: unknown) => {
        const key = userAnthropicKey.get()
        if (!key) {
          throw new Error(
            'adam: no per-session Anthropic key. Set the `x-anthropic-api-key` header on your session request.',
          )
        }
        const fresh = createAnthropic({ apiKey: key })(MODEL_ID) as unknown as Record<
          string,
          (opts: unknown) => unknown
        >
        return fresh[prop as 'doGenerate' | 'doStream'](opts)
      }
    }
    return Reflect.get(target, prop, receiver)
  },
}) as LanguageModel
