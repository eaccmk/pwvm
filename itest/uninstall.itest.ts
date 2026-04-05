import { describe, it, expect } from "vitest";
import path from "node:path";
import fs from "node:fs/promises";
import { execa } from "execa";
import os from "node:os";

describe("pwvm uninstall (integration)", () => {
  it("fails when uninstalling the active version", async () => {
    // Arrange: temp HOME
    const tempHome = await fs.mkdtemp(
      path.join(os.tmpdir(), "pwvm-itest-"),
    );

    const pwvmDir = path.join(tempHome, ".pwvm");
    const versionsDir = path.join(pwvmDir, "versions");
    const version = "1.42.0";

    await fs.mkdir(path.join(versionsDir, version), { recursive: true });
    
    // Set active version
    const activeVersionFile = path.join(pwvmDir, "version");
    await fs.writeFile(activeVersionFile, version, "utf8");

    try {
      // Act: run pwvm uninstall
      await execa("node", ["dist/index.js", "uninstall", version], {
        env: {
          ...process.env,
          HOME: tempHome,
          NODE_ENV: "production",
          USERPROFILE: tempHome, // windows safety
        },
      });
      // Should throw an error before this
      expect.unreachable("Uninstall should have failed");
    } catch (error: any) {
      // Assert: The exit code should be non-zero and the error should be printed
      expect(error.exitCode).toBe(1);
      expect(error.stderr).toContain(`Playwright version "${version}" is currently active`);
    } finally {
      // Cleanup
      await fs.rm(tempHome, { recursive: true, force: true });
    }
  });

  it("removes a non-active version successfully", async () => {
    // Arrange: temp HOME
    const tempHome = await fs.mkdtemp(
      path.join(os.tmpdir(), "pwvm-itest-"),
    );

    const pwvmDir = path.join(tempHome, ".pwvm");
    const versionsDir = path.join(pwvmDir, "versions");
    const version = "1.42.0";

    await fs.mkdir(path.join(versionsDir, version), { recursive: true });

    try {
      // Act: run pwvm uninstall
      const result = await execa("node", ["dist/index.js", "uninstall", version], {
        env: {
          ...process.env,
          HOME: tempHome,
          NODE_ENV: "production",
          USERPROFILE: tempHome, // windows safety
        },
      });
      
      expect(result.exitCode).toBe(0);
      
      // Assert: directory was removed
      const dirExists = await fs.stat(path.join(versionsDir, version)).then(() => true).catch(() => false);
      expect(dirExists).toBe(false);
    } finally {
      // Cleanup
      await fs.rm(tempHome, { recursive: true, force: true });
    }
  });
});
