import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage as ChatMessageType } from "../../shared/types";
import { useAnimatedPresence } from "../hooks/use-animated-presence";
import { ChatMessage } from "./chat-message";

interface MessageListProps {
  isStreaming: boolean;
  messages: ChatMessageType[];
  onCopy: (text: string) => void;
  onPaste: (text: string) => void;
  onRefine: (text: string) => void;
}

export function MessageList({
  messages,
  isStreaming,
  onCopy,
  onPaste,
  onRefine,
}: MessageListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const autoScroll = useRef(true);
  const programmaticScroll = useRef(false);

  const isNearBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) {
      return true;
    }
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  const scrollToBottom = useCallback(() => {
    programmaticScroll.current = true;
    autoScroll.current = true;
    const el = listRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
    setShowScrollBtn(false);
  }, []);

  const messageCount = messages.length;
  // biome-ignore lint/correctness/useExhaustiveDependencies: messageCount is an intentional trigger for auto-scrolling on new messages
  useEffect(() => {
    if (autoScroll.current) {
      programmaticScroll.current = true;
      const el = listRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [messageCount]);

  useEffect(() => {
    if (isStreaming && isNearBottom()) {
      autoScroll.current = true;
    }
  }, [isStreaming, isNearBottom]);

  const handleScroll = useCallback(() => {
    if (programmaticScroll.current) {
      programmaticScroll.current = false;
      return;
    }
    const nearBottom = isNearBottom();
    autoScroll.current = nearBottom;
    setShowScrollBtn(!nearBottom);
  }, [isNearBottom]);

  const scrollBtn = useAnimatedPresence(showScrollBtn, 150);

  return (
    <div className="message-list" onScroll={handleScroll} ref={listRef}>
      {messages.map((msg, i) => (
        <ChatMessage
          isLast={i === messages.length - 1}
          isStreaming={isStreaming}
          key={msg.id}
          message={msg}
          onCopy={onCopy}
          onPaste={onPaste}
          onRefine={onRefine}
        />
      ))}
      <div ref={bottomRef} />
      {scrollBtn.mounted && (
        <button
          className={`scroll-to-bottom ${scrollBtn.phase === "exiting" ? "scroll-to-bottom-exiting" : ""}`}
          onClick={scrollToBottom}
          type="button"
        >
          <svg
            aria-hidden="true"
            fill="none"
            height="16"
            viewBox="0 0 16 16"
            width="16"
          >
            <path
              d="M4.5 6L8 9.5L11.5 6"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
