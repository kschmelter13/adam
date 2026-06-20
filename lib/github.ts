const API = 'https://api.github.com'

/**
 * Resolves the GitHub token to use for this turn. Per-session header
 * (shared-deployment BYOK) wins; deployer-wide env var is the fallback for
 * personal deployments.
 */
export function resolveGithubToken(
  sessionAuth?: {
    attributes?: Readonly<Record<string, string | readonly string[]>>
  } | null,
): string | null {
  const fromSession = sessionAuth?.attributes?.githubToken
  if (typeof fromSession === 'string' && fromSession.length > 0) return fromSession
  return process.env.GITHUB_TOKEN ?? null
}

export const MISSING_GITHUB_TOKEN_ERROR =
  'GitHub token missing — pass `x-github-token` header on this session, or set GITHUB_TOKEN on the deployment.'

export type Repo = {
  owner: string
  name: string
  htmlUrl: string
  cloneUrl: string
  defaultBranch: string
}

async function gh<T>(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.headers as Record<string, string> | undefined),
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GitHub ${init.method ?? 'GET'} ${path} ${res.status}: ${body.slice(0, 500)}`)
  }
  return (await res.json()) as T
}

export async function getAuthenticatedUser(token: string): Promise<{ login: string }> {
  return await gh<{ login: string }>(token, '/user')
}

export async function repoExists(
  token: string,
  owner: string,
  name: string,
): Promise<boolean> {
  const res = await fetch(`${API}/repos/${owner}/${name}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  })
  return res.status === 200
}

export async function getRepo(
  token: string,
  owner: string,
  name: string,
): Promise<Repo> {
  const r = await gh<{
    owner: { login: string }
    name: string
    html_url: string
    clone_url: string
    default_branch: string
  }>(token, `/repos/${owner}/${name}`)
  return {
    owner: r.owner.login,
    name: r.name,
    htmlUrl: r.html_url,
    cloneUrl: r.clone_url,
    defaultBranch: r.default_branch || 'main',
  }
}

export async function createRepo(opts: {
  token: string
  name: string
  description?: string
  private?: boolean
}): Promise<Repo> {
  const r = await gh<{
    owner: { login: string }
    name: string
    html_url: string
    clone_url: string
    default_branch: string
  }>(opts.token, '/user/repos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: opts.name,
      description: opts.description ?? '',
      private: opts.private ?? true,
      auto_init: true,
    }),
  })
  return {
    owner: r.owner.login,
    name: r.name,
    htmlUrl: r.html_url,
    cloneUrl: r.clone_url,
    defaultBranch: r.default_branch || 'main',
  }
}

export function authenticatedCloneUrl(
  token: string,
  owner: string,
  name: string,
): string {
  return `https://x-access-token:${token}@github.com/${owner}/${name}.git`
}
