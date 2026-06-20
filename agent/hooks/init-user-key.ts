import { defineHook } from 'eve/hooks'
import { userAnthropicKey } from '../state/user-key.js'

/**
 * On every session start, copy the BYOK Anthropic key out of the
 * SessionAuthContext (populated by the channel's byokHeader auth verifier)
 * into the durable defineState slot. The dynamic LanguageModel reads from
 * that slot on every model call.
 */
export default defineHook({
  events: {
    'session.started': (_event, ctx) => {
      const attr = ctx.session.auth.current?.attributes?.anthropicKey
      if (typeof attr === 'string' && attr.length > 0) {
        userAnthropicKey.update(() => attr)
      }
    },
  },
})
