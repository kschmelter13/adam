import { defineTool } from 'eve/tools'
import { z } from 'zod'
import {
  createRepo,
  getAuthenticatedUser,
  getRepo,
  repoExists,
} from '../../lib/github.js'
import { createProjectFromGit, getProject } from '../../lib/vercel.js'

export default defineTool({
  description:
    "Create a GitHub repo for a new agent and link it to a Vercel project so every push auto-deploys. This is the FIRST step when starting a new agent. Use a short kebab-case name. The repo defaults to private. Returns the repo + Vercel project info — adam should remember these for subsequent sync_to_repo calls.",
  inputSchema: z.object({
    projectName: z
      .string()
      .regex(/^[a-z0-9][a-z0-9-]*$/, 'lowercase alphanumeric and hyphens')
      .max(52)
      .describe('Short kebab-case name. Used as both the GitHub repo name and the Vercel project name.'),
    description: z
      .string()
      .optional()
      .describe('One-line description of what the agent does. Stored on both the repo and the Vercel project.'),
    isPrivate: z
      .boolean()
      .optional()
      .default(true)
      .describe('Repo visibility. Defaults to private.'),
    env: z
      .record(z.string(), z.string())
      .optional()
      .describe('Env vars set on the Vercel project (e.g. ANTHROPIC_API_KEY for the built agent at runtime).'),
  }),
  async execute({ projectName, description, isPrivate, env }) {
    const ghToken = process.env.GITHUB_TOKEN
    if (!ghToken) {
      return {
        ok: false as const,
        error:
          'GITHUB_TOKEN missing — generate one at https://github.com/settings/tokens with `repo` scope and set it on this project.',
      }
    }
    const vercelToken = process.env.ADAM_VERCEL_TOKEN
    if (!vercelToken) {
      return {
        ok: false as const,
        error:
          'ADAM_VERCEL_TOKEN missing — generate one at https://vercel.com/account/tokens and set it on this project.',
      }
    }
    const teamId = process.env.ADAM_VERCEL_TEAM_ID || undefined

    try {
      const me = await getAuthenticatedUser(ghToken)
      const owner = me.login

      let repo
      if (await repoExists(ghToken, owner, projectName)) {
        repo = await getRepo(ghToken, owner, projectName)
      } else {
        repo = await createRepo({
          token: ghToken,
          name: projectName,
          description,
          private: isPrivate,
        })
      }

      const existingProject = await getProject({
        token: vercelToken,
        teamId,
        idOrName: projectName,
      })

      const project =
        existingProject ??
        (await createProjectFromGit({
          token: vercelToken,
          teamId,
          name: projectName,
          repoOwner: repo.owner,
          repoName: repo.name,
          framework: 'nextjs',
          env,
        }))

      return {
        ok: true as const,
        repo: {
          owner: repo.owner,
          name: repo.name,
          url: repo.htmlUrl,
          defaultBranch: repo.defaultBranch,
        },
        project: {
          id: project.id,
          name: project.name,
          url: project.url,
          dashboardUrl: `https://vercel.com/dashboard/${project.name}`,
        },
        reused: {
          repo: repo.htmlUrl ? false : true,
          project: !!existingProject,
        },
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('Resource not accessible by personal access token') || message.includes('Bad credentials')) {
        return {
          ok: false as const,
          error:
            'GitHub token rejected. Ensure the PAT has `repo` scope (or fine-grained: Contents RW, Administration RW, Metadata read).',
        }
      }
      if (message.includes('not_found') && message.includes('gitRepository')) {
        return {
          ok: false as const,
          error:
            "Vercel can't see this GitHub repo — install Vercel's GitHub App in your account (https://vercel.com/dashboard → Integrations) and try again. Repo created; only the Vercel link failed.",
        }
      }
      return { ok: false as const, error: message }
    }
  },
})
