import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";
import type { AppSettings } from "../shared/types";

const SETTINGS_DIR = join(app.getPath("home"), ".config", "x-app");
const SETTINGS_PATH = join(SETTINGS_DIR, "settings.json");

export const DEFAULT_WRITING_STYLE = `# Agent Context

You are helping the user grow on X/Twitter.

## About the user

- describe who you are and what you do
- what topics you post about
- your audience and language
- your goals on the platform

## Writing style

- informal and conversational
- short, punchy sentences
- under 280 chars for tweets
- sounds human, never robotic or corporate
- add your own rules here (capitalization, emoji usage, tone, etc.)

## Reference posts

Paste 3-5 of your best posts so the AI can match your voice:

- "your example post here"
- "another example post here"
- "one more example post here"`;

export function loadSettings(): AppSettings {
  try {
    const raw = readFileSync(SETTINGS_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      model: parsed.model ?? "claude-sonnet-4-6",
      sshHost: parsed.sshHost ?? "",
      sshUser: parsed.sshUser ?? "",
      writingStyle: parsed.writingStyle ?? DEFAULT_WRITING_STYLE,
    };
  } catch {
    return {
      model: "claude-sonnet-4-6",
      sshHost: "",
      sshUser: "",
      writingStyle: DEFAULT_WRITING_STYLE,
    };
  }
}

export function saveSettings(settings: AppSettings): void {
  mkdirSync(SETTINGS_DIR, { recursive: true });
  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf-8");
}
