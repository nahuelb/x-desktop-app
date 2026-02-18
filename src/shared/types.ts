export type PageType = "post" | "timeline" | "other";

export interface PageNavigation {
  pageType: PageType;
  url: string;
}

export interface TweetContext {
  author: string;
  text: string;
  thread?: { author: string; text: string }[];
  timestamp?: string;
}

export type ImageMediaType =
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp";

export interface ImageAttachment {
  base64: string;
  id: string;
  mediaType: ImageMediaType;
  name: string;
  size: number;
}

export interface ChatMessage {
  content: string;
  id: string;
  images?: ImageAttachment[];
  role: "user" | "assistant";
  timestamp: number;
}

export interface ChatRequest {
  images?: ImageAttachment[];
  message: string;
  tweetContext?: TweetContext;
}

export interface StreamChunk {
  text: string;
}

export interface StreamComplete {
  fullText: string;
  sessionId: string;
}

export interface StreamError {
  message: string;
}

export interface ProxyStatus {
  connected: boolean;
}

export interface ProxyInfo {
  city: string;
  country: string;
  ip: string;
  org: string;
  region: string;
}

export interface AppSettings {
  model: string;
  sshHost: string;
  sshUser: string;
  writingStyle: string;
}

export interface ModelOption {
  description: string;
  displayName: string;
  value: string;
}

export interface ProxyTestResult {
  latencyMs: number;
}

export const IPC = {
  EXTRACT_CONTEXT: "tweet:extract-context",
  CHAT: "agent:chat",
  NEW_CHAT: "agent:new-chat",
  SET_SESSION: "agent:set-session",
  ABORT: "agent:abort",
  PASTE: "tweet:paste",
  COPY: "clipboard:copy",
  STREAM_CHUNK: "agent:stream-chunk",
  STREAM_COMPLETE: "agent:stream-complete",
  STREAM_ERROR: "agent:stream-error",
  TOGGLE_OVERLAY: "overlay:toggle",
  PAGE_TYPE_CHANGED: "nav:page-type-changed",
  EXTRACT_COMPOSE_TEXT: "tweet:extract-compose-text",
  PROXY_STATUS: "proxy:status",
  GET_PROXY_STATUS: "proxy:get-status",
  PROXY_INFO: "proxy:info",
  GET_SETTINGS: "proxy:get-settings",
  SAVE_SETTINGS: "proxy:save-settings",
  PROXY_CONNECT: "proxy:connect",
  PROXY_DISCONNECT: "proxy:disconnect",
  PROXY_TEST: "proxy:test",
  GET_MODELS: "agent:get-models",
  SET_MODEL: "agent:set-model",
  GET_WRITING_STYLE: "settings:get-writing-style",
  SAVE_WRITING_STYLE: "settings:save-writing-style",
  GET_DEFAULT_WRITING_STYLE: "settings:get-default-writing-style",
} as const;

export interface ElectronAPI {
  abort: () => Promise<void>;
  chat: (req: ChatRequest) => Promise<void>;
  copy: (text: string) => Promise<void>;
  extractComposeText: () => Promise<string>;
  extractContext: () => Promise<TweetContext | null>;
  getDefaultWritingStyle: () => Promise<string>;
  getModels: () => Promise<ModelOption[]>;
  getProxyInfo: () => Promise<ProxyInfo>;
  getProxyStatus: () => Promise<ProxyStatus>;
  getSettings: () => Promise<AppSettings>;
  getWritingStyle: () => Promise<string>;
  newChat: () => Promise<void>;
  onPageTypeChanged: (cb: (nav: PageNavigation) => void) => () => void;
  onProxyStatus: (cb: (status: ProxyStatus) => void) => () => void;
  onStreamChunk: (cb: (chunk: StreamChunk) => void) => () => void;
  onStreamComplete: (cb: (data: StreamComplete) => void) => () => void;
  onStreamError: (cb: (err: StreamError) => void) => () => void;
  paste: (text: string) => Promise<void>;
  proxyConnect: () => Promise<ProxyStatus>;
  proxyDisconnect: () => Promise<ProxyStatus>;
  proxyTest: (settings: AppSettings) => Promise<ProxyTestResult>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  saveWritingStyle: (style: string) => Promise<void>;
  setModel: (model: string) => Promise<void>;
  setSession: (sessionId: string | null) => Promise<void>;
  toggleOverlay: () => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
