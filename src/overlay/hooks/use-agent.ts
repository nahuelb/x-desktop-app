import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ChatMessage,
  ImageAttachment,
  TweetContext,
} from "../../shared/types";

let nextId = 0;
function genId() {
  return `msg-${Date.now()}-${nextId++}`;
}

const TWEET_URL_REGEX = /^\/[^/]+\/status\/\d+/;

function normalizeTweetUrl(url: string): string {
  try {
    const { origin, pathname } = new URL(url);
    const match = pathname.match(TWEET_URL_REGEX);
    return match ? `${origin}${match[0]}` : url;
  } catch {
    return url;
  }
}

interface ChatState {
  error: string | null;
  isStreaming: boolean;
  messages: ChatMessage[];
}

interface CachedConversation {
  messages: ChatMessage[];
  sessionId: string | null;
}

const INITIAL_STATE: ChatState = {
  messages: [],
  isStreaming: false,
  error: null,
};
const MAX_CACHE = 50;

export function useChat(url: string) {
  const [state, setState] = useState<ChatState>(INITIAL_STATE);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const debounceRef = useRef(false);

  const stateRef = useRef(state);
  stateRef.current = state;
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const cacheRef = useRef(new Map<string, CachedConversation>());
  const currentUrlRef = useRef("");

  useEffect(() => {
    const unsubChunk = window.electronAPI.onStreamChunk(({ text }) => {
      setState((s) => {
        const msgs = [...s.messages];
        const last = msgs.at(-1);
        if (last?.role === "assistant") {
          msgs[msgs.length - 1] = { ...last, content: last.content + text };
        }
        return { ...s, messages: msgs };
      });
    });

    const unsubComplete = window.electronAPI.onStreamComplete(
      ({ fullText, sessionId: sid }) => {
        setSessionId(sid);
        setState((s) => {
          const msgs = [...s.messages];
          const last = msgs.at(-1);
          if (last?.role === "assistant") {
            msgs[msgs.length - 1] = { ...last, content: fullText };
          }
          return { ...s, messages: msgs, isStreaming: false, error: null };
        });
      }
    );

    const unsubError = window.electronAPI.onStreamError(({ message }) => {
      setState((s) => {
        const msgs = [...s.messages];
        const last = msgs.at(-1);
        if (last?.role === "assistant" && !last.content) {
          msgs.pop();
        }
        return { ...s, messages: msgs, isStreaming: false, error: message };
      });
    });

    return () => {
      unsubChunk();
      unsubComplete();
      unsubError();
    };
  }, []);

  useEffect(() => {
    const normalized = url ? normalizeTweetUrl(url) : "";
    if (normalized === currentUrlRef.current) {
      return;
    }

    // Abort any in-progress streaming
    if (stateRef.current.isStreaming) {
      window.electronAPI.abort();
      setState((s) => ({ ...s, isStreaming: false }));
    }

    // Save current conversation to cache
    const prevUrl = currentUrlRef.current;
    const shouldCache =
      prevUrl.includes("/status/") && stateRef.current.messages.length > 0;
    if (shouldCache) {
      cacheRef.current.set(prevUrl, {
        messages: stateRef.current.messages,
        sessionId: sessionIdRef.current,
      });
      if (cacheRef.current.size > MAX_CACHE) {
        const oldest = cacheRef.current.keys().next().value as string;
        cacheRef.current.delete(oldest);
      }
    }

    currentUrlRef.current = normalized;

    // Restore or clear conversation
    const isPost = normalized.includes("/status/");
    const cached = isPost ? cacheRef.current.get(normalized) : null;
    if (cached) {
      setState({
        messages: cached.messages,
        isStreaming: false,
        error: null,
      });
      setSessionId(cached.sessionId);
      window.electronAPI.setSession(cached.sessionId);
    } else {
      setState(INITIAL_STATE);
      setSessionId(null);
      window.electronAPI.setSession(null);
    }
  }, [url]);

  const guard = useCallback(() => {
    if (debounceRef.current) {
      return false;
    }
    debounceRef.current = true;
    setTimeout(() => {
      debounceRef.current = false;
    }, 300);
    return true;
  }, []);

  const sendMessage = useCallback(
    (text: string, tweetContext?: TweetContext, images?: ImageAttachment[]) => {
      if (!(guard() && (text.trim() || images?.length))) {
        return;
      }

      const userMsg: ChatMessage = {
        id: genId(),
        role: "user",
        content: text.trim(),
        images,
        timestamp: Date.now(),
      };
      const assistantMsg: ChatMessage = {
        id: genId(),
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };

      setState((s) => ({
        ...s,
        messages: [...s.messages, userMsg, assistantMsg],
        isStreaming: true,
        error: null,
      }));

      window.electronAPI.chat({
        message: text.trim(),
        tweetContext,
        images,
      });
    },
    [guard]
  );

  const clearConversation = useCallback(() => {
    window.electronAPI.newChat();
    setState(INITIAL_STATE);
    setSessionId(null);
    const normalized = currentUrlRef.current;
    if (normalized) {
      cacheRef.current.delete(normalized);
    }
  }, []);

  const abort = useCallback(() => {
    window.electronAPI.abort();
    setState((s) => ({ ...s, isStreaming: false }));
  }, []);

  const copy = useCallback((text: string) => {
    window.electronAPI.copy(text);
  }, []);

  const paste = useCallback(async (text: string) => {
    try {
      await window.electronAPI.paste(text);
    } catch (err) {
      setState((s) => ({
        ...s,
        error: err instanceof Error ? err.message : "Failed to paste",
      }));
    }
  }, []);

  return { ...state, sendMessage, clearConversation, abort, copy, paste };
}
