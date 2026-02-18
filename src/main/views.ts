import path from "node:path";
import {
  BaseWindow,
  nativeImage,
  nativeTheme,
  session,
  shell,
  WebContentsView,
} from "electron";
import {
  DEFAULT_WINDOW_HEIGHT,
  DEFAULT_WINDOW_WIDTH,
  MIN_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
  OVERLAY_COLLAPSED_WIDTH,
  OVERLAY_WIDTH,
  TITLEBAR_HEIGHT,
} from "./constants";
import { initGeoProxy } from "./geo-proxy";
import type { WindowState } from "./window-state";

declare const OVERLAY_PANEL_VITE_DEV_SERVER_URL: string | undefined;
declare const OVERLAY_PANEL_VITE_NAME: string;

const CHROME_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const WWW_PREFIX_REGEX = /^www\./;

const ALLOWED_AUTH_HOSTS = new Set([
  "x.com",
  "twitter.com",
  "api.twitter.com",
  "accounts.google.com",
  "appleid.apple.com",
]);

const TITLEBAR_HTML =
  "data:text/html,<style>html,body{margin:0;height:100%;overflow:hidden;background:transparent;-webkit-app-region:drag}</style>";

export interface AppViews {
  overlayView: WebContentsView;
  titlebarView: WebContentsView;
  twitterView: WebContentsView;
  window: BaseWindow;
}

export async function createAppViews(
  sshHost: string,
  sshUser: string,
  savedBounds?: WindowState | null
): Promise<AppViews> {
  const icon = nativeImage.createFromPath(
    path.join(import.meta.dirname, "../../assets/icon.png")
  );

  const window = new BaseWindow({
    width: savedBounds?.width ?? DEFAULT_WINDOW_WIDTH,
    height: savedBounds?.height ?? DEFAULT_WINDOW_HEIGHT,
    ...(savedBounds ? { x: savedBounds.x, y: savedBounds.y } : {}),
    minWidth: MIN_WINDOW_WIDTH,
    minHeight: MIN_WINDOW_HEIGHT,
    titleBarStyle: "hiddenInset",
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#000000" : "#ffffff",
    icon,
  });

  const twitterSession = session.fromPartition("persist:twitter");
  twitterSession.setUserAgent(CHROME_UA);

  const twitterView = new WebContentsView({
    webPreferences: {
      session: twitterSession,
      sandbox: true,
    },
  });

  const overlayView = new WebContentsView({
    webPreferences: {
      preload: path.join(import.meta.dirname, "overlay-preload.js"),
      sandbox: true,
    },
  });

  const titlebarView = new WebContentsView({
    webPreferences: { sandbox: true },
  });
  titlebarView.setBackgroundColor("#00000000");
  titlebarView.webContents.loadURL(TITLEBAR_HTML);

  window.contentView.addChildView(twitterView);
  window.contentView.addChildView(overlayView);
  window.contentView.addChildView(titlebarView);

  nativeTheme.on("updated", () => {
    window.setBackgroundColor(
      nativeTheme.shouldUseDarkColors ? "#000000" : "#ffffff"
    );
  });

  layoutViews(window, titlebarView, twitterView, overlayView, true);

  window.on("resize", () => {
    layoutViews(
      window,
      titlebarView,
      twitterView,
      overlayView,
      overlayView.getBounds().width > OVERLAY_COLLAPSED_WIDTH
    );
  });

  twitterView.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const host = new URL(url).hostname.replace(WWW_PREFIX_REGEX, "");
      if (ALLOWED_AUTH_HOSTS.has(host)) {
        return { action: "allow" };
      }
    } catch {
      /* invalid URL */
    }
    shell.openExternal(url);
    return { action: "deny" };
  });

  await initGeoProxy(twitterSession, sshHost, sshUser).catch((err) =>
    console.error(
      "[geo-proxy] Failed to init, loading X.com without proxy:",
      err.message
    )
  );

  twitterView.webContents.loadURL("https://x.com");
  loadOverlay(overlayView);

  return { window, titlebarView, twitterView, overlayView };
}

export function layoutViews(
  window: BaseWindow,
  titlebarView: WebContentsView,
  twitterView: WebContentsView,
  overlayView: WebContentsView,
  showOverlay: boolean
) {
  const { width, height } = window.getContentBounds();
  const overlayW = showOverlay ? OVERLAY_WIDTH : OVERLAY_COLLAPSED_WIDTH;
  const twitterW = width - overlayW;
  const viewHeight = height - TITLEBAR_HEIGHT;

  titlebarView.setBounds({ x: 0, y: 0, width, height: TITLEBAR_HEIGHT });
  twitterView.setBounds({
    x: 0,
    y: TITLEBAR_HEIGHT,
    width: twitterW,
    height: viewHeight,
  });
  overlayView.setBounds({
    x: twitterW,
    y: TITLEBAR_HEIGHT,
    width: overlayW,
    height: viewHeight,
  });
}

function loadOverlay(view: WebContentsView) {
  if (OVERLAY_PANEL_VITE_DEV_SERVER_URL) {
    view.webContents.loadURL(OVERLAY_PANEL_VITE_DEV_SERVER_URL);
  } else {
    view.webContents.loadFile(
      path.join(
        import.meta.dirname,
        `../renderer/${OVERLAY_PANEL_VITE_NAME}/index.html`
      )
    );
  }
}
