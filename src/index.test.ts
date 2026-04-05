import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runCLI } from "./index.js";

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows reminder when setup is incomplete and still runs the command", async () => {
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

    vi.stubEnv("PATH", "/usr/bin");

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => { });
    vi.spyOn(console, "log").mockImplementation(() => { });

    let resolveList: (() => void) | null = null;
    const listDone = new Promise<void>((resolve) => {
      resolveList = resolve;
    });
    runListCommandMock.mockImplementation(async () => {
      resolveList?.();
    });

    await runCLI(["node", "pwvm", "list"]);
    await listDone;

    expect(runListCommandMock).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalled();
    const warning = String(warnSpy.mock.calls[0][0]);
    expect(warning).toContain("[WARN]:");
    expect(warning).toContain("pwvm is not set up yet.");

    vi.unstubAllEnvs();
  });

  it("does not show reminder when setup is complete", async () => {
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

    vi.stubEnv("PATH", "/usr/bin");

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => { });

    let resolveList: (() => void) | null = null;
    const listDone = new Promise<void>((resolve) => {
      resolveList = resolve;
    });
    runListCommandMock.mockImplementation(async () => {
      resolveList?.();
    });

    await runCLI(["node", "pwvm", "list"]);
    await listDone;

    expect(runListCommandMock).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalled();

    vi.unstubAllEnvs();
  });
});

describe("commander errors", () => {
  let exitSpy: ReturnType<typeof vi.spyOn> | null = null;
  let errorSpy: ReturnType<typeof vi.spyOn> | null = null;
  let stdoutSpy: ReturnType<typeof vi.spyOn> | null = null;
  let stderrSpy: ReturnType<typeof vi.spyOn> | null = null;
  let logSpy: ReturnType<typeof vi.spyOn> | null = null;
  let infoSpy: ReturnType<typeof vi.spyOn> | null = null;

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation((() => true) as any);
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation((() => true) as any);
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    if (stdoutSpy) {
      stdoutSpy.mockRestore();
      stdoutSpy = null;
    }
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
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => { });
    exitSpy = vi.spyOn(process, "exit").mockImplementation((() => { }) as never);

    process.exitCode = 0;

    await runCLI(["node", "pwvm", "uninstall"]);

    expect(errorSpy).toHaveBeenCalled();
    const message = String(errorSpy.mock.calls[0][0]);
    expect(message).toContain("[ERROR]:");
    expect(message).toContain('Missing required argument "version".');
    expect(message).not.toContain("error:");
    expect(process.exitCode).not.toBe(0);
  });

  it("does not log help output as an error", async () => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => { });
    exitSpy = vi.spyOn(process, "exit").mockImplementation((() => { }) as never);

    await runCLI(["node", "pwvm", "help"]);

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("prints version without logging an error", async () => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => { });
    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    await runCLI(["node", "pwvm", "--version"]);

    expect(errorSpy).not.toHaveBeenCalled();
  });
});
