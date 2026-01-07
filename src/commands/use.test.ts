import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runUseCommand } from "./use.js";

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
});
