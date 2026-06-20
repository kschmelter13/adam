'use client'

import { useEveAgent } from 'eve/react'
import { useState, type FormEvent } from 'react'

export default function Page() {
  const agent = useEveAgent()
  const [draft, setDraft] = useState('')
  const isBusy = agent.status === 'submitted' || agent.status === 'streaming'
  const isEmpty = agent.data.messages.length === 0

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || isBusy) return
    setDraft('')
    await agent.send({ message: text })
  }

  return (
    <main className="page">
      <header className="head">
        <h1>adam</h1>
        <p>an Eve agent that builds Eve agents</p>
      </header>

      <section className="thread">
        {isEmpty ? (
          <div className="empty">
            <p>Describe an Eve agent. I&apos;ll write it, sanity-check it, and deploy it to your Vercel.</p>
            <ul>
              <li>&quot;Build me a Slack bot that summarizes my GitHub commits.&quot;</li>
              <li>&quot;Make an agent that posts a daily weather report.&quot;</li>
              <li>&quot;Write me an HTTP agent that converts markdown to PDF.&quot;</li>
            </ul>
          </div>
        ) : (
          agent.data.messages.map((message) => (
            <article key={message.id} className={`msg ${message.role}`}>
              <div className="role">{message.role}</div>
              <div className="body">
                {message.parts?.map((part, i) =>
                  part.type === 'text' ? <span key={i}>{part.text}</span> : null,
                )}
              </div>
            </article>
          ))
        )}
        {agent.error ? <div className="error">⚠ {agent.error.message}</div> : null}
      </section>

      <form className="composer" onSubmit={handleSubmit}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Tell adam what to build…"
          rows={2}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void handleSubmit(e as unknown as FormEvent)
            }
          }}
        />
        <button type="submit" disabled={isBusy || !draft.trim()}>
          {isBusy ? 'thinking…' : 'send'}
        </button>
      </form>
    </main>
  )
}
