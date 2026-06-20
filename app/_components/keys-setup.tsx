"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ByokKeys } from "./use-byok-keys";

export function KeysSetup({
  initial,
  onSave,
  onCancel,
}: {
  readonly initial?: ByokKeys;
  readonly onSave: (keys: ByokKeys) => void;
  readonly onCancel?: () => void;
}) {
  const [anthropicKey, setAnthropicKey] = useState(initial?.anthropicKey ?? "");
  const [githubToken, setGithubToken] = useState(initial?.githubToken ?? "");

  const canSave = anthropicKey.startsWith("sk-ant-") && githubToken.length > 10;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSave) return;
    onSave({ anthropicKey: anthropicKey.trim(), githubToken: githubToken.trim() });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-8 shadow-sm"
      >
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">adam</h1>
          <p className="text-sm text-muted-foreground">
            An Eve agent that builds Eve agents. Paste your keys to start — they're stored only in
            your browser and sent as headers to this deployment, never persisted server-side.
          </p>
        </header>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="anthropic" className="text-sm font-medium">
              Anthropic API key
            </label>
            <Input
              id="anthropic"
              type="password"
              autoComplete="off"
              placeholder="sk-ant-…"
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noreferrer noopener"
                className="underline underline-offset-2 hover:text-foreground"
              >
                console.anthropic.com/settings/keys
              </a>{" "}
              — powers adam's reasoning.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="github" className="text-sm font-medium">
              GitHub token
            </label>
            <Input
              id="github"
              type="password"
              autoComplete="off"
              placeholder="ghp_… or github_pat_…"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noreferrer noopener"
                className="underline underline-offset-2 hover:text-foreground"
              >
                github.com/settings/tokens
              </a>{" "}
              — `repo` scope. Adam creates a repo per agent it builds.
            </p>
          </div>
        </div>

        <div className={cn("flex gap-2", onCancel ? "justify-between" : "justify-end")}>
          {onCancel ? (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
          <Button type="submit" disabled={!canSave}>
            {initial ? "Update keys" : "Start building"}
          </Button>
        </div>
      </form>
    </div>
  );
}
