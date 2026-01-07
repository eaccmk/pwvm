import { execa } from "execa";
import fs from "fs-extra";
import path from "node:path";
import { getVersionsDir } from "./paths.js";
import {
  getResolvedActiveVersion,
  type GetResolvedActiveVersionOptions,
} from "./versions.js";

export type ShimFs = Pick<typeof fs, "pathExists">;

export type RunShimOptions = {
  homeDir?: string;
  versionsDir?: string;
  fs?: ShimFs;
  execa?: typeof execa;
  getVersionsDir?: typeof getVersionsDir;
  getResolvedActiveVersion?: typeof getResolvedActiveVersion;
  activeOptions?: GetResolvedActiveVersionOptions;
};

export const runPlaywrightShim = async (
  args: string[],
  options: RunShimOptions = {},
): Promise<void> => {
  const resolveVersionsDir = options.getVersionsDir ?? getVersionsDir;
  const execaImpl = options.execa ?? execa;
  const fsImpl = options.fs ?? fs;
  const resolveActive =
    options.getResolvedActiveVersion ?? getResolvedActiveVersion;

  const activeVersion = await resolveActive(options.activeOptions);
  if (!activeVersion) {
    throw new Error("No active Playwright version. Run `pwvm use <version>`.");
  }

  const versionsDir = options.versionsDir ?? resolveVersionsDir(options.homeDir);
  const versionDir = path.join(versionsDir, activeVersion);
  const binaryPath = path.join(versionDir, "node_modules", ".bin", "playwright");
  const binaryExists = await fsImpl.pathExists(binaryPath);

  if (!binaryExists) {
    throw new Error(`Playwright ${activeVersion} is not installed.`);
  }

  const browsersDir = path.join(versionDir, "browsers");
  const result = await execaImpl(binaryPath, args, {
    stdio: "inherit",
    env: {
      ...process.env,
      PLAYWRIGHT_BROWSERS_PATH: browsersDir,
    },
    reject: false,
  });

  process.exitCode = result.exitCode ?? 1;
};
