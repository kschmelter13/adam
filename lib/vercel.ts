import { createHash } from 'node:crypto'

const API = 'https://api.vercel.com'

export type DeployFile = { path: string; data: Uint8Array }

export type DeployResult = {
  id: string
  url: string
  inspectorUrl: string
}

export type DeployOptions = {
  name: string
  token: string
  teamId?: string
  files: DeployFile[]
  projectSettings?: {
    framework?: string | null
    buildCommand?: string | null
    installCommand?: string | null
    outputDirectory?: string | null
  }
  env?: Record<string, string>
  target?: 'production' | 'preview'
}

export async function deployToVercel(opts: DeployOptions): Promise<DeployResult> {
  const { name, token, teamId, files, projectSettings, env, target = 'preview' } = opts
  const teamQuery = teamId ? `?teamId=${encodeURIComponent(teamId)}` : ''

  const manifest = files.map((f) => {
    const sha = createHash('sha1').update(f.data).digest('hex')
    return { file: f.path, sha, size: f.data.byteLength, data: f.data }
  })

  for (const f of manifest) {
    const res = await fetch(`${API}/v2/files${teamQuery}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'x-vercel-digest': f.sha,
      },
      body: new Uint8Array(f.data),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`file upload failed (${res.status}) for ${f.file}: ${body}`)
    }
  }

  const deployRes = await fetch(`${API}/v13/deployments${teamQuery}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      files: manifest.map(({ file, sha, size }) => ({ file, sha, size })),
      target,
      projectSettings: projectSettings ?? { framework: null },
      env,
    }),
  })

  if (!deployRes.ok) {
    const body = await deployRes.text()
    throw new Error(`deployment create failed (${deployRes.status}): ${body}`)
  }

  const body = (await deployRes.json()) as {
    id: string
    url: string
    inspectorUrl?: string
  }

  return {
    id: body.id,
    url: body.url.startsWith('http') ? body.url : `https://${body.url}`,
    inspectorUrl: body.inspectorUrl ?? '',
  }
}

export type VercelProject = {
  id: string
  name: string
  accountId: string
  url: string
}

export async function getProject(opts: {
  token: string
  teamId?: string
  idOrName: string
}): Promise<VercelProject | null> {
  const teamQuery = opts.teamId ? `?teamId=${encodeURIComponent(opts.teamId)}` : ''
  const res = await fetch(`${API}/v9/projects/${encodeURIComponent(opts.idOrName)}${teamQuery}`, {
    headers: { Authorization: `Bearer ${opts.token}` },
  })
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(`getProject ${res.status}: ${(await res.text()).slice(0, 500)}`)
  }
  const body = (await res.json()) as { id: string; name: string; accountId: string }
  return {
    id: body.id,
    name: body.name,
    accountId: body.accountId,
    url: `https://${body.name}.vercel.app`,
  }
}

export async function createProjectFromGit(opts: {
  token: string
  teamId?: string
  name: string
  repoOwner: string
  repoName: string
  framework?: string | null
  env?: Record<string, string>
}): Promise<VercelProject> {
  const teamQuery = opts.teamId ? `?teamId=${encodeURIComponent(opts.teamId)}` : ''
  const envEntries = Object.entries(opts.env ?? {}).map(([key, value]) => ({
    key,
    value,
    target: ['production', 'preview', 'development'],
    type: 'encrypted' as const,
  }))
  const res = await fetch(`${API}/v10/projects${teamQuery}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: opts.name,
      framework: opts.framework ?? 'nextjs',
      gitRepository: {
        type: 'github',
        repo: `${opts.repoOwner}/${opts.repoName}`,
      },
      environmentVariables: envEntries,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`createProjectFromGit ${res.status}: ${body.slice(0, 800)}`)
  }
  const body = (await res.json()) as { id: string; name: string; accountId: string }
  return {
    id: body.id,
    name: body.name,
    accountId: body.accountId,
    url: `https://${body.name}.vercel.app`,
  }
}

export async function setProjectEnv(opts: {
  token: string
  teamId?: string
  projectId: string
  env: Record<string, string>
}): Promise<void> {
  const teamQuery = opts.teamId ? `?teamId=${encodeURIComponent(opts.teamId)}` : ''
  for (const [key, value] of Object.entries(opts.env)) {
    const res = await fetch(
      `${API}/v10/projects/${opts.projectId}/env${teamQuery}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${opts.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key,
          value,
          target: ['production', 'preview', 'development'],
          type: 'encrypted',
        }),
      },
    )
    if (!res.ok && res.status !== 409) {
      throw new Error(`setProjectEnv ${key} ${res.status}: ${(await res.text()).slice(0, 500)}`)
    }
  }
}
