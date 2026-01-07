import fs from "fs-extra";
import type { PathLike } from "node:fs";
import path from "node:path";
import { getVersionsDir, resolveRcPath } from "./paths.js";
import {
  getGlobalActiveVersion,
  getInstalledVersions,
  type GetGlobalActiveVersionOptions,
  type GetInstalledVersionsOptions,
  type VersionsFs,
  type VersionPathOptions,
} from "./versions.js";

type RemoveFn = (path: PathLike) => Promise<void>;

export type PruneFs = VersionsFs & { remove: RemoveFn };

export type PruneOptions = VersionPathOptions & {
  fs?: PruneFs;
  getInstalled?: typeof getInstalledVersions;
  getGlobalActive?: typeof getGlobalActiveVersion;
  resolveRc?: typeof resolveRcPath;
  getVersionsDir?: typeof getVersionsDir;
  installedOptions?: GetInstalledVersionsOptions;
  globalOptions?: GetGlobalActiveVersionOptions;
};

const readRcVersion = async (
  options: PruneOptions,
  fsImpl: PruneFs,
  resolveRc: typeof resolveRcPath,
): Promise<string | null> => {
  try {
    const rcPath = resolveRc({
      startDir: options.rcStartDir,
      rcFileName: options.rcFileName,
      fs: fsImpl,
    });
    if (!rcPath) {
      return null;
    }

    const contents = await fsImpl.readFile(rcPath, "utf8");
    const trimmed = contents.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
};

export const pruneVersions = async (
  options: PruneOptions = {},
): Promise<string[]> => {
  const fsImpl = (options.fs ?? fs) as PruneFs;
  const getInstalled = options.getInstalled ?? getInstalledVersions;
  const getGlobalActive = options.getGlobalActive ?? getGlobalActiveVersion;
  const resolveRc = options.resolveRc ?? resolveRcPath;
  const resolveVersionsDir = options.getVersionsDir ?? getVersionsDir;

  const [installedVersions, globalVersion, rcVersion] = await Promise.all([
    getInstalled({
      homeDir: options.homeDir,
      versionsDir: options.versionsDir,
      fs: fsImpl,
      ...options.installedOptions,
    }),
    getGlobalActive({
      homeDir: options.homeDir,
      activeVersionFile: options.activeVersionFile,
      fs: fsImpl,
      ...options.globalOptions,
    }),
    readRcVersion(options, fsImpl, resolveRc),
  ]);

  const keep = new Set<string>();
  if (globalVersion) {
    keep.add(globalVersion);
  }
  if (rcVersion) {
    keep.add(rcVersion);
  }

  const versionsDir = options.versionsDir ?? resolveVersionsDir(options.homeDir);
  const removed: string[] = [];

  for (const version of installedVersions) {
    if (keep.has(version)) {
      continue;
    }
    const targetDir = path.join(versionsDir, version);
    try {
      const exists = await fsImpl.pathExists(targetDir);
      if (!exists) {
        continue;
      }
      await fsImpl.remove(targetDir);
      removed.push(version);
    } catch {
      continue;
    }
  }

  return removed;
};
