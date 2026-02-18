import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { app, screen } from "electron";
import { MIN_WINDOW_HEIGHT, MIN_WINDOW_WIDTH } from "./constants";

export interface WindowState {
  height: number;
  width: number;
  x: number;
  y: number;
}

const SETTINGS_DIR = join(app.getPath("home"), ".config", "x-app");
const STATE_PATH = join(SETTINGS_DIR, "window-state.json");

export function loadWindowState(): WindowState | null {
  try {
    const raw = readFileSync(STATE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<WindowState>;

    if (
      typeof parsed.x !== "number" ||
      typeof parsed.y !== "number" ||
      typeof parsed.width !== "number" ||
      typeof parsed.height !== "number"
    ) {
      return null;
    }

    const state: WindowState = {
      x: parsed.x,
      y: parsed.y,
      width: Math.max(parsed.width, MIN_WINDOW_WIDTH),
      height: Math.max(parsed.height, MIN_WINDOW_HEIGHT),
    };

    if (!isBoundsOnScreen(state)) {
      return null;
    }

    return state;
  } catch {
    return null;
  }
}

export function saveWindowState(bounds: Electron.Rectangle): void {
  mkdirSync(SETTINGS_DIR, { recursive: true });
  const state: WindowState = {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  };
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf-8");
}

function isBoundsOnScreen(bounds: WindowState): boolean {
  const display = screen.getDisplayMatching(bounds);
  const { x, y, width, height } = display.workArea;

  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;

  return (
    centerX >= x &&
    centerX <= x + width &&
    centerY >= y &&
    centerY <= y + height
  );
}
