# adam

An Eve agent that builds Eve agents and ships them to your Vercel.

Built on [Vercel Eve](https://vercel.com/docs/eve). Talk to adam, describe the agent you want, watch it scaffold the project, sanity-check it, and deploy.

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fkschmelter13%2Fadam&env=ANTHROPIC_API_KEY,VERCEL_TOKEN&envDescription=ANTHROPIC_API_KEY+powers+adam%27s+brain.+VERCEL_TOKEN+is+a+personal+access+token+adam+uses+to+deploy+the+agents+it+builds+to+your+account.&envLink=https%3A%2F%2Fgithub.com%2Fkschmelter13%2Fadam%23env-vars&project-name=adam)

Click the button. Fill in two env vars. Done.

### Env vars

| Name | Where it comes from |
|---|---|
| `ANTHROPIC_API_KEY` | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) |
| `VERCEL_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) — create a personal access token, give it full account scope |
| `VERCEL_TEAM_ID` (optional) | Set if you want adam to deploy into a specific team rather than your personal scope |

## Use it

Once deployed, your adam lives at `https://your-deployment.vercel.app`. Start a session:

```bash
curl -X POST https://your-deployment.vercel.app/eve/v1/session \
  -H 'content-type: application/json' \
  -d '{"message":"build me an Eve agent that posts a daily summary of my GitHub activity to Slack"}'
```

The response includes a session id. Stream events:

```bash
curl https://your-deployment.vercel.app/eve/v1/session/<sessionId>/stream
```

When adam decides the project is ready, it calls `deploy_to_vercel` — you get a new live URL on your account.

## How it works

```
agent/
├── agent.ts              Eve agent: model + identity
├── instructions.md       system prompt — what adam knows about Eve
└── tools/
    └── deploy_to_vercel  reads sandbox files, uploads to Vercel, returns URL
lib/
└── vercel.ts             Vercel deployments API client
```

Adam writes Eve agents into its sandbox using Eve's built-in `bash`, `read_file`, and `write_file` tools, then deploys via the Vercel API using your token.

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
