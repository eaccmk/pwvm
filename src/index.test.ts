import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("fs-extra", () => ({
  default: {
    pathExists: vi.fn(),
  },
}));

vi.mock("./core/paths.js", () => ({
  getPwvmDir: vi.fn(),
  getShimsDir: vi.fn(),
}));

vi.mock("./commands/list.js", () => ({
  runListCommand: vi.fn(),
}));

describe("setup reminder", () => {
  const originalArgv = process.argv.slice();
  const originalPath = process.env.PATH;
  const originalExitCode = process.exitCode;
  const originalIsTTY = process.stdout.isTTY;

  afterEach(() => {
    process.argv = originalArgv.slice();
    process.env.PATH = originalPath;
    process.exitCode = originalExitCode;
    Object.defineProperty(process.stdout, "isTTY", {
      value: originalIsTTY,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  it("shows reminder when setup is incomplete and still runs the command", async () => {
    vi.resetModules();
    Object.defineProperty(process.stdout, "isTTY", {
      value: false,
      configurable: true,
    });

    const fsExtra = await import("fs-extra");
    const paths = await import("./core/paths.js");
    const listModule = await import("./commands/list.js");
    const pathExistsMock = vi.mocked(fsExtra.default.pathExists);
    const getPwvmDirMock = vi.mocked(paths.getPwvmDir);
    const getShimsDirMock = vi.mocked(paths.getShimsDir);
    const runListCommandMock = vi.mocked(listModule.runListCommand);

    const pwvmDir = "/mock/pwvm";
    const shimsDir = "/mock/pwvm/shims";

    getPwvmDirMock.mockReturnValue(pwvmDir);
    getShimsDirMock.mockReturnValue(shimsDir);
    pathExistsMock.mockResolvedValue(false);

    process.env.PATH = "/usr/bin";
    process.argv = ["node", "pwvm", "list"];

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => { });
    vi.spyOn(console, "log").mockImplementation(() => { });

    let resolveList: (() => void) | null = null;
    const listDone = new Promise<void>((resolve) => {
      resolveList = resolve;
    });
    runListCommandMock.mockImplementation(async () => {
      resolveList?.();
    });

    await import("./index.js");
    await listDone;

    expect(runListCommandMock).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalled();
    const warning = String(warnSpy.mock.calls[0][0]);
    expect(warning).toContain("[WARN]:");
    expect(warning).toContain("pwvm is not set up yet.");

  });

  it("does not show reminder when setup is complete", async () => {
    vi.resetModules();
    Object.defineProperty(process.stdout, "isTTY", {
      value: false,
      configurable: true,
    });

    const fsExtra = await import("fs-extra");
    const paths = await import("./core/paths.js");
    const listModule = await import("./commands/list.js");
    const pathExistsMock = vi.mocked(fsExtra.default.pathExists);
    const getPwvmDirMock = vi.mocked(paths.getPwvmDir);
    const getShimsDirMock = vi.mocked(paths.getShimsDir);
    const runListCommandMock = vi.mocked(listModule.runListCommand);

    const pwvmDir = "/mock/pwvm";
    const shimsDir = "/mock/pwvm/shims";
    const markerPath = path.join(pwvmDir, "setup-complete");

    getPwvmDirMock.mockReturnValue(pwvmDir);
    getShimsDirMock.mockReturnValue(shimsDir);
    pathExistsMock.mockImplementation(async (target) => {
      const value = String(target);
      return value === markerPath;
    });

    process.env.PATH = "/usr/bin";
    process.argv = ["node", "pwvm", "list"];

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => { });

    let resolveList: (() => void) | null = null;
    const listDone = new Promise<void>((resolve) => {
      resolveList = resolve;
    });
    runListCommandMock.mockImplementation(async () => {
      resolveList?.();
    });

    await import("./index.js");
    await listDone;

    expect(runListCommandMock).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalled();

  });
});

describe("commander errors", () => {
  const originalArgv = process.argv.slice();
  const originalExitCode = process.exitCode;
  const originalIsTTY = process.stdout.isTTY;
  let exitSpy: ReturnType<typeof vi.spyOn> | null = null;
  let errorSpy: ReturnType<typeof vi.spyOn> | null = null;

  afterEach(() => {
    process.argv = originalArgv.slice();
    process.exitCode = originalExitCode;
    Object.defineProperty(process.stdout, "isTTY", {
      value: originalIsTTY,
      configurable: true,
    });
    if (exitSpy) {
      exitSpy.mockRestore();
      exitSpy = null;
    }
    if (errorSpy) {
      errorSpy.mockRestore();
      errorSpy = null;
    }
    vi.restoreAllMocks();
  });

  it("logs missing argument errors through the logger", async () => {
    vi.resetModules();
    Object.defineProperty(process.stdout, "isTTY", {
      value: false,
      configurable: true,
    });

    process.argv = ["node", "pwvm", "uninstall"];
    process.exitCode = 0;

    errorSpy = vi.spyOn(console, "error").mockImplementation(() => { });
    exitSpy = vi.spyOn(process, "exit").mockImplementation((() => { }) as never);

    await import("./index.js");
    await new Promise((resolve) => setImmediate(resolve));

    expect(errorSpy).toHaveBeenCalled();
    const message = String(errorSpy.mock.calls[0][0]);
    expect(message).toContain("[ERROR]:");
    expect(message).toContain('Missing required argument "version".');
    expect(message).not.toContain("error:");
    expect(process.exitCode).not.toBe(0);
  });

  it("does not log help output as an error", async () => {
    vi.resetModules();
    Object.defineProperty(process.stdout, "isTTY", {
      value: false,
      configurable: true,
    });

    process.argv = ["node", "pwvm", "help"];
    process.exitCode = 0;

    errorSpy = vi.spyOn(console, "error").mockImplementation(() => { });
    exitSpy = vi.spyOn(process, "exit").mockImplementation((() => { }) as never);

    await import("./index.js");
    await new Promise((resolve) => setImmediate(resolve));

    expect(errorSpy).not.toHaveBeenCalled();
  });


  it("prints version without logging an error", async () => {
    vi.resetModules();

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => { });
    vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    process.argv = ["node", "pwvm", "--version"];

    try {
      await import("./index.js");
    } catch {
      // Commander may exit — ignore
    }

    await new Promise((resolve) => setImmediate(resolve));

    // ✅ The ONLY thing that matters
    expect(errorSpy).not.toHaveBeenCalled();
  });

});
