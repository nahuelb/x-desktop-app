import { useEffect, useState } from "react";
import { ChatInput } from "./components/chat-input";
import { ComposeActions } from "./components/compose-actions";
import { MessageList } from "./components/message-list";
import { ProxyStatus } from "./components/proxy-status";
import { WritingStyleEditor } from "./components/writing-style-editor";
import { useChat } from "./hooks/use-agent";
import { useAnimatedPresence } from "./hooks/use-animated-presence";
import { usePageType } from "./hooks/use-page-type";
import { useTweetContext } from "./hooks/use-tweet-context";

function useCollapsed() {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      setCollapsed(document.documentElement.clientWidth < 100);
    });
    observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, []);
  return collapsed;
}

function useProxyStatus() {
  const [connected, setConnected] = useState<boolean | null>(null);
  useEffect(() => {
    window.electronAPI.getProxyStatus().then((status) => {
      setConnected(status.connected);
    });
    return window.electronAPI.onProxyStatus((status) => {
      setConnected(status.connected);
    });
  }, []);
  return connected;
}

export function App() {
  const { pageType, url } = usePageType();
  const chat = useChat(url);
  const { extract } = useTweetContext();
  const collapsed = useCollapsed();
  const proxyConnected = useProxyStatus();
  const errorBanner = useAnimatedPresence(!!chat.error && !collapsed, 200);

  return (
    <div className={`panel ${collapsed ? "panel-collapsed" : ""}`}>
      {errorBanner.mounted && (
        <div
          className={`error-banner ${errorBanner.phase === "exiting" ? "error-banner-exiting" : ""}`}
        >
          {chat.error}
        </div>
      )}
      <div className="panel-header">
        <button
          className="sidebar-toggle-btn"
          onClick={() => window.electronAPI.toggleOverlay()}
          type="button"
        >
          <svg
            aria-hidden="true"
            fill="none"
            height="16"
            viewBox="0 0 16 16"
            width="16"
          >
            <rect
              height="12"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.3"
              width="14"
              x="1"
              y="2"
            />
            <line
              stroke="currentColor"
              strokeWidth="1.3"
              x1="5.5"
              x2="5.5"
              y1="2"
              y2="14"
            />
          </svg>
          {!collapsed && (
            <span className="tooltip">
              Toggle sidebar <kbd>⌘S</kbd>
            </span>
          )}
        </button>
        {!collapsed && <ProxyStatus connected={proxyConnected} />}
        {!collapsed && <WritingStyleEditor />}
        {!collapsed && (
          <button
            className="new-chat-btn"
            onClick={chat.clearConversation}
            type="button"
          >
            <svg
              aria-hidden="true"
              fill="none"
              height="14"
              viewBox="0 0 24 24"
              width="14"
            >
              <path
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
              />
            </svg>
            <span className="tooltip tooltip-right">Clear conversation</span>
          </button>
        )}
      </div>
      <div className="panel-content">
        <MessageList
          isStreaming={chat.isStreaming}
          messages={chat.messages}
          onCopy={chat.copy}
          onPaste={chat.paste}
          onRefine={chat.sendMessage}
        />
        <div className="chat-footer">
          <ComposeActions
            isStreaming={chat.isStreaming}
            onAction={chat.sendMessage}
          />
          <ChatInput
            isStreaming={chat.isStreaming}
            onAbort={chat.abort}
            onSend={async (text, images) => {
              const ctx =
                pageType === "post"
                  ? ((await extract()) ?? undefined)
                  : undefined;
              chat.sendMessage(text, ctx, images);
            }}
          />
        </div>
      </div>
    </div>
  );
}
