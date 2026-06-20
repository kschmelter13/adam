# adam

An Eve agent that builds Eve agents and ships them to your Vercel — via your own GitHub.

Built on [Vercel Eve](https://vercel.com/docs/eve). Talk to adam, describe the agent you want. Adam creates a GitHub repo in your account, scaffolds the project, pushes it, and Vercel auto-deploys.

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fkschmelter13%2Fadam&env=ANTHROPIC_API_KEY,ADAM_VERCEL_TOKEN,GITHUB_TOKEN&envDescription=ANTHROPIC_API_KEY+powers+adam%27s+reasoning.+ADAM_VERCEL_TOKEN++GITHUB_TOKEN+let+adam+create+repos+and+link+them+to+Vercel+projects+in+your+account.&envLink=https%3A%2F%2Fgithub.com%2Fkschmelter13%2Fadam%23env-vars&project-name=adam)

Click the button. Fill in three env vars. Done.

### Env vars

| Name | Where it comes from |
|---|---|
| `ANTHROPIC_API_KEY` | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) |
| `ADAM_VERCEL_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) — create a PAT with full account scope. Named `ADAM_*` so Vercel's deploy form doesn't auto-fill it with a non-functional placeholder. |
| `GITHUB_TOKEN` | [github.com/settings/tokens](https://github.com/settings/tokens) — a PAT with `repo` scope (classic) or fine-grained with **Contents RW + Administration RW + Metadata read**. Adam uses this to create the repo for each agent it builds and push code into it. |
| `ADAM_VERCEL_TEAM_ID` (optional) | Set if you want adam to deploy into a specific team rather than your personal scope |

**One-time setup:** install Vercel's GitHub App in your account ([vercel.com/dashboard → Integrations](https://vercel.com/dashboard)) so Vercel can read the repos adam creates. Without this, the auto-deploy link step fails and you'd have to import each repo manually.

## Use it

Once deployed, open `https://your-deployment.vercel.app` in a browser. There's a chat UI — describe the agent you want, adam scaffolds the project, creates a repo in your GitHub, and pushes. Vercel auto-deploys on push.

You own the repo. Adam can pick up where it left off next session — just tell it the repo name.

## How it works

```
agent/
├── agent.ts                 Eve agent: model + identity
├── instructions.md          system prompt
└── tools/
    ├── init_project        creates github repo + linked vercel project
    ├── sync_to_repo        commits sandbox state + pushes (triggers deploy)
    ├── clone_existing_repo clones a prior repo back into sandbox for iteration
    └── search_eve_docs     live lookup against eve.dev docs
lib/
├── github.ts                GitHub API client
└── vercel.ts                Vercel API client
```

Each agent adam builds gets its own repo in your GitHub and its own Vercel project linked to that repo. Push = deploy. Close the tab, come back, adam clones the repo and keeps going.

## Local dev

```bash
pnpm install
cp .env.example .env       # fill in keys
pnpm dev                   # eve dev server at :3000
```

Requires Node 24.x and pnpm.

## Why this exists

I wanted a faster loop for writing Eve agents. Adam writes them for me. You can probably use it for the same thing.

## License

MIT
