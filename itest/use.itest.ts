import { describe, it, expect } from "vitest";
import path from "node:path";
import fs from "node:fs/promises";
import { execa } from "execa";
import os from "node:os";

// Integration test: optional and experimental; safe to remove without impact.
describe.skip("pwvm use (integration)", () => {
  it("sets the active Playwright version", async () => {
    // Arrange: temp HOME
    const tempHome = await fs.mkdtemp(
      path.join(os.tmpdir(), "pwvm-itest-"),
    );

    const pwvmDir = path.join(tempHome, ".pwvm");
    const versionsDir = path.join(pwvmDir, "versions");
    const version = "1.42.0";

    await fs.mkdir(path.join(versionsDir, version), { recursive: true });

    // Act: run pwvm use
    await execa("node", ["dist/index.js", "use", version], {
      env: {
        ...process.env,
        HOME: tempHome,
        USERPROFILE: tempHome, // windows safety
      },
    });

    // Assert: active version file written
    const activeVersionFile = path.join(pwvmDir, "version");
    const contents = await fs.readFile(activeVersionFile, "utf8");

    expect(contents.trim()).toBe(version);

    // Cleanup
    await fs.rm(tempHome, { recursive: true, force: true });
  });
});
