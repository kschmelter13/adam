import { createHash } from 'node:crypto'

const API = 'https://api.vercel.com'

export type DeployFile = { path: string; data: Buffer }

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
      body: f.data,
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
