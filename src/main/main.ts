import path from "node:path";
import { config } from "dotenv";
import { app, globalShortcut, ipcMain, nativeImage } from "electron";
import { IPC } from "../shared/types";
import { destroyGeoProxy } from "./geo-proxy";
import { registerIpcHandlers } from "./ipc-handlers";
import { removePartitionLockFiles } from "./partition-cleanup";
import { loadSettings } from "./settings";
import { createAppViews, layoutViews } from "./views";
import { loadWindowState, saveWindowState } from "./window-state";

process.on("uncaughtException", (err) => {
  console.error("[main] Uncaught exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("[main] Unhandled rejection:", reason);
});

let overlayVisible = true;

app.whenReady().then(async () => {
  // Load env from stable config location (packaged) or project root (dev)
  const envPaths = [
    path.join(app.getPath("home"), ".config", "x-app", ".env"),
    path.join(app.getAppPath(), ".env"),
  ];
  for (const p of envPaths) {
    if (config({ path: p, quiet: true }).parsed) {
      break;
    }
  }

  // Finder-launched apps have minimal PATH — add common Node.js locations
  if (app.isPackaged) {
    process.env.PATH = [process.env.PATH, "/usr/local/bin", "/opt/homebrew/bin"]
      .filter(Boolean)
      .join(":");
  }

  if (process.platform === "darwin" && app.dock) {
    app.dock.setIcon(
      nativeImage.createFromPath(
        path.join(import.meta.dirname, "../../assets/icon.png")
      )
    );
  }

  removePartitionLockFiles();
  const settings = loadSettings();
  const sshHost = settings.sshHost || process.env.SSH_HOST || "";
  const sshUser = settings.sshUser || process.env.SSH_USER || "";
  const savedBounds = loadWindowState();
  const views = await createAppViews(sshHost, sshUser, savedBounds);
  registerIpcHandlers(views);

  const toggleOverlay = () => {
    overlayVisible = !overlayVisible;
    layoutViews(
      views.window,
      views.titlebarView,
      views.twitterView,
      views.overlayView,
      overlayVisible
    );
  };

  const TOGGLE_SHORTCUT = "CommandOrControl+S";

  views.window.on("focus", () => {
    if (!globalShortcut.isRegistered(TOGGLE_SHORTCUT)) {
      globalShortcut.register(TOGGLE_SHORTCUT, toggleOverlay);
    }
  });

  views.window.on("blur", () => {
    globalShortcut.unregister(TOGGLE_SHORTCUT);
  });

  ipcMain.handle(IPC.TOGGLE_OVERLAY, toggleOverlay);

  views.window.on("close", () => {
    saveWindowState(views.window.getBounds());
  });

  views.window.on("closed", () => {
    globalShortcut.unregisterAll();
  });
});

app.on("window-all-closed", () => {
  destroyGeoProxy();
  app.quit();
});
