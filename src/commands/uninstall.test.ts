import fs from "fs-extra";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import { runUninstallCommand } from "./uninstall.js";
import { createTempPwvmHome } from "../test/utils.js";

describe("runUninstallCommand", () => {
  it("removes the version directory and logs success", async () => {
    const { homeDir, cleanup } = await createTempPwvmHome();
    const originalExitCode = process.exitCode;

    try {
      const versionsDir = path.join(homeDir, ".pwvm", "versions");
      const version = "1.2.3";
      const otherVersion = "2.0.0";
      const versionDir = path.join(versionsDir, version);
      const otherDir = path.join(versionsDir, otherVersion);

      await fs.ensureDir(versionDir);
      await fs.ensureDir(otherDir);

      const logger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      process.exitCode = 0;

      await runUninstallCommand(version, {
        logger,
        uninstallOptions: { versionsDir },
      });

      expect(await fs.pathExists(versionDir)).toBe(false);
      expect(await fs.pathExists(otherDir)).toBe(true);
      expect(process.exitCode).toBe(0);
      expect(logger.info).toHaveBeenCalledWith(
        `Uninstalled Playwright ${version}`,
      );
    } finally {
      process.exitCode = originalExitCode;
      await cleanup();
    }
  });

  it("fails when uninstalling a missing version", async () => {
    const { homeDir, cleanup } = await createTempPwvmHome();
    const originalExitCode = process.exitCode;

    try {
      const versionsDir = path.join(homeDir, ".pwvm", "versions");
      const missingVersion = "1.2.3";
      const otherVersion = "2.0.0";
      const otherDir = path.join(versionsDir, otherVersion);

      await fs.ensureDir(otherDir);

      const logger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      process.exitCode = 0;

      await runUninstallCommand(missingVersion, {
        logger,
        uninstallOptions: { homeDir, versionsDir },
      });

      expect(process.exitCode).toBe(1);
      expect(await fs.pathExists(otherDir)).toBe(true);
      expect(await fs.pathExists(path.join(versionsDir, missingVersion))).toBe(
        false,
      );
      expect(logger.info).not.toHaveBeenCalled();
      const message = String(logger.error.mock.calls[0][0]);
      expect(message).toContain(
        `Playwright version "${missingVersion}" is not installed.`,
      );
      expect(message).toContain("pwvm list");
    } finally {
      process.exitCode = originalExitCode;
      await cleanup();
    }
  });

  it("fails when uninstalling the active version", async () => {
    const { homeDir, cleanup } = await createTempPwvmHome();
    const originalExitCode = process.exitCode;

    try {
      const versionsDir = path.join(homeDir, ".pwvm", "versions");
      const version = "1.2.3";
      const otherVersion = "2.0.0";
      const versionDir = path.join(versionsDir, version);
      const otherDir = path.join(versionsDir, otherVersion);
      const activeVersionFile = path.join(homeDir, ".pwvm", "version");

      await fs.ensureDir(versionDir);
      await fs.ensureDir(otherDir);
      await fs.ensureDir(path.dirname(activeVersionFile));
      await fs.writeFile(activeVersionFile, `${version}\n`, "utf8");

      const logger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      process.exitCode = 0;

      await runUninstallCommand(version, {
        logger,
        uninstallOptions: { homeDir, versionsDir, activeVersionFile },
      });

      expect(process.exitCode).toBe(1);
      expect(await fs.pathExists(versionDir)).toBe(true);
      expect(await fs.pathExists(otherDir)).toBe(true);
      expect(logger.info).not.toHaveBeenCalled();
      const message = String(logger.error.mock.calls[0][0]);
      expect(message).toContain(
        `Playwright version "${version}" is currently active.`,
      );
      expect(message).toContain("pwvm use");
    } finally {
      process.exitCode = originalExitCode;
      await cleanup();
    }
  });

  it("rejects an invalid version without touching the filesystem", async () => {
    const { homeDir, cleanup } = await createTempPwvmHome();
    const originalExitCode = process.exitCode;

    try {
      const versionsDir = path.join(homeDir, ".pwvm", "versions");
      const otherVersion = "2.0.0";
      const otherDir = path.join(versionsDir, otherVersion);

      await fs.ensureDir(otherDir);

      const logger = {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      process.exitCode = 0;

      await runUninstallCommand("not-a-version", {
        logger,
        uninstallOptions: { homeDir, versionsDir },
      });

      expect(process.exitCode).toBe(1);
      expect(await fs.pathExists(otherDir)).toBe(true);
      expect(logger.info).not.toHaveBeenCalled();
      const message = String(logger.error.mock.calls[0][0]);
      expect(message).toContain('Invalid Playwright version "not-a-version".');
    } finally {
      process.exitCode = originalExitCode;
      await cleanup();
    }
  });
});
