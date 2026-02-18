interface ChatHeaderProps {
  onNewChat: () => void;
}

export function ChatHeader({ onNewChat }: ChatHeaderProps) {
  return (
    <div className="chat-header">
      <button
        className="chat-header-btn"
        onClick={onNewChat}
        title="New chat"
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
            d="M13.5 2.5L6.5 9.5M13.5 2.5L9 14L6.5 9.5M13.5 2.5L2 7L6.5 9.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.2"
          />
        </svg>
      </button>
      <span className="chat-header-title">Chat</span>
      <div className="chat-header-spacer" />
    </div>
  );
}
