import type { Options, ResultPromise } from "execa";
import fs from "fs-extra";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runPlaywrightShim } from "./shim.js";
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

afterEach(() => {
  process.exitCode = undefined;
});

describe("runPlaywrightShim", () => {
  it("errors when no active version", async () => {
    const { homeDir, cleanup } = await createTempPwvmHome();
    const execaMock = createExecaMock();

    try {
      await expect(
        runPlaywrightShim(["install"], {
          fs: createFsMock(homeDir),
          execa: execaMock,
          getResolvedActiveVersion: async () => null,
        }),
      ).rejects.toThrow(
        "No active Playwright version. Run `pwvm use <version>`.",
      );

      expect(execaMock).not.toHaveBeenCalled();
    } finally {
      await cleanup();
    }
  });

  it("resolves correct Playwright binary", async () => {
    const { homeDir, cleanup } = await createTempPwvmHome();

    try {
      const version = "1.42.0";
      const versionsDir = path.join(homeDir, ".pwvm", "versions");
      const expectedBinary = path.join(
        versionsDir,
        version,
        "node_modules",
        ".bin",
        "playwright",
      );
      const execaMock = createExecaMock();

      await fs.ensureDir(path.dirname(expectedBinary));
      await fs.writeFile(expectedBinary, "");

      await runPlaywrightShim(["install"], {
        fs: createFsMock(homeDir),
        execa: execaMock,
        versionsDir,
        getResolvedActiveVersion: async () => version,
      });

      expect(execaMock).toHaveBeenCalledWith(
        expectedBinary,
        ["install"],
        expect.any(Object),
      );
    } finally {
      await cleanup();
    }
  });

  it("injects PLAYWRIGHT_BROWSERS_PATH", async () => {
    const { homeDir, cleanup } = await createTempPwvmHome();

    try {
      const version = "1.42.0";
      const versionsDir = path.join(homeDir, ".pwvm", "versions");
      const expectedBinary = path.join(
        versionsDir,
        version,
        "node_modules",
        ".bin",
        "playwright",
      );
      const expectedBrowsers = path.join(versionsDir, version, "browsers");
      const execaMock = createExecaMock();

      await fs.ensureDir(path.dirname(expectedBinary));
      await fs.writeFile(expectedBinary, "");

      await runPlaywrightShim(["install"], {
        fs: createFsMock(homeDir),
        execa: execaMock,
        versionsDir,
        getResolvedActiveVersion: async () => version,
      });

      expect(execaMock).toHaveBeenCalledWith(
        expectedBinary,
        ["install"],
        expect.objectContaining({
          env: expect.objectContaining({
            PLAYWRIGHT_BROWSERS_PATH: expectedBrowsers,
          }),
        }),
      );
    } finally {
      await cleanup();
    }
  });
});
