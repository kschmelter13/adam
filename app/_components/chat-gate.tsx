"use client";

import { useState } from "react";
import { AgentChat } from "./agent-chat";
import { KeysSetup } from "./keys-setup";
import { useByokKeys } from "./use-byok-keys";

/**
 * Decides whether to show the keys-setup screen or the chat. Owns the
 * "edit keys" lifecycle: a button in the chat header opens this back up
 * with the current keys pre-filled.
 */
export function ChatGate() {
  const { state, save, clear } = useByokKeys();
  const [editing, setEditing] = useState(false);

  if (state.status === "loading") {
    return <div className="min-h-screen bg-background" aria-hidden />;
  }

  if (state.status === "missing") {
    return <KeysSetup onSave={save} />;
  }

  if (editing) {
    return (
      <KeysSetup
        initial={state.keys}
        onSave={(keys) => {
          save(keys);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return <AgentChat keys={state.keys} onEditKeys={() => setEditing(true)} onClearKeys={clear} />;
}
