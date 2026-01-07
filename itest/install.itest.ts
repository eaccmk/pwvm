import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

// Integration test: optional and experimental; safe to remove without impact.
describe.skip("pwvm install (integration)", () => {
  it("installs a version without browsers", async () => {
    const tempHome = await fs.mkdtemp(path.join(os.tmpdir(), "pwvm-itest-"));
    const version = "1.42.0";
    const distEntry = path.join(process.cwd(), "dist", "index.js");

    try {
      await execFileAsync("node", [distEntry, "install", version, "--no-browsers"], {
        env: {
          ...process.env,
          HOME: tempHome,
          USERPROFILE: tempHome,
        },
      });

      const versionsDir = path.join(tempHome, ".pwvm", "versions", version);
      const browsersDir = path.join(versionsDir, "browsers");

      expect(await pathExists(versionsDir)).toBe(true);
      expect(await pathExists(browsersDir)).toBe(false);
    } finally {
      await fs.rm(tempHome, { recursive: true, force: true });
    }
  });
});

const pathExists = async (target: string): Promise<boolean> => {
  try {
    await fs.stat(target);
    return true;
  } catch {
    return false;
  }
};
