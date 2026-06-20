"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "adam.byok.v1";

export interface ByokKeys {
  readonly anthropicKey: string;
  readonly githubToken: string;
}

type State =
  | { readonly status: "loading"; readonly keys: null }
  | { readonly status: "missing"; readonly keys: null }
  | { readonly status: "ready"; readonly keys: ByokKeys };

function read(): ByokKeys | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ByokKeys>;
    if (typeof parsed.anthropicKey !== "string" || typeof parsed.githubToken !== "string") {
      return null;
    }
    if (!parsed.anthropicKey || !parsed.githubToken) return null;
    return { anthropicKey: parsed.anthropicKey, githubToken: parsed.githubToken };
  } catch {
    return null;
  }
}

/**
 * Stores Anthropic + GitHub credentials in localStorage so the chat UI can
 * forward them as per-session headers to the shared adam deployment.
 *
 * These never leave the user's browser except as headers on session requests.
 */
export function useByokKeys() {
  const [state, setState] = useState<State>({ status: "loading", keys: null });

  useEffect(() => {
    const keys = read();
    setState(keys ? { status: "ready", keys } : { status: "missing", keys: null });
  }, []);

  const save = useCallback((keys: ByokKeys) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
    setState({ status: "ready", keys });
  }, []);

  const clear = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setState({ status: "missing", keys: null });
  }, []);

  return { state, save, clear };
}
