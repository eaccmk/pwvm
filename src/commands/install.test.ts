import * as semver from "semver";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import { runInstallCommand } from "./install.js";
import { fetchPackageMetadata } from "../utils/registry.js";
import { createProgress } from "../utils/progress.js";

vi.mock("../utils/registry.js", () => ({
  fetchPackageMetadata: vi.fn(),
}));

vi.mock("../utils/progress.js", () => ({
  createProgress: vi.fn(),
}));

describe("runInstallCommand", () => {
  const originalExitCode = process.exitCode;
  const originalIsTTY = process.stdout.isTTY;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.exitCode = 0;
    Object.defineProperty(process.stdout, "isTTY", {
      value: false,
      configurable: true,
    });
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.mocked(createProgress).mockReturnValue({
      start: vi.fn(),
      succeed: vi.fn(),
      fail: vi.fn(),
    });
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
    Object.defineProperty(process.stdout, "isTTY", {
      value: originalIsTTY,
      configurable: true,
    });
    errorSpy.mockRestore();
    logSpy.mockRestore();
    vi.mocked(fetchPackageMetadata).mockReset();
    vi.mocked(createProgress).mockReset();
  });

  it("resolves latest to a semver and installs with browsers by default", async () => {
    const installMock = vi.fn(async () => ({
      packageInstalled: true,
      browsersInstalled: true,
      packageAlreadyInstalled: false,
      browsersAlreadyInstalled: false,
    }));

    vi.mocked(fetchPackageMetadata).mockResolvedValue({
      "dist-tags": { latest: "1.42.0" },
    });

    await runInstallCommand("latest", {}, { install: installMock });

    expect(installMock).toHaveBeenCalledTimes(1);
    const [resolvedVersion, options] = installMock.mock.calls[0];
    expect(semver.valid(resolvedVersion)).toBe(resolvedVersion);
    expect(resolvedVersion).toBe("1.42.0");
    expect(options).toEqual(expect.objectContaining({ withBrowsers: true }));
  });

  it("logs an error and exits when install fails for invalid version", async () => {
    const installMock = vi.fn(async () => {
      const error = Object.assign(new Error("npm ERR! code ETARGET"), {
        code: "ETARGET",
      });
      throw error;
    });

    await runInstallCommand("1.9999.99999", {}, { install: installMock });

    expect(process.exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalled();
    const combinedErrors = errorSpy.mock.calls
      .map(([message]) => String(message))
      .join("\n");
    expect(combinedErrors).toContain("[ERROR]:");
    expect(combinedErrors).toContain("Unable to install Playwright");
    expect(combinedErrors).not.toContain("npm ERR");
  });

  it("installs browsers by default", async () => {
    const installMock = vi.fn(async () => ({
      packageInstalled: true,
      browsersInstalled: true,
      packageAlreadyInstalled: false,
      browsersAlreadyInstalled: false,
    }));

    await runInstallCommand("1.2.3", {}, { install: installMock });

    expect(installMock).toHaveBeenCalledWith(
      "1.2.3",
      expect.objectContaining({ withBrowsers: true }),
    );
  });

  it("respects --no-browsers", async () => {
    const installMock = vi.fn(async () => ({
      packageInstalled: true,
      browsersInstalled: false,
      packageAlreadyInstalled: false,
      browsersAlreadyInstalled: false,
    }));

    await runInstallCommand(
      "1.2.3",
      { browsers: false },
      { install: installMock },
    );

    expect(installMock).toHaveBeenCalledWith(
      "1.2.3",
      expect.objectContaining({ withBrowsers: false }),
    );
  });

  it("accepts --with-browsers", async () => {
    const installMock = vi.fn(async () => ({
      packageInstalled: true,
      browsersInstalled: true,
      packageAlreadyInstalled: false,
      browsersAlreadyInstalled: false,
    }));

    await runInstallCommand(
      "1.2.3",
      { browsers: false, withBrowsers: true },
      { install: installMock },
    );

    expect(installMock).toHaveBeenCalledWith(
      "1.2.3",
      expect.objectContaining({ withBrowsers: true }),
    );
  });
});
