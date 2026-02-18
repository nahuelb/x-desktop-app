import { useCallback, useEffect, useRef, useState } from "react";
import type { ModelOption } from "../../shared/types";
import { useAnimatedPresence } from "../hooks/use-animated-presence";

export function ModelSelector() {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [currentModel, setCurrentModel] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const [settings, modelList] = await Promise.all([
        window.electronAPI.getSettings(),
        window.electronAPI.getModels(),
      ]);
      setCurrentModel(settings.model);
      setModels(modelList);
    }
    load().catch(() => {
      // Will use fallback display
    });
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = useCallback((value: string) => {
    setCurrentModel(value);
    setOpen(false);
    window.electronAPI.setModel(value);
  }, []);

  const dropdown = useAnimatedPresence(open, 120);

  const displayName =
    models.find((m) => m.value === currentModel)?.displayName ?? currentModel;

  return (
    <div className="model-selector" ref={containerRef}>
      <button
        className="model-selector-trigger"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <span className="model-selector-name">{displayName || "Model"}</span>
        <svg
          aria-hidden="true"
          fill="none"
          height="10"
          viewBox="0 0 10 6"
          width="10"
        >
          <path
            d="M1 1l4 4 4-4"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.4"
          />
        </svg>
      </button>

      {dropdown.mounted && (
        <div
          className={`model-dropdown ${dropdown.phase === "exiting" ? "model-dropdown-exiting" : ""}`}
        >
          {models.map((m) => (
            <button
              className={`model-option ${m.value === currentModel ? "model-option-active" : ""}`}
              key={m.value}
              onClick={() => handleSelect(m.value)}
              type="button"
            >
              {m.displayName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
