import { defineTool } from 'eve/tools'
import { z } from 'zod'
import { deployToVercel } from '../../lib/vercel.js'

export default defineTool({
  description:
    "Deploy the current sandbox contents to the user's Vercel account. Uploads every file (excluding node_modules and .git), creates a deployment, and returns the live URL. Call this only when the project is ready (package.json present, files written).",
  inputSchema: z.object({
    projectName: z
      .string()
      .regex(/^[a-z0-9][a-z0-9-]*$/, 'lowercase alphanumeric and hyphens')
      .max(52)
      .describe('Project name on Vercel (lowercase, hyphens, max 52 chars)'),
    rootDir: z
      .string()
      .optional()
      .default('.')
      .describe('Subdirectory of the sandbox to upload. Defaults to the sandbox root.'),
    env: z
      .record(z.string())
      .optional()
      .describe('Env vars set on the deployment (e.g. ANTHROPIC_API_KEY for the agent being deployed)'),
    target: z.enum(['preview', 'production']).optional().default('preview'),
  }),
  async execute({ projectName, rootDir, env, target }, ctx) {
    const token = process.env.VERCEL_TOKEN
    if (!token) return { ok: false as const, error: 'VERCEL_TOKEN missing from environment' }
    const teamId = process.env.VERCEL_TEAM_ID || undefined

    const sandbox = await ctx.getSandbox()

    const findCmd = `cd ${JSON.stringify(rootDir)} && find . -type f -not -path './node_modules/*' -not -path './.git/*' -not -path './.next/*' -not -path './dist/*'`
    const listing = await sandbox.run({ command: findCmd })
    if (listing.exitCode !== 0) {
      return { ok: false as const, error: `failed to list sandbox files: ${listing.stderr}` }
    }

    const relPaths = listing.stdout
      .split('\n')
      .map((p) => p.trim().replace(/^\.\//, ''))
      .filter(Boolean)

    const files: { path: string; data: Buffer }[] = []
    for (const p of relPaths) {
      const abs = `${rootDir.replace(/\/$/, '')}/${p}`
      const res = await sandbox.readBinaryFile({ path: abs })
      files.push({ path: p, data: Buffer.from(res.content) })
    }

    try {
      const result = await deployToVercel({
        name: projectName,
        token,
        teamId,
        files,
        env,
        target,
      })
      return { ok: true as const, ...result, fileCount: files.length }
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : String(err) }
    }
  },
})
