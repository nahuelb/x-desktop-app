import { type ReactNode, useState } from "react";
import type { ChatMessage as ChatMessageType } from "../../shared/types";

interface ChatMessageProps {
  isLast: boolean;
  isStreaming: boolean;
  message: ChatMessageType;
  onCopy: (text: string) => void;
  onPaste: (text: string) => void;
  onRefine?: (text: string) => void;
}

const REFINE_ACTIONS = [
  { label: "Alternatives", prompt: "give me 3 alternative versions" },
  { label: "Improve", prompt: "improve this, make it sharper" },
  { label: "Shorter", prompt: "make this shorter" },
  { label: "Longer", prompt: "expand this a bit, stay under 280 chars" },
];

const INLINE_MARKDOWN_REGEX = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
const POST_TAG_REGEX = /\[post\]([\s\S]*?)\[\/post\]/g;

function renderInlineMarkdown(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  INLINE_MARKDOWN_REGEX.lastIndex = 0;
  match = INLINE_MARKDOWN_REGEX.exec(text);
  while (match !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      nodes.push(<strong key={key++}>{match[2]}</strong>);
    } else if (match[3]) {
      nodes.push(<em key={key++}>{match[3]}</em>);
    }
    lastIndex = INLINE_MARKDOWN_REGEX.lastIndex;
    match = INLINE_MARKDOWN_REGEX.exec(text);
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length ? nodes : [text];
}

type ContentSegment =
  | { type: "text"; content: string }
  | { type: "post"; content: string };

function parseContent(raw: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  POST_TAG_REGEX.lastIndex = 0;
  match = POST_TAG_REGEX.exec(raw);
  while (match !== null) {
    if (match.index > lastIndex) {
      const text = raw.slice(lastIndex, match.index).trim();
      if (text) {
        segments.push({ type: "text", content: text });
      }
    }
    segments.push({ type: "post", content: match[1].trim() });
    lastIndex = POST_TAG_REGEX.lastIndex;
    match = POST_TAG_REGEX.exec(raw);
  }

  if (lastIndex < raw.length) {
    const text = raw.slice(lastIndex).trim();
    if (text) {
      segments.push({ type: "text", content: text });
    }
  }

  return segments.length ? segments : [{ type: "text", content: raw }];
}

function PostCard({
  content,
  index,
  onCopy,
  onPaste,
}: {
  content: string;
  index: number;
  onCopy: (text: string) => void;
  onPaste: (text: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className="post-card"
      style={index > 0 ? { animationDelay: `${index * 60}ms` } : undefined}
    >
      <div className="post-card-text">{content}</div>
      <div className="post-card-actions">
        <button
          className={`chat-msg-action ${copied ? "pop-feedback" : ""}`}
          onClick={handleCopy}
          type="button"
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          className="chat-msg-action"
          onClick={() => onPaste(content)}
          type="button"
        >
          Paste into X
        </button>
      </div>
    </div>
  );
}

export function ChatMessage({
  message,
  isStreaming,
  isLast,
  onCopy,
  onPaste,
  onRefine,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (message.role === "user") {
    return (
      <div className="chat-msg chat-msg-user">
        <div className="chat-msg-bubble chat-msg-bubble-user">
          {message.images && message.images.length > 0 && (
            <div className="chat-msg-images">
              {message.images.map((img) => (
                <img
                  alt={img.name}
                  className="chat-msg-image"
                  height={80}
                  key={img.id}
                  src={`data:${img.mediaType};base64,${img.base64}`}
                  width={80}
                />
              ))}
            </div>
          )}
          {message.content}
        </div>
      </div>
    );
  }

  const showCursor = isStreaming && isLast;
  const showActions = message.content && !isStreaming;
  const segments = parseContent(message.content);
  const hasPostCards = segments.some((s) => s.type === "post");

  return (
    <div className="chat-msg chat-msg-assistant">
      <div className="chat-msg-bubble chat-msg-bubble-assistant">
        {!message.content && showCursor && <span className="chat-cursor" />}
        {message.content && (
          <>
            {segments.map((seg, i) =>
              seg.type === "post" ? (
                <PostCard
                  content={seg.content}
                  index={i}
                  key={seg.content}
                  onCopy={onCopy}
                  onPaste={onPaste}
                />
              ) : (
                <span key={seg.content}>
                  {renderInlineMarkdown(seg.content)}
                </span>
              )
            )}
            {showCursor && <span className="chat-cursor" />}
          </>
        )}
      </div>
      {showActions && (
        <div className="chat-msg-actions">
          {!hasPostCards && (
            <>
              <button
                className={`chat-msg-action ${copied ? "pop-feedback" : ""}`}
                onClick={handleCopy}
                type="button"
              >
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                className="chat-msg-action"
                onClick={() => onPaste(message.content)}
                type="button"
              >
                Paste into X
              </button>
            </>
          )}
          {isLast && onRefine && (
            <>
              {!hasPostCards && <span className="chat-msg-actions-sep" />}
              {REFINE_ACTIONS.map((a) => (
                <button
                  className="chat-msg-action"
                  key={a.label}
                  onClick={() => onRefine(a.prompt)}
                  type="button"
                >
                  {a.label}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
