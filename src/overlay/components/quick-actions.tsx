import type { TweetContext } from "../../shared/types";

interface QuickActionsProps {
  extractContext: () => Promise<TweetContext | null>;
  isOnPost: boolean;
  isStreaming: boolean;
  onAction: (text: string, tweetContext?: TweetContext) => void;
}

export function QuickActions({
  onAction,
  extractContext,
  isStreaming,
  isOnPost,
}: QuickActionsProps) {
  const handleDraftReply = async () => {
    const ctx = await extractContext();
    if (ctx) {
      onAction("write a reply to this tweet", ctx);
    }
  };

  return (
    <>
      {!isOnPost && (
        <button
          className="btn-pill"
          disabled={isStreaming}
          onClick={() => onAction("write me a tweet")}
          type="button"
        >
          Draft Post
        </button>
      )}
      {isOnPost && (
        <button
          className="btn-pill"
          disabled={isStreaming}
          onClick={handleDraftReply}
          type="button"
        >
          Draft Reply
        </button>
      )}
    </>
  );
}
