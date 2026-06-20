import { defineState } from 'eve/context'

/**
 * Per-session BYOK Anthropic API key. Populated by the session.started
 * hook from `ctx.session.auth.current.attributes.anthropicKey`, which the
 * channel auth verifier reads from the `x-anthropic-api-key` request header.
 *
 * Read inside the dynamic LanguageModel's doStream/doGenerate to bill the
 * correct user per request.
 */
export const userAnthropicKey = defineState<string | null>(
  'adam.user-anthropic-key',
  () => null,
)
