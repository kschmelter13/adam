import { defineTool } from 'eve/tools'
import { z } from 'zod'
import {
  createRepo,
  getAuthenticatedUser,
  getRepo,
  repoExists,
} from '../../lib/github.js'

export default defineTool({
  description:
    "Create a GitHub repo for a new agent. Returns the repo URL plus a one-click Vercel import deeplink the user clicks once to set up auto-deploy. Use this as the FIRST step when starting a new agent. Pick a short kebab-case name. Defaults to a private repo. Remember the repoOwner + repoName for subsequent sync_to_repo calls.",
  inputSchema: z.object({
    projectName: z
      .string()
      .regex(/^[a-z0-9][a-z0-9-]*$/, 'lowercase alphanumeric and hyphens')
      .max(52)
      .describe('Short kebab-case name. Used as the GitHub repo name.'),
    description: z
      .string()
      .optional()
      .describe('One-line description of what the agent does. Stored on the repo.'),
    isPrivate: z
      .boolean()
      .optional()
      .default(true)
      .describe('Repo visibility. Defaults to private.'),
    requiredEnvVars: z
      .array(z.string())
      .optional()
      .default([])
      .describe('Env var names the built agent needs at runtime (e.g. ["ANTHROPIC_API_KEY"]). The user pastes these at Vercel import time.'),
  }),
  async execute({ projectName, description, isPrivate, requiredEnvVars }) {
    const ghToken = process.env.GITHUB_TOKEN
    if (!ghToken) {
      return {
        ok: false as const,
        error:
          'GITHUB_TOKEN missing — generate one at https://github.com/settings/tokens with `repo` scope and set it on this project.',
      }
    }

    try {
      const me = await getAuthenticatedUser(ghToken)
      const owner = me.login

      let repo
      let created: boolean
      if (await repoExists(ghToken, owner, projectName)) {
        repo = await getRepo(ghToken, owner, projectName)
        created = false
      } else {
        repo = await createRepo({
          token: ghToken,
          name: projectName,
          description,
          private: isPrivate,
        })
        created = true
      }

      const importUrl = buildVercelImportUrl({
        repoOwner: repo.owner,
        repoName: repo.name,
        projectName,
        envVars: requiredEnvVars,
      })

      return {
        ok: true as const,
        created,
        repo: {
          owner: repo.owner,
          name: repo.name,
          url: repo.htmlUrl,
          defaultBranch: repo.defaultBranch,
        },
        import: {
          url: importUrl,
          instructions: created
            ? `Click the URL, pick your Vercel team, paste any required env vars (${requiredEnvVars.join(', ') || 'none'}), click Deploy. After this one-time import, every git push to this repo will auto-deploy.`
            : `Repo already exists. If you've already imported it to Vercel, no action needed — sync_to_repo will trigger the next deploy. Otherwise click the import URL.`,
          requiredEnvVars,
        },
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (
        message.includes('Resource not accessible by personal access token') ||
        message.includes('Bad credentials')
      ) {
        return {
          ok: false as const,
          error:
            'GitHub token rejected. Ensure the PAT has `repo` scope (or fine-grained: Contents RW, Administration RW, Metadata read).',
        }
      }
      return { ok: false as const, error: message }
    }
  },
})

function buildVercelImportUrl(opts: {
  repoOwner: string
  repoName: string
  projectName: string
  envVars: readonly string[]
}): string {
  const params = new URLSearchParams({
    s: `https://github.com/${opts.repoOwner}/${opts.repoName}`,
    'project-name': opts.projectName,
  })
  if (opts.envVars.length > 0) {
    params.set('env', opts.envVars.join(','))
  }
  return `https://vercel.com/new?${params.toString()}`
}
