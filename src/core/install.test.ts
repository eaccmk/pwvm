import type { Options, ResultPromise } from "execa";
import fs from "fs-extra";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import { installPlaywrightVersion } from "./install.js";
import { createFsMock, createTempPwvmHome } from "../test/utils.js";

const createExecaMock = () =>
  vi.fn<
    (file: string | URL, args?: readonly string[], options?: Options) => ResultPromise<Options>
  >(
    (_file, _args, _options) =>
      Promise.resolve(
        { exitCode: 0 } as unknown as ResultPromise<Options>,
      ) as ResultPromise<Options>,
  ) as unknown as typeof import("execa").execa & ReturnType<typeof vi.fn>;

describe("installPlaywrightVersion", () => {
  it("installs package when version is not installed", async () => {
    const { homeDir, cleanup } = await createTempPwvmHome();

    try {
      const version = "1.2.3";
      const versionsDir = path.join(homeDir, ".pwvm", "versions");
      const targetDir = path.join(versionsDir, version);
      const execaMock = createExecaMock();
      const fsMock = createFsMock(homeDir);

      await installPlaywrightVersion(version, {
        fs: fsMock,
        execa: execaMock,
        versionsDir,
        withBrowsers: false,
      });

      expect(execaMock).toHaveBeenCalledWith(
        "npm",
        ["install", `playwright@${version}`, "--no-save"],
        expect.objectContaining({ cwd: targetDir }),
      );
      expect(await fs.pathExists(targetDir)).toBe(true);
    } finally {
      await cleanup();
    }
  });

  it("errors on invalid version", async () => {
    const { homeDir, cleanup } = await createTempPwvmHome();
    const execaMock = createExecaMock();

    try {
      await expect(
        installPlaywrightVersion("not-a-version", {
          homeDir,
          execa: execaMock,
        }),
      ).rejects.toThrow('Invalid Playwright version "not-a-version".');

      expect(execaMock).not.toHaveBeenCalled();
    } finally {
      await cleanup();
    }
  });

  it("allows browser installation on existing package", async () => {
    const { homeDir, cleanup } = await createTempPwvmHome();

    try {
      const version = "2.0.0";
      const versionsDir = path.join(homeDir, ".pwvm", "versions");
      const targetDir = path.join(versionsDir, version);
      const packageDir = path.join(targetDir, "node_modules", "playwright");
      const execaMock = createExecaMock();
      const installBrowsers = vi.fn(async () => {});
      const fsMock = createFsMock(homeDir);

      await fs.ensureDir(packageDir);

      await installPlaywrightVersion(version, {
        fs: fsMock,
        execa: execaMock,
        versionsDir,
        withBrowsers: true,
        installBrowsers,
      });

      expect(installBrowsers).toHaveBeenCalledWith(
        version,
        expect.objectContaining({ versionsDir }),
      );
    } finally {
      await cleanup();
    }
  });

  it("does not reinstall package twice", async () => {
    const { homeDir, cleanup } = await createTempPwvmHome();

    try {
      const version = "3.1.4";
      const versionsDir = path.join(homeDir, ".pwvm", "versions");
      const targetDir = path.join(versionsDir, version);
      const packageDir = path.join(targetDir, "node_modules", "playwright");
      const browsersDir = path.join(targetDir, "browsers");
      const execaMock = createExecaMock();
      const fsMock = createFsMock(homeDir);

      await installPlaywrightVersion(version, {
        fs: fsMock,
        execa: execaMock,
        versionsDir,
        withBrowsers: false,
      });

      await fs.ensureDir(packageDir);
      await fs.ensureDir(browsersDir);

      await installPlaywrightVersion(version, {
        fs: fsMock,
        execa: execaMock,
        versionsDir,
        withBrowsers: false,
      });

      expect(execaMock).toHaveBeenCalledTimes(1);
    } finally {
      await cleanup();
    }
  });
});
