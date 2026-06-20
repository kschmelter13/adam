import { defineTool } from 'eve/tools'
import { z } from 'zod'
import {
  authenticatedCloneUrl,
  MISSING_GITHUB_TOKEN_ERROR,
  resolveGithubToken,
} from '../../lib/github.js'

export default defineTool({
  description:
    "Commit the current sandbox contents and push to the linked GitHub repo. Vercel auto-deploys on push. Use this after writing files and before telling the user the agent is shipped. If this is the first push (no .git in the sandbox), it initializes the repo too. Returns the deployment URL once Vercel responds.",
  inputSchema: z.object({
    repoOwner: z.string().describe('GitHub user/org that owns the repo (from init_project).'),
    repoName: z.string().describe('GitHub repo name (from init_project).'),
    rootDir: z
      .string()
      .optional()
      .default('.')
      .describe('Subdirectory of the sandbox to sync. Defaults to sandbox root.'),
    message: z
      .string()
      .min(1)
      .max(500)
      .describe('Commit message. Be specific — describes what changed this push.'),
    branch: z
      .string()
      .optional()
      .default('main')
      .describe('Branch to push to. Defaults to main.'),
  }),
  async execute({ repoOwner, repoName, rootDir, message, branch }, ctx) {
    const ghToken = resolveGithubToken(ctx.session.auth.current)
    if (!ghToken) return { ok: false as const, error: MISSING_GITHUB_TOKEN_ERROR }

    const sandbox = await ctx.getSandbox()
    const dir = JSON.stringify(rootDir)
    const remoteUrl = authenticatedCloneUrl(ghToken, repoOwner, repoName)

    const check = await sandbox.run({ command: `cd ${dir} && test -d .git && echo yes || echo no` })
    const isInitialized = check.stdout.trim() === 'yes'

    if (!isInitialized) {
      const init = await sandbox.run({
        command: [
          `cd ${dir}`,
          `git init -b ${branch}`,
          `git config user.email "adam@noreply.eve.dev"`,
          `git config user.name "adam"`,
          `git remote add origin ${JSON.stringify(remoteUrl)}`,
          `git fetch origin ${branch} || true`,
          `git reset --soft origin/${branch} 2>/dev/null || true`,
        ].join(' && '),
      })
      if (init.exitCode !== 0) {
        return { ok: false as const, error: `git init failed: ${init.stderr}` }
      }
    } else {
      const setRemote = await sandbox.run({
        command: `cd ${dir} && git remote set-url origin ${JSON.stringify(remoteUrl)}`,
      })
      if (setRemote.exitCode !== 0) {
        return { ok: false as const, error: `git remote set-url failed: ${setRemote.stderr}` }
      }
    }

    const status = await sandbox.run({
      command: `cd ${dir} && git add -A && git diff --cached --quiet && echo clean || echo dirty`,
    })
    if (status.stdout.includes('clean')) {
      return {
        ok: true as const,
        sha: null,
        message: 'no changes to commit',
        repoUrl: `https://github.com/${repoOwner}/${repoName}`,
      }
    }

    const commit = await sandbox.run({
      command: `cd ${dir} && git commit -m ${JSON.stringify(message)}`,
    })
    if (commit.exitCode !== 0) {
      return { ok: false as const, error: `git commit failed: ${commit.stderr}` }
    }

    const push = await sandbox.run({
      command: `cd ${dir} && git push -u origin ${branch}`,
    })
    if (push.exitCode !== 0) {
      return {
        ok: false as const,
        error: `git push failed: ${push.stderr.slice(0, 500)}`,
      }
    }

    const sha = await sandbox.run({ command: `cd ${dir} && git rev-parse HEAD` })

    return {
      ok: true as const,
      sha: sha.stdout.trim(),
      repoUrl: `https://github.com/${repoOwner}/${repoName}`,
      deploymentNote:
        'Vercel auto-deploys on push. Build typically takes 30-90s. The user can watch it in their Vercel dashboard or hit the project URL once ready.',
    }
  },
})
