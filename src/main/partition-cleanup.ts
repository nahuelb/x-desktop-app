import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

/**
 * Remove stale LevelDB LOCK files from the twitter partition.
 * Must be called BEFORE session.fromPartition() to prevent IO errors
 * that cause X.com to get stuck on its splash screen.
 * Cookies (SQLite) are unaffected — login session is preserved.
 */
export function removePartitionLockFiles(): void {
  const partitionDir = path.join(
    app.getPath("userData"),
    "Partitions",
    "twitter"
  );

  if (!fs.existsSync(partitionDir)) {
    return;
  }

  try {
    const entries = fs.readdirSync(partitionDir, {
      recursive: true,
      withFileTypes: true,
    });

    for (const entry of entries) {
      if (entry.name !== "LOCK" || !entry.isFile()) {
        continue;
      }
      const lockPath = path.join(entry.parentPath, entry.name);
      try {
        fs.unlinkSync(lockPath);
      } catch {
        // Already removed or permission issue — not fatal
      }
    }
  } catch {
    // Partition dir unreadable — first launch or already clean
  }
}
