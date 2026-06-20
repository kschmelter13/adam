# adam

An Eve agent that builds Eve agents and ships them to your Vercel — via your own GitHub.

Built on [Vercel Eve](https://vercel.com/docs/eve). Talk to adam, describe the agent you want. Adam creates a GitHub repo in your account and pushes the code. You click a one-time Vercel import link. Every subsequent push auto-deploys.

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fkschmelter13%2Fadam&env=ANTHROPIC_API_KEY,GITHUB_TOKEN&envDescription=ANTHROPIC_API_KEY+powers+adam%27s+reasoning.+GITHUB_TOKEN+lets+adam+create+repos+in+your+account+for+the+agents+it+builds.&envLink=https%3A%2F%2Fgithub.com%2Fkschmelter13%2Fadam%23env-vars&project-name=adam)

Click the button. Fill in two env vars. Done.

### Env vars

| Name | Where it comes from |
|---|---|
| `ANTHROPIC_API_KEY` | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) |
| `GITHUB_TOKEN` | [github.com/settings/tokens](https://github.com/settings/tokens) — a PAT with `repo` scope (classic) or fine-grained with **Contents RW + Administration RW + Metadata read**. Adam uses this to create the repo for each agent it builds and push code into it. |

That's it. No Vercel token needed — you import each new agent's repo into Vercel with one click via the link adam gives you.

## Use it

1. Open `https://your-deployment.vercel.app` after the install completes
2. Describe the agent you want
3. Adam scaffolds the project, creates a GitHub repo in your account, pushes
4. Adam gives you a Vercel import deeplink — click it once, pick your team, paste any env vars the new agent needs, hit Deploy
5. Every subsequent push to that repo auto-deploys. You can close the tab and come back — adam can pick up where it left off by cloning the repo back into its sandbox

## How it works

```
agent/
├── agent.ts                  Eve agent: model + identity
├── instructions.md           system prompt
└── tools/
    ├── init_project          creates github repo + returns vercel import url
    ├── sync_to_repo          commits sandbox state + pushes (triggers deploy)
    ├── clone_existing_repo   clones a prior repo back into sandbox for iteration
    └── search_eve_docs       live lookup against eve.dev docs
lib/
└── github.ts                 GitHub API client
```

Each agent adam builds gets its own repo in your GitHub. After the one-time Vercel import, every git push auto-deploys. Close the tab, come back, adam clones the repo and keeps going.

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
