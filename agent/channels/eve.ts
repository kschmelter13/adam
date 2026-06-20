import { eveChannel } from 'eve/channels/eve'
import { type AuthFn, localDev, none, vercelOidc } from 'eve/channels/auth'
import type { SessionAuthContext } from 'eve/context'

/**
 * Auth verifier that pulls a per-request Anthropic API key out of the
 * `x-anthropic-api-key` header and stows it in SessionAuthContext.attributes.
 *
 * The `session.started` hook later copies it into a defineState slot so the
 * custom LanguageModel can read it on every doStream/doGenerate call.
 *
 * Returns null when the header is absent so the next auth strategy can run.
 */
function byokHeader(): AuthFn<Request> {
  return (request) => {
    const anthropicKey = request.headers.get('x-anthropic-api-key')
    const githubToken = request.headers.get('x-github-token')
    if (!anthropicKey && !githubToken) return null

    const attributes: Record<string, string> = {}
    if (anthropicKey) attributes.anthropicKey = anthropicKey
    if (githubToken) attributes.githubToken = githubToken

    const sessionAuth: SessionAuthContext = {
      authenticator: 'byok-header',
      principalId: 'byok-user',
      principalType: 'byok',
      attributes,
    }
    return sessionAuth
  }
}

export default eveChannel({
  auth: [byokHeader(), localDev(), vercelOidc(), none()],
})
