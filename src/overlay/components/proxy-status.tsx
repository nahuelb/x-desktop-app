import { useCallback, useEffect, useRef, useState } from "react";
import type { AppSettings, ProxyInfo } from "../../shared/types";
import { useAnimatedPresence } from "../hooks/use-animated-presence";

interface ProxyStatusProps {
  connected: boolean | null;
}

const IPC_ERROR_PREFIX = /^Error invoking remote method '[^']+': Error: /;

function cleanIpcError(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) {
    return fallback;
  }
  return err.message.replace(IPC_ERROR_PREFIX, "");
}

function ProxyInfoSection({
  connected,
  fetchKey,
  onLoadingChange,
  panelOpen,
}: {
  connected: boolean | null;
  fetchKey: number;
  onLoadingChange: (loading: boolean) => void;
  panelOpen: boolean;
}) {
  const [info, setInfo] = useState<ProxyInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const cachedRef = useRef<ProxyInfo | null>(null);
  const prevConnectedRef = useRef(connected);
  const prevFetchKeyRef = useRef(fetchKey);

  if (connected !== prevConnectedRef.current) {
    prevConnectedRef.current = connected;
    cachedRef.current = null;
    setInfo(null);
  }

  const fetchInfo = useCallback(() => {
    setLoading(true);
    onLoadingChange(true);
    window.electronAPI
      .getProxyInfo()
      .then((result) => {
        cachedRef.current = result;
        setInfo(result);
      })
      .catch(() => setInfo(null))
      .finally(() => {
        setLoading(false);
        onLoadingChange(false);
      });
  }, [onLoadingChange]);

  useEffect(() => {
    if (!panelOpen) {
      return;
    }
    // Track connected so we re-fetch after connect/disconnect
    const _trigger = connected;
    const isRefresh = fetchKey !== prevFetchKeyRef.current;
    prevFetchKeyRef.current = fetchKey;

    if (!isRefresh && cachedRef.current) {
      setInfo(cachedRef.current);
      return;
    }
    cachedRef.current = null;
    fetchInfo();
  }, [panelOpen, connected, fetchKey, fetchInfo]);

  if (loading) {
    return <span className="proxy-panel-muted">Resolving IP...</span>;
  }

  if (!info) {
    return null;
  }

  return (
    <>
      <div className="proxy-panel-ip">{info.ip}</div>
      <div className="proxy-panel-geo">
        {[info.city, info.region, info.country].filter(Boolean).join(", ")}
        {info.org && (
          <span className="proxy-panel-org"> &middot; {info.org}</span>
        )}
      </div>
    </>
  );
}

function RefreshButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      aria-label="Refresh IP info"
      className="proxy-panel-refresh"
      onClick={onClick}
      type="button"
    >
      <svg
        aria-hidden="true"
        fill="none"
        height="12"
        viewBox="0 0 16 16"
        width="12"
      >
        <path
          d="M13.5 2.5v4h-4M2.5 13.5v-4h4"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M3.7 6a5 5 0 0 1 8.8-1.5L13.5 6.5M12.3 10a5 5 0 0 1-8.8 1.5L2.5 9.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </svg>
    </button>
  );
}

type TestStatus =
  | { state: "idle" }
  | { state: "testing" }
  | { state: "success"; latencyMs: number }
  | { state: "error"; message: string };

function TestResultSection({ status }: { status: TestStatus }) {
  if (status.state === "idle") {
    return null;
  }

  return (
    <div className="proxy-panel-section">
      {status.state === "testing" && (
        <span className="proxy-panel-muted">Testing connection...</span>
      )}
      {status.state === "success" && (
        <div className="proxy-panel-test-success">
          <svg
            aria-hidden="true"
            fill="none"
            height="14"
            viewBox="0 0 14 14"
            width="14"
          >
            <path
              d="M3 7.5L5.5 10L11 4"
              stroke="var(--success)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
          </svg>
          <span>Connection OK &middot; {status.latencyMs}ms</span>
        </div>
      )}
      {status.state === "error" && (
        <div className="proxy-panel-test-error">
          <svg
            aria-hidden="true"
            fill="none"
            height="14"
            viewBox="0 0 14 14"
            width="14"
          >
            <path
              d="M11 3L3 11M3 3l8 8"
              stroke="var(--danger)"
              strokeLinecap="round"
              strokeWidth="1.5"
            />
          </svg>
          <span>{status.message}</span>
        </div>
      )}
    </div>
  );
}

export function ProxyStatus({ connected }: ProxyStatusProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    model: "",
    sshHost: "",
    sshUser: "",
    writingStyle: "",
  });
  const [savedSettings, setSavedSettings] = useState<AppSettings>({
    model: "",
    sshHost: "",
    sshUser: "",
    writingStyle: "",
  });
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveFlash, setSaveFlash] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>({ state: "idle" });
  const [infoFetchKey, setInfoFetchKey] = useState(0);
  const [infoLoading, setInfoLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const dirty =
    settings.sshHost !== savedSettings.sshHost ||
    settings.sshUser !== savedSettings.sshUser;
  const hasFields = settings.sshHost.trim() && settings.sshUser.trim();

  const refreshInfo = useCallback(() => {
    setInfoFetchKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!panelOpen) {
      return;
    }
    window.electronAPI.getSettings().then((s) => {
      setSettings(s);
      setSavedSettings(s);
    });
    setError(null);
    setTestStatus({ state: "idle" });
  }, [panelOpen]);

  const saveIfDirty = useCallback(async () => {
    if (
      settings.sshHost !== savedSettings.sshHost ||
      settings.sshUser !== savedSettings.sshUser
    ) {
      await window.electronAPI.saveSettings(settings);
      setSavedSettings(settings);
    }
  }, [settings, savedSettings]);

  const handleSave = useCallback(async () => {
    await window.electronAPI.saveSettings(settings);
    setSavedSettings(settings);
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1500);
    if (connected) {
      refreshInfo();
    }
  }, [settings, connected, refreshInfo]);

  const handleTest = useCallback(async () => {
    setTestStatus({ state: "testing" });
    setError(null);
    try {
      await saveIfDirty();
      const result = await window.electronAPI.proxyTest(settings);
      setTestStatus({ state: "success", latencyMs: result.latencyMs });
    } catch (err) {
      setTestStatus({
        state: "error",
        message: cleanIpcError(err, "Test failed"),
      });
    }
  }, [settings, saveIfDirty]);

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    setTestStatus({ state: "idle" });
    try {
      await saveIfDirty();
      await window.electronAPI.proxyConnect();
    } catch (err) {
      setError(cleanIpcError(err, "Connection failed"));
    } finally {
      setConnecting(false);
    }
  }, [saveIfDirty]);

  const handleDisconnect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    setTestStatus({ state: "idle" });
    try {
      await window.electronAPI.proxyDisconnect();
    } catch (err) {
      setError(cleanIpcError(err, "Disconnect failed"));
    } finally {
      setConnecting(false);
    }
  }, []);

  const panel = useAnimatedPresence(panelOpen, 200);

  if (connected === null) {
    return null;
  }

  const color = connected ? "var(--success)" : "var(--danger)";
  const label = connected ? "Connected" : "Disconnected";

  return (
    <>
      <button
        className="proxy-indicator"
        onClick={() => setPanelOpen(!panelOpen)}
        type="button"
      >
        <span className="proxy-dot" style={{ background: color }} />
        <span className="proxy-indicator-text">{label}</span>
      </button>

      {panel.mounted && (
        <ProxyPanel
          color={color}
          connected={connected}
          connecting={connecting}
          dirty={dirty}
          error={error}
          exiting={panel.phase === "exiting"}
          handleConnect={handleConnect}
          handleDisconnect={handleDisconnect}
          handleSave={handleSave}
          handleTest={handleTest}
          hasFields={hasFields}
          infoFetchKey={infoFetchKey}
          infoLoading={infoLoading}
          label={label}
          onClose={() => setPanelOpen(false)}
          onInfoLoadingChange={setInfoLoading}
          onRefresh={refreshInfo}
          panelRef={panelRef}
          saveFlash={saveFlash}
          setSettings={setSettings}
          settings={settings}
          testStatus={testStatus}
        />
      )}
    </>
  );
}

function ProxyPanel({
  color,
  connected,
  connecting,
  dirty,
  error,
  exiting,
  handleConnect,
  handleDisconnect,
  handleSave,
  handleTest,
  hasFields,
  infoFetchKey,
  infoLoading,
  label,
  onClose,
  onInfoLoadingChange,
  onRefresh,
  panelRef,
  saveFlash,
  setSettings,
  settings,
  testStatus,
}: {
  color: string;
  connected: boolean;
  connecting: boolean;
  dirty: boolean;
  error: string | null;
  exiting: boolean;
  handleConnect: () => void;
  handleDisconnect: () => void;
  handleSave: () => void;
  handleTest: () => void;
  hasFields: string | boolean;
  infoFetchKey: number;
  infoLoading: boolean;
  label: string;
  onClose: () => void;
  onInfoLoadingChange: (loading: boolean) => void;
  onRefresh: () => void;
  panelRef: React.RefObject<HTMLDivElement | null>;
  saveFlash: boolean;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  settings: AppSettings;
  testStatus: TestStatus;
}) {
  return (
    <div
      className={`proxy-panel ${exiting ? "proxy-panel-exiting" : ""}`}
      ref={panelRef}
      role="dialog"
    >
      <div className="proxy-panel-header">
        <span className="proxy-panel-title">Proxy</span>
        <button
          aria-label="Close"
          className="proxy-panel-close"
          onClick={onClose}
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
        <div className="proxy-panel-status-row">
          <span className="proxy-dot" style={{ background: color }} />
          <span className="proxy-panel-status-label">{label}</span>
          {!infoLoading && <RefreshButton onClick={onRefresh} />}
        </div>
        <ProxyInfoSection
          connected={connected}
          fetchKey={infoFetchKey}
          onLoadingChange={onInfoLoadingChange}
          panelOpen
        />
      </div>

      <div className="proxy-panel-section">
        <label className="proxy-panel-label" htmlFor="ssh-host">
          SSH Host
        </label>
        <input
          autoComplete="off"
          className="proxy-panel-input"
          disabled={connecting}
          id="ssh-host"
          onChange={(e) =>
            setSettings((s) => ({ ...s, sshHost: e.target.value }))
          }
          placeholder="host.example.com"
          spellCheck={false}
          type="text"
          value={settings.sshHost}
        />
        <label className="proxy-panel-label" htmlFor="ssh-user">
          SSH User
        </label>
        <input
          autoComplete="off"
          className="proxy-panel-input"
          disabled={connecting}
          id="ssh-user"
          onChange={(e) =>
            setSettings((s) => ({ ...s, sshUser: e.target.value }))
          }
          placeholder="username"
          spellCheck={false}
          type="text"
          value={settings.sshUser}
        />

        <div className="proxy-panel-save-row">
          <button
            className="proxy-panel-btn proxy-panel-btn-subtle"
            disabled={!dirty || connecting}
            onClick={handleSave}
            type="button"
          >
            Save
          </button>
          {saveFlash && <span className="proxy-panel-saved-flash">Saved</span>}
        </div>
      </div>

      <TestResultSection status={testStatus} />

      {error && (
        <div className="proxy-panel-section">
          <div className="proxy-panel-error">{error}</div>
        </div>
      )}

      <div className="proxy-panel-actions">
        <button
          className="proxy-panel-btn proxy-panel-btn-subtle"
          disabled={!hasFields || testStatus.state === "testing" || connecting}
          onClick={handleTest}
          type="button"
        >
          {testStatus.state === "testing" ? "Testing..." : "Test"}
        </button>
        {connected ? (
          <button
            className="proxy-panel-btn proxy-panel-btn-danger"
            disabled={connecting}
            onClick={handleDisconnect}
            type="button"
          >
            {connecting ? "Disconnecting..." : "Disconnect"}
          </button>
        ) : (
          <button
            className="proxy-panel-btn proxy-panel-btn-primary"
            disabled={connecting || !hasFields}
            onClick={handleConnect}
            type="button"
          >
            {connecting ? "Connecting..." : "Connect"}
          </button>
        )}
      </div>
    </div>
  );
}
