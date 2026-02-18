import { useCallback, useEffect, useState } from "react";
import { useAnimatedPresence } from "../hooks/use-animated-presence";

export function WritingStyleEditor() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [style, setStyle] = useState("");
  const [savedStyle, setSavedStyle] = useState("");
  const [savedConfirm, setSavedConfirm] = useState(false);

  const dirty = style !== savedStyle;
  const panel = useAnimatedPresence(panelOpen, 200);

  useEffect(() => {
    if (!panelOpen) {
      return;
    }
    window.electronAPI
      .getWritingStyle()
      .then((s) => {
        setStyle(s);
        setSavedStyle(s);
      })
      .catch(() => {
        // IPC not ready — panel stays empty
      });
  }, [panelOpen]);

  const handleSave = useCallback(async () => {
    try {
      await window.electronAPI.saveWritingStyle(style);
      setSavedStyle(style);
      setPanelOpen(false);
      setSavedConfirm(true);
      setTimeout(() => setSavedConfirm(false), 2000);
    } catch {
      // save failed silently — user can retry
    }
  }, [style]);

  const handleReset = useCallback(async () => {
    try {
      const defaultStyle = await window.electronAPI.getDefaultWritingStyle();
      await window.electronAPI.saveWritingStyle(defaultStyle);
      setStyle(defaultStyle);
      setSavedStyle(defaultStyle);
    } catch {
      // reset failed silently — user can retry
    }
  }, []);

  return (
    <>
      <button
        className={`proxy-indicator ${savedConfirm ? "style-saved-confirm" : ""}`}
        onClick={() => setPanelOpen(!panelOpen)}
        type="button"
      >
        {savedConfirm ? (
          <>
            <svg
              aria-hidden="true"
              fill="none"
              height="14"
              viewBox="0 0 24 24"
              width="14"
            >
              <path
                d="M5 13l4 4L19 7"
                stroke="var(--success)"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
            <span
              className="proxy-indicator-text"
              style={{ color: "var(--success)" }}
            >
              Saved
            </span>
          </>
        ) : (
          <>
            <svg
              aria-hidden="true"
              fill="none"
              height="14"
              viewBox="0 0 24 24"
              width="14"
            >
              <path
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
              />
            </svg>
            <span className="proxy-indicator-text">Style</span>
          </>
        )}
      </button>

      {panel.mounted && (
        <div
          className={`proxy-panel ${panel.phase === "exiting" ? "proxy-panel-exiting" : ""}`}
          role="dialog"
        >
          <div className="proxy-panel-header">
            <span className="proxy-panel-title">Writing Style</span>
            <button
              aria-label="Close"
              className="proxy-panel-close"
              onClick={() => setPanelOpen(false)}
              type="button"
            >
              <svg
                aria-hidden="true"
                fill="none"
                height="14"
                viewBox="0 0 14 14"
                width="14"
              >
                <path
                  d="M11 3L3 11M3 3l8 8"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.5"
                />
              </svg>
            </button>
          </div>

          <div className="proxy-panel-section">
            <span className="proxy-panel-muted">
              Describe how the AI should write. Changes apply to the next
              message.
            </span>
          </div>

          <div className="proxy-panel-section writing-style-section">
            <textarea
              className="writing-style-textarea"
              onChange={(e) => setStyle(e.target.value)}
              spellCheck={false}
              value={style}
            />
          </div>

          <div className="proxy-panel-actions">
            <button
              className="proxy-panel-btn proxy-panel-btn-primary"
              disabled={!dirty}
              onClick={handleSave}
              type="button"
            >
              Save
            </button>
            <div style={{ flex: 1 }} />
            <button
              className="proxy-panel-btn proxy-panel-btn-subtle"
              onClick={handleReset}
              type="button"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </>
  );
}
