import fs from "fs-extra";
import type { PathLike } from "node:fs";
import path from "node:path";
import semver from "semver";
import { getVersionsDir } from "./paths.js";
import { getGlobalActiveVersion, type VersionsFs } from "./versions.js";

type RemoveFn = (path: PathLike) => Promise<void>;

export type UninstallFs = VersionsFs & { remove: RemoveFn };

export type UninstallOptions = {
  fs?: UninstallFs;
  homeDir?: string;
  versionsDir?: string;
  activeVersionFile?: string;
  getVersionsDir?: typeof getVersionsDir;
};

export const uninstallPlaywrightVersion = async (
  version: string,
  options: UninstallOptions = {},
): Promise<void> => {
  if (!semver.valid(version)) {
    throw new Error(`Invalid Playwright version "${version}".`);
  }
  const fsImpl = options.fs ?? fs;
  const activeVersion = await getGlobalActiveVersion({
    homeDir: options.homeDir,
    activeVersionFile: options.activeVersionFile,
    fs: fsImpl,
  });
  if (activeVersion === version) {
    throw new Error(`Playwright version "${version}" is currently active.`);
  }
  const resolveVersionsDir = options.getVersionsDir ?? getVersionsDir;
  const versionsDir = options.versionsDir ?? resolveVersionsDir(options.homeDir);
  const targetDir = path.join(versionsDir, version);
  const exists = await fsImpl.pathExists(targetDir);
  if (!exists) {
    throw new Error(`Playwright version "${version}" is not installed.`);
  }
  await fsImpl.remove(targetDir);
};
