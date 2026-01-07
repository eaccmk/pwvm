import { execa } from "execa";
import fs from "fs-extra";
import semver from "semver";
import path from "node:path";
import { installPlaywrightBrowsers } from "./browsers.js";
import { getVersionsDir } from "./paths.js";
import {
  getInstalledVersions,
  type GetInstalledVersionsOptions,
} from "./versions.js";

export type InstallFs = Pick<typeof fs, "ensureDir" | "pathExists" | "remove">;

export type InstallOptions = {
  homeDir?: string;
  versionsDir?: string;
  fs?: InstallFs;
  execa?: typeof execa;
  getVersionsDir?: typeof getVersionsDir;
  getInstalled?: typeof getInstalledVersions;
  installBrowsers?: typeof installPlaywrightBrowsers;
  withBrowsers?: boolean;
  installedOptions?: GetInstalledVersionsOptions;
};

export type InstallResult = {
  packageInstalled: boolean;
  browsersInstalled: boolean;
  packageAlreadyInstalled: boolean;
  browsersAlreadyInstalled: boolean;
};

export const installPlaywrightVersion = async (
  version: string,
  options: InstallOptions = {},
): Promise<InstallResult> => {
  if (!semver.valid(version)) {
    throw new Error(`Invalid Playwright version "${version}".`);
  }

  const fsImpl = options.fs ?? fs;
  const execaImpl = options.execa ?? execa;
  const resolveVersionsDir = options.getVersionsDir ?? getVersionsDir;
  const getInstalled = options.getInstalled ?? getInstalledVersions;
  const installBrowsers = options.installBrowsers ?? installPlaywrightBrowsers;
  const versionsDir = options.versionsDir ?? resolveVersionsDir(options.homeDir);
  const targetDir = path.join(versionsDir, version);
  const packageDir = path.join(targetDir, "node_modules", "playwright");
  const browsersDir = path.join(targetDir, "browsers");

  let packageExists = false;
  let browsersExists = false;
  let cleanupOnFailure = false;
  const result: InstallResult = {
    packageInstalled: false,
    browsersInstalled: false,
    packageAlreadyInstalled: false,
    browsersAlreadyInstalled: false,
  };

  try {
    packageExists = await fsImpl.pathExists(packageDir);
    browsersExists = await fsImpl.pathExists(browsersDir);
    cleanupOnFailure = !packageExists;
    result.packageAlreadyInstalled = packageExists;
    result.browsersAlreadyInstalled = browsersExists;

    let isFirstInstall = false;
    if (!packageExists && options.withBrowsers === undefined) {
      const installedVersions = await getInstalled({
        homeDir: options.homeDir,
        versionsDir: options.versionsDir,
        ...options.installedOptions,
      });
      isFirstInstall = installedVersions.length === 0;
    }

    if (!packageExists) {
      await fsImpl.ensureDir(targetDir);
      await execaImpl("npm", ["install", `playwright@${version}`, "--no-save"], {
        cwd: targetDir,
        env: {
          PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1",
        },
      });
      result.packageInstalled = true;
      result.packageAlreadyInstalled = false;
    }

    const shouldInstallBrowsers =
      (!browsersExists && options.withBrowsers === true) ||
      (options.withBrowsers === undefined && !packageExists && isFirstInstall);

    if (shouldInstallBrowsers) {
      await installBrowsers(version, {
        homeDir: options.homeDir,
        versionsDir: options.versionsDir,
        fs: options.fs,
        execa: options.execa,
        getVersionsDir: options.getVersionsDir,
      });
      result.browsersInstalled = true;
      result.browsersAlreadyInstalled = false;
    }

    return result;
  } catch (error) {
    if (cleanupOnFailure) {
      try {
        await fsImpl.remove(targetDir);
      } catch {
        // Best-effort cleanup.
      }
    }
    throw error;
  }
};
