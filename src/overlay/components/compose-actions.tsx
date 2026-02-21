import { useCallback, useEffect, useState } from "react";

const COMPOSE_ACTIONS = [
  {
    label: "5 Alternatives",
    instruction:
      "polish this and give me 5 different versions with different tones",
    primary: true,
  },
  {
    label: "Polish",
    instruction: "polish this draft, make it sharper and more engaging",
    primary: false,
  },
  {
    label: "Get Feedback",
    instruction:
      "give me feedback on this draft. what works, what could be better",
    primary: false,
  },
  {
    label: "Fix Grammar",
    instruction: "fix any grammar or spelling issues, keep my voice",
    primary: false,
  },
];

interface ComposeActionsProps {
  isStreaming: boolean;
  onAction: (text: string) => void;
}

export function ComposeActions({ onAction, isStreaming }: ComposeActionsProps) {
  const [composeText, setComposeText] = useState("");

  const poll = useCallback(async () => {
    const text = await window.electronAPI.extractComposeText();
    setComposeText(text);
  }, []);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 1000);
    return () => clearInterval(interval);
  }, [poll]);

  if (!composeText || isStreaming) {
    return null;
  }

  return (
    <div className="compose-actions">
      {COMPOSE_ACTIONS.map((a) => (
        <button
          className={a.primary ? "btn-pill btn-pill-primary" : "btn-pill"}
          key={a.label}
          onClick={() => onAction(`${a.instruction}\n\n${composeText}`)}
          type="button"
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}
