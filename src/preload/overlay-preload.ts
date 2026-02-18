import { contextBridge, ipcRenderer } from "electron";
import type {
  AppSettings,
  ChatRequest,
  ElectronAPI,
  PageNavigation,
  ProxyStatus,
  StreamChunk,
  StreamComplete,
  StreamError,
} from "../shared/types";
import { IPC } from "../shared/types";

const api: ElectronAPI = {
  extractContext: () => ipcRenderer.invoke(IPC.EXTRACT_CONTEXT),
  extractComposeText: () => ipcRenderer.invoke(IPC.EXTRACT_COMPOSE_TEXT),
  chat: (req: ChatRequest) => ipcRenderer.invoke(IPC.CHAT, req),
  newChat: () => ipcRenderer.invoke(IPC.NEW_CHAT),
  abort: () => ipcRenderer.invoke(IPC.ABORT),
  paste: (text: string) => ipcRenderer.invoke(IPC.PASTE, text),
  copy: (text: string) => ipcRenderer.invoke(IPC.COPY, text),
  toggleOverlay: () => ipcRenderer.invoke(IPC.TOGGLE_OVERLAY),

  onStreamChunk: (cb: (chunk: StreamChunk) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, chunk: StreamChunk) =>
      cb(chunk);
    ipcRenderer.on(IPC.STREAM_CHUNK, handler);
    return () => ipcRenderer.removeListener(IPC.STREAM_CHUNK, handler);
  },
  onStreamComplete: (cb: (data: StreamComplete) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, data: StreamComplete) =>
      cb(data);
    ipcRenderer.on(IPC.STREAM_COMPLETE, handler);
    return () => ipcRenderer.removeListener(IPC.STREAM_COMPLETE, handler);
  },
  onStreamError: (cb: (err: StreamError) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, err: StreamError) =>
      cb(err);
    ipcRenderer.on(IPC.STREAM_ERROR, handler);
    return () => ipcRenderer.removeListener(IPC.STREAM_ERROR, handler);
  },
  onPageTypeChanged: (cb: (nav: PageNavigation) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, nav: PageNavigation) =>
      cb(nav);
    ipcRenderer.on(IPC.PAGE_TYPE_CHANGED, handler);
    return () => ipcRenderer.removeListener(IPC.PAGE_TYPE_CHANGED, handler);
  },
  setSession: (sessionId: string | null) =>
    ipcRenderer.invoke(IPC.SET_SESSION, sessionId),
  getModels: () => ipcRenderer.invoke(IPC.GET_MODELS),
  setModel: (model: string) => ipcRenderer.invoke(IPC.SET_MODEL, model),
  getProxyInfo: () => ipcRenderer.invoke(IPC.PROXY_INFO),
  getProxyStatus: () => ipcRenderer.invoke(IPC.GET_PROXY_STATUS),
  getSettings: () => ipcRenderer.invoke(IPC.GET_SETTINGS),
  saveSettings: (settings: AppSettings) =>
    ipcRenderer.invoke(IPC.SAVE_SETTINGS, settings),
  getDefaultWritingStyle: () =>
    ipcRenderer.invoke(IPC.GET_DEFAULT_WRITING_STYLE),
  getWritingStyle: () => ipcRenderer.invoke(IPC.GET_WRITING_STYLE),
  saveWritingStyle: (style: string) =>
    ipcRenderer.invoke(IPC.SAVE_WRITING_STYLE, style),
  proxyConnect: () => ipcRenderer.invoke(IPC.PROXY_CONNECT),
  proxyDisconnect: () => ipcRenderer.invoke(IPC.PROXY_DISCONNECT),
  proxyTest: (settings: AppSettings) =>
    ipcRenderer.invoke(IPC.PROXY_TEST, settings),
  onProxyStatus: (cb: (status: ProxyStatus) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, status: ProxyStatus) =>
      cb(status);
    ipcRenderer.on(IPC.PROXY_STATUS, handler);
    return () => ipcRenderer.removeListener(IPC.PROXY_STATUS, handler);
  },
};

contextBridge.exposeInMainWorld("electronAPI", api);
