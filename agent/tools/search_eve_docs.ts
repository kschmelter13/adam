import { defineTool } from 'eve/tools'
import { never } from 'eve/tools/approval'
import { z } from 'zod'

const LLMS_TXT = 'https://eve.dev/llms.txt'

type Section = {
  title: string
  description?: string
  body: string
}

export default defineTool({
  needsApproval: never(),
  description:
    'Search the live Eve framework documentation (https://eve.dev/llms.txt). Pass a query like "defineChannel", "sandbox.readTextFile", "compaction" — returns matching doc sections in full. Pass an empty string to get the table of contents (every section title + description).',
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        'Search term. Matches against section titles, descriptions, and body content (case-insensitive). Empty string returns the table of contents.',
      ),
  }),
  async execute({ query }) {
    const res = await fetch(LLMS_TXT)
    if (!res.ok) {
      return { ok: false as const, error: `${LLMS_TXT} returned HTTP ${res.status}` }
    }
    const text = await res.text()
    const sections = parseSections(text)

    const trimmed = query.trim()
    if (!trimmed) {
      return {
        ok: true as const,
        mode: 'toc' as const,
        sectionCount: sections.length,
        toc: sections.map((s) => ({ title: s.title, description: s.description ?? null })),
      }
    }

    const q = trimmed.toLowerCase()
    const matches = sections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.description?.toLowerCase().includes(q) ?? false) ||
        s.body.toLowerCase().includes(q),
    )
    return {
      ok: true as const,
      mode: 'search' as const,
      query: trimmed,
      matchCount: matches.length,
      sections: matches,
    }
  },
})

function parseSections(text: string): Section[] {
  const sections: Section[] = []
  const parts = text.split(/^---\s*$/m)
  for (let i = 1; i < parts.length; i += 2) {
    const frontmatter = parts[i] ?? ''
    const body = (parts[i + 1] ?? '').trim()
    const title = frontmatter.match(/^title:\s*(.+?)\s*$/m)?.[1]
    if (!title) continue
    const description = frontmatter.match(/^description:\s*(.+?)\s*$/m)?.[1]
    sections.push({ title, description, body })
  }
  return sections
}
