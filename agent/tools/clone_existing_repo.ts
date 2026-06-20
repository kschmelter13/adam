import { defineTool } from 'eve/tools'
import { z } from 'zod'
import {
  authenticatedCloneUrl,
  getRepo,
  MISSING_GITHUB_TOKEN_ERROR,
  resolveGithubToken,
} from '../../lib/github.js'

export default defineTool({
  description:
    "Clone an existing GitHub repo into the sandbox to continue working on it across sessions. Use this at the start of a session if the user references a project they previously built — adam pulls the repo, then edits and pushes via sync_to_repo. Returns the directory where the repo was cloned.",
  inputSchema: z.object({
    repoOwner: z.string().describe('GitHub user/org that owns the repo.'),
    repoName: z.string().describe('GitHub repo name.'),
    targetDir: z
      .string()
      .optional()
      .default('.')
      .describe('Directory in the sandbox to clone into. Defaults to sandbox root.'),
  }),
  async execute({ repoOwner, repoName, targetDir }, ctx) {
    const ghToken = resolveGithubToken(ctx.session.auth.current)
    if (!ghToken) return { ok: false as const, error: MISSING_GITHUB_TOKEN_ERROR }

    try {
      await getRepo(ghToken, repoOwner, repoName)
    } catch {
      return {
        ok: false as const,
        error: `Repo ${repoOwner}/${repoName} not found or token lacks access.`,
      }
    }

    const sandbox = await ctx.getSandbox()
    const dir = JSON.stringify(targetDir)
    const remoteUrl = authenticatedCloneUrl(ghToken, repoOwner, repoName)

    const clone = await sandbox.run({
      command: `mkdir -p ${dir} && cd ${dir} && git clone ${JSON.stringify(remoteUrl)} .`,
    })
    if (clone.exitCode !== 0) {
      return { ok: false as const, error: `git clone failed: ${clone.stderr.slice(0, 500)}` }
    }

    const setRemote = await sandbox.run({
      command: `cd ${dir} && git remote set-url origin ${JSON.stringify(remoteUrl)} && git config user.email "adam@noreply.eve.dev" && git config user.name "adam"`,
    })
    if (setRemote.exitCode !== 0) {
      return { ok: false as const, error: `git config failed: ${setRemote.stderr}` }
    }

    const listing = await sandbox.run({
      command: `cd ${dir} && ls -la && echo '---' && git log --oneline -10`,
    })

    return {
      ok: true as const,
      dir: targetDir,
      repoUrl: `https://github.com/${repoOwner}/${repoName}`,
      snapshot: listing.stdout.slice(0, 4000),
    }
  },
})
