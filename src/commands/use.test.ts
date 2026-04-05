import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runUseCommand } from "./use.js";
import { createFsMock, createTempPwvmHome } from "../test/utils.js";

describe("runUseCommand", () => {
  const originalExitCode = process.exitCode;
  const originalIsTTY = process.stdout.isTTY;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.exitCode = 0;
    Object.defineProperty(process.stdout, "isTTY", {
      value: false,
      configurable: true,
    });
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
    Object.defineProperty(process.stdout, "isTTY", {
      value: originalIsTTY,
      configurable: true,
    });
    errorSpy.mockRestore();
  });

  it("logs an error and guidance when version is not installed", async () => {
    const version = "1.9999.99999";
    const setActive = vi.fn(async () => {});
    const fsMock = {
      pathExists: vi.fn(async () => false),
    };
    const versionsDir = "/mock/versions";
    const infoSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await runUseCommand(version, { setActive, fs: fsMock, versionsDir });

    expect(process.exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalled();
    const message = String(errorSpy.mock.calls[0][0]);
    expect(message).toContain("[ERROR]:");
    const infoMessage = String(infoSpy.mock.calls[0][0]);
    expect(infoMessage).toContain(`Run \`pwvm install ${version}\` first.`);
    expect(setActive).not.toHaveBeenCalled();
    infoSpy.mockRestore();
  });

  it("uses .pwvmrc when no version argument is provided", async () => {
    const { homeDir, cleanup } = await createTempPwvmHome();
    const version = "1.42.0";
    const versionsDir = path.join(homeDir, ".pwvm", "versions");
    const rcPath = path.join(homeDir, ".pwvmrc");
    const fsMock = createFsMock(homeDir);
    const setActive = vi.fn(async () => {});
    const infoSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    try {
      await fsMock.ensureDir(path.join(versionsDir, version));
      await fsMock.writeFile(rcPath, `${version}\n`, "utf8");

      await runUseCommand(undefined, {
        setActive,
        fs: fsMock,
        setOptions: { homeDir, rcStartDir: homeDir },
      });

      expect(setActive).toHaveBeenCalledWith(
        version,
        expect.objectContaining({ homeDir, rcStartDir: homeDir }),
      );
      expect(String(infoSpy.mock.calls[0][0])).toContain("(from .pwvmrc)");
    } finally {
      infoSpy.mockRestore();
      await cleanup();
    }
  });
});
