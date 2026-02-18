import { useCallback, useState } from "react";
import type { TweetContext } from "../../shared/types";

export function useTweetContext() {
  const [tweetContext, setTweetContext] = useState<TweetContext | null>(null);

  const extract = useCallback(async () => {
    const ctx = await window.electronAPI.extractContext();
    setTweetContext(ctx);
    return ctx;
  }, []);

  const clear = useCallback(() => setTweetContext(null), []);

  return { tweetContext, extract, clear };
}
