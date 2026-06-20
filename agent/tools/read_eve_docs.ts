import { defineTool } from 'eve/tools'
import { never } from 'eve/tools/approval'
import { z } from 'zod'

const BASE = 'https://eve.dev/docs'

export default defineTool({
  needsApproval: never(),
  description:
    'Fetch a page from the live Eve framework documentation at https://eve.dev/docs/* and return its text content. Use this whenever you need accurate, current Eve API details — package names, function signatures, file conventions, defineX shapes, channel auth helpers, sandbox APIs. Pass an empty string for `path` to get the docs root.',
  inputSchema: z.object({
    path: z
      .string()
      .describe(
        'Docs path relative to https://eve.dev/docs/ — e.g. "getting-started", "tutorial/first-agent", "sandbox", "concepts". Leading slash and trailing slash optional. Empty string fetches the docs index.',
      ),
  }),
  async execute({ path }) {
    const cleanPath = path
      .replace(/^\/+/, '')
      .replace(/\/+$/, '')
      .replace(/\.md$/, '')
    const url = cleanPath ? `${BASE}/${cleanPath}` : BASE

    try {
      const res = await fetch(url, {
        headers: { 'user-agent': 'adam-eve-builder/1.0' },
        redirect: 'follow',
      })
      if (!res.ok) {
        return { ok: false as const, url, status: res.status, error: `${url} returned HTTP ${res.status}` }
      }
      const html = await res.text()
      const content = htmlToText(html)
      const finalUrl = res.url
      return { ok: true as const, url: finalUrl, content }
    } catch (err) {
      return { ok: false as const, url, error: err instanceof Error ? err.message : String(err) }
    }
  },
})

function htmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/pre>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
