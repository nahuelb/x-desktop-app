import { useCallback, useRef, useState } from "react";
import type { ImageAttachment, ImageMediaType } from "../../shared/types";
import { useAnimatedPresence } from "../hooks/use-animated-presence";
import { ModelSelector } from "./model-selector";

const ACCEPTED_TYPES = new Set<string>([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGES = 4;

function readFileAsAttachment(file: File): Promise<ImageAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      resolve({
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        base64,
        mediaType: file.type as ImageMediaType,
        name: file.name,
        size: file.size,
      });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function truncateName(name: string, max = 18): string {
  if (name.length <= max) {
    return name;
  }
  const ext = name.lastIndexOf(".");
  if (ext === -1) {
    return `${name.slice(0, max - 1)}…`;
  }
  const base = name.slice(0, ext);
  const suffix = name.slice(ext);
  const keep = max - suffix.length - 1;
  return keep > 0
    ? `${base.slice(0, keep)}…${suffix}`
    : `${name.slice(0, max - 1)}…`;
}

interface ChatInputProps {
  isStreaming: boolean;
  onAbort: () => void;
  onSend: (text: string, images?: ImageAttachment[]) => void;
}

export function ChatInput({ onSend, onAbort, isStreaming }: ChatInputProps) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewImage, setPreviewImage] = useState<ImageAttachment | null>(
    null
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) {
      return;
    }
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const valid = Array.from(files).filter(
      (f) => ACCEPTED_TYPES.has(f.type) && f.size <= MAX_FILE_SIZE
    );
    if (valid.length === 0) {
      return;
    }

    const newImages = await Promise.all(valid.map(readFileAsAttachment));
    setImages((prev) => [...prev, ...newImages].slice(0, MAX_IMAGES));
  }, []);

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleSend = () => {
    if ((!text.trim() && images.length === 0) || isStreaming) {
      return;
    }
    onSend(text, images.length > 0 ? images : undefined);
    setText("");
    setImages([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files.length) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      processFiles(e.target.files);
      e.target.value = "";
    }
  };

  const lightbox = useAnimatedPresence(!!previewImage, 150);
  const canSend = text.trim() || images.length > 0;

  return (
    <div className="chat-input-wrap">
      {images.length > 0 && (
        <div className="chat-image-preview">
          {images.map((img) => (
            <div className="chat-image-chip" key={img.id}>
              <button
                className="chat-image-chip-inner"
                onClick={() => setPreviewImage(img)}
                type="button"
              >
                <img
                  alt={img.name}
                  className="chat-image-chip-thumb"
                  height={36}
                  src={`data:${img.mediaType};base64,${img.base64}`}
                  width={36}
                />
                <div className="chat-image-chip-info">
                  <span className="chat-image-chip-name">
                    {truncateName(img.name)}
                  </span>
                  <span className="chat-image-chip-type">IMAGE</span>
                </div>
              </button>
              <button
                className="chat-image-chip-remove"
                onClick={() => removeImage(img.id)}
                type="button"
              >
                <svg
                  aria-hidden="true"
                  fill="none"
                  height="8"
                  viewBox="0 0 8 8"
                  width="8"
                >
                  <path
                    d="M1 1l6 6M7 1L1 7"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1.5"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      <div
        aria-hidden="true"
        className={`chat-input-box ${isDragOver ? "chat-input-box-dragover" : ""}`}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        role="presentation"
      >
        <textarea
          className="chat-input"
          disabled={isStreaming}
          onChange={(e) => {
            setText(e.target.value);
            adjustHeight();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything..."
          ref={textareaRef}
          rows={2}
          value={text}
        />
        <input
          accept="image/jpeg,image/png,image/gif,image/webp"
          hidden
          multiple
          onChange={handleFileChange}
          ref={fileInputRef}
          type="file"
        />
        <div className="chat-input-toolbar">
          <div className="chat-input-toolbar-left">
            <button
              className="chat-attach-btn"
              disabled={isStreaming || images.length >= MAX_IMAGES}
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <svg
                aria-hidden="true"
                fill="none"
                height="16"
                viewBox="0 0 24 24"
                width="16"
              >
                <path
                  d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                />
              </svg>
            </button>
            <ModelSelector />
          </div>
          {isStreaming ? (
            <button
              className="chat-send-btn chat-stop-btn"
              onClick={onAbort}
              type="button"
            >
              <svg
                aria-hidden="true"
                fill="none"
                height="14"
                viewBox="0 0 14 14"
                width="14"
              >
                <rect
                  height="8"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  width="8"
                  x="3"
                  y="3"
                />
              </svg>
            </button>
          ) : (
            <button
              className="chat-send-btn"
              disabled={!canSend}
              onClick={handleSend}
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
                  d="M7 12V2m0 0L3 6m4-4l4 4"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {lightbox.mounted && previewImage && (
        <button
          aria-label="Close preview"
          className={`image-lightbox ${lightbox.phase === "exiting" ? "image-lightbox-exiting" : ""}`}
          onClick={() => setPreviewImage(null)}
          onKeyDown={(e) => e.key === "Escape" && setPreviewImage(null)}
          type="button"
        >
          <img
            alt={previewImage.name}
            className="image-lightbox-img"
            height={600}
            src={`data:${previewImage.mediaType};base64,${previewImage.base64}`}
            width={800}
          />
        </button>
      )}
    </div>
  );
}
