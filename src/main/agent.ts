import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import type {
  SDKUserMessage,
  SpawnOptions,
} from "@anthropic-ai/claude-agent-sdk";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { app } from "electron";
import type {
  ImageAttachment,
  ModelOption,
  TweetContext,
} from "../shared/types";
import { MAX_BUDGET_USD, SYSTEM_PROMPT } from "./constants";
import { loadSettings } from "./settings";

const CLI_PATH = app.isPackaged
  ? path.join(process.resourcesPath, "claude-agent-sdk", "cli.js")
  : path.resolve(
      import.meta.dirname,
      "../../node_modules/@anthropic-ai/claude-agent-sdk/cli.js"
    );

type ChunkCallback = (text: string) => void;

interface ChatResult {
  fullText: string;
  sessionId: string;
}

function spawnWithElectron(opts: SpawnOptions) {
  const proc = spawn(process.execPath, opts.args, {
    cwd: opts.cwd,
    stdio: ["pipe", "pipe", "pipe"],
    signal: opts.signal,
    env: { ...opts.env, ELECTRON_RUN_AS_NODE: "1", NODE_OPTIONS: "" },
    windowsHide: true,
  });
  return proc;
}

let currentSessionId: string | null = null;
let currentAbort: AbortController | null = null;

const AVAILABLE_MODELS: ModelOption[] = [
  {
    value: "claude-sonnet-4-6",
    displayName: "Claude Sonnet 4.6",
    description: "",
  },
  { value: "claude-opus-4-6", displayName: "Claude Opus 4.6", description: "" },
  {
    value: "claude-haiku-4-5",
    displayName: "Claude Haiku 4.5",
    description: "",
  },
];

function loadWritingStyle(): string {
  const style = loadSettings().writingStyle?.trim();
  if (style) {
    return style;
  }
  // Backward compat: fall back to file-based WRITING_STYLE.md
  const paths = [
    path.join(app.getPath("home"), ".config", "x-app", "WRITING_STYLE.md"),
    path.join(app.getAppPath(), "WRITING_STYLE.md"),
  ];
  for (const p of paths) {
    try {
      return readFileSync(p, "utf-8").trim();
    } catch {
      // not found, try next
    }
  }
  return "";
}

function buildSystemPrompt(): string {
  const style = loadWritingStyle();
  if (!style) {
    return SYSTEM_PROMPT;
  }
  return `${SYSTEM_PROMPT}\n\n--- User Writing Style ---\n${style}`;
}

function buildPrompt(message: string, tweetContext?: TweetContext): string {
  if (!tweetContext) {
    return message;
  }

  const parts: string[] = [];
  if (tweetContext.thread?.length) {
    parts.push("Thread context:");
    for (const t of tweetContext.thread) {
      parts.push(`@${t.author}: ${t.text}`);
    }
  }
  parts.push(`Tweet by @${tweetContext.author}: ${tweetContext.text}`);
  parts.push("");
  parts.push(message);
  return parts.join("\n");
}

function buildImagePrompt(
  message: string,
  tweetContext?: TweetContext,
  images?: ImageAttachment[]
): string | AsyncIterable<SDKUserMessage> {
  const textPrompt = buildPrompt(message, tweetContext);

  if (!images?.length) {
    return textPrompt;
  }

  const contentBlocks = [
    ...images.map((img) => ({
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: img.mediaType,
        data: img.base64,
      },
    })),
    {
      type: "text" as const,
      text: textPrompt || "What do you see in this image?",
    },
  ];

  function* generate() {
    yield {
      type: "user",
      message: { role: "user", content: contentBlocks },
      parent_tool_use_id: null,
      session_id: currentSessionId ?? "",
    };
  }

  return generate() as unknown as AsyncIterable<SDKUserMessage>;
}

export async function chat(
  message: string,
  onChunk: ChunkCallback,
  tweetContext?: TweetContext,
  images?: ImageAttachment[]
): Promise<ChatResult> {
  currentAbort = new AbortController();
  let fullText = "";
  let sessionId = "";

  const prompt = buildImagePrompt(message, tweetContext, images);

  const stream = query({
    prompt,
    options: {
      model: loadSettings().model,
      systemPrompt: buildSystemPrompt(),
      pathToClaudeCodeExecutable: CLI_PATH,
      maxTurns: 3,
      maxBudgetUsd: MAX_BUDGET_USD,
      allowedTools: [],
      includePartialMessages: true,
      abortController: currentAbort,
      ...(app.isPackaged ? { spawnClaudeCodeProcess: spawnWithElectron } : {}),
      ...(currentSessionId ? { resume: currentSessionId } : {}),
    },
  });

  for await (const message of stream) {
    if (message.type === "stream_event") {
      const event = message.event;
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        fullText += event.delta.text;
        onChunk(event.delta.text);
      }
    }
    if ("session_id" in message && message.session_id) {
      sessionId = message.session_id;
    }
  }

  currentAbort = null;
  currentSessionId = sessionId;
  return { fullText, sessionId };
}

export function newChat() {
  currentSessionId = null;
}

export function setSessionId(id: string | null) {
  currentSessionId = id;
}

export function abortCurrentSession() {
  currentAbort?.abort();
  currentAbort = null;
}

export function getAvailableModels(): ModelOption[] {
  return AVAILABLE_MODELS;
}
