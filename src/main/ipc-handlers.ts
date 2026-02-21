import { clipboard, ipcMain } from "electron";
import type { AppSettings, ChatRequest, PageType } from "../shared/types";
import { IPC } from "../shared/types";
import { injectAdBlocker } from "./ad-blocker";
import {
  abortCurrentSession,
  chat,
  getAvailableModels,
  newChat,
  setSessionId,
} from "./agent";
import {
  destroyGeoProxy,
  initGeoProxy,
  isProxyConnected,
  testSshConnection,
} from "./geo-proxy";
import { DEFAULT_WRITING_STYLE, loadSettings, saveSettings } from "./settings";
import {
  extractComposeText,
  extractTweetContext,
  pasteIntoCompose,
} from "./tweet-extractor";
import type { AppViews } from "./views";

function classifyUrl(url: string): PageType {
  try {
    const path = new URL(url).pathname;
    if (path.includes("/status/")) {
      return "post";
    }
    if (path === "/home" || path === "/") {
      return "timeline";
    }
    return "other";
  } catch {
    return "other";
  }
}

export function registerIpcHandlers(views: AppViews) {
  const { twitterView, overlayView } = views;
  const send = (channel: string, data: unknown) =>
    overlayView.webContents.send(channel, data);

  ipcMain.handle(IPC.EXTRACT_CONTEXT, () => extractTweetContext(twitterView));
  ipcMain.handle(IPC.EXTRACT_COMPOSE_TEXT, () =>
    extractComposeText(twitterView)
  );

  ipcMain.handle(IPC.CHAT, async (_e, req: ChatRequest) => {
    const onChunk = (text: string) => send(IPC.STREAM_CHUNK, { text });

    // Auto-extract tweet context when on a post page and none was provided
    let tweetContext = req.tweetContext;
    if (!tweetContext) {
      const url = twitterView.webContents.getURL();
      if (classifyUrl(url) === "post") {
        tweetContext = (await extractTweetContext(twitterView)) ?? undefined;
      }
    }

    try {
      const result = await chat(req.message, onChunk, tweetContext, req.images);
      send(IPC.STREAM_COMPLETE, {
        fullText: result.fullText,
        sessionId: result.sessionId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (!message.includes("abort")) {
        send(IPC.STREAM_ERROR, { message });
      }
    }
  });

  ipcMain.handle(IPC.NEW_CHAT, () => newChat());
  ipcMain.handle(IPC.SET_SESSION, (_e, sessionId: string | null) =>
    setSessionId(sessionId)
  );
  ipcMain.handle(IPC.ABORT, () => abortCurrentSession());

  ipcMain.handle(IPC.PASTE, async (_e, text: string) => {
    const ok = await pasteIntoCompose(twitterView, text);
    if (!ok) {
      throw new Error("No compose box found. Open a reply or new post first.");
    }
  });

  ipcMain.handle(IPC.COPY, (_e, text: string) => {
    clipboard.writeText(text);
  });

  ipcMain.handle(IPC.GET_PROXY_STATUS, () => ({
    connected: isProxyConnected(),
  }));

  ipcMain.handle(IPC.PROXY_INFO, async () => {
    const resp = await twitterView.webContents.session.fetch(
      "http://ip-api.com/json/"
    );
    return resp.json();
  });

  ipcMain.handle(IPC.GET_SETTINGS, () => loadSettings());

  ipcMain.handle(IPC.SAVE_SETTINGS, (_e, settings: AppSettings) => {
    const current = loadSettings();
    saveSettings({ ...current, ...settings });
  });

  ipcMain.handle(IPC.PROXY_CONNECT, async () => {
    const twitterSession = twitterView.webContents.session;
    await destroyGeoProxy(twitterSession);
    const settings = loadSettings();
    try {
      await initGeoProxy(twitterSession, settings.sshHost, settings.sshUser);
      send(IPC.PROXY_STATUS, { connected: true });
      return { connected: true };
    } catch (err) {
      send(IPC.PROXY_STATUS, { connected: false });
      throw err instanceof Error ? err : new Error("Connection failed");
    }
  });

  ipcMain.handle(IPC.PROXY_DISCONNECT, async () => {
    const twitterSession = twitterView.webContents.session;
    await destroyGeoProxy(twitterSession);
    send(IPC.PROXY_STATUS, { connected: false });
    return { connected: false };
  });

  ipcMain.handle(IPC.PROXY_TEST, (_e, settings: AppSettings) =>
    testSshConnection(settings.sshHost, settings.sshUser)
  );

  ipcMain.handle(IPC.GET_MODELS, () => getAvailableModels());

  ipcMain.handle(IPC.GET_WRITING_STYLE, () => loadSettings().writingStyle);

  ipcMain.handle(IPC.SAVE_WRITING_STYLE, (_e, style: string) => {
    const current = loadSettings();
    saveSettings({ ...current, writingStyle: style });
  });

  ipcMain.handle(IPC.GET_DEFAULT_WRITING_STYLE, () => DEFAULT_WRITING_STYLE);

  ipcMain.handle(IPC.SET_MODEL, (_e, model: string) => {
    const current = loadSettings();
    saveSettings({ ...current, model });
  });

  const pushPageType = (_e: unknown, url: string) =>
    send(IPC.PAGE_TYPE_CHANGED, { pageType: classifyUrl(url), url });
  twitterView.webContents.on("did-navigate-in-page", pushPageType);
  twitterView.webContents.on("did-navigate", (e, url) => {
    pushPageType(e, url);
    injectAdBlocker(twitterView);
  });
  twitterView.webContents.on("dom-ready", () => injectAdBlocker(twitterView));
}
