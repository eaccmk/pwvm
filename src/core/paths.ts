import fs from "node:fs";
import type { PathLike } from "node:fs";
import os from "node:os";
import path from "node:path";

export const PWVM_DIR_NAME = ".pwvm";
export const PWVM_RC_NAME = ".pwvmrc";

export type Paths = {
  homeDir: string;
  pwvmDir: string;
  versionsDir: string;
  shimsDir: string;
  activeVersionFile: string;
};

export type ResolveRcOptions = {
  startDir?: string;
  rcFileName?: string;
  fs?: RcFs;
};

export type RcFs = {
  existsSync: (path: PathLike) => boolean;
  statSync: (path: PathLike) => { isFile: () => boolean };
};

export const getPwvmDir = (homeDir: string = os.homedir()): string =>
  path.join(homeDir, PWVM_DIR_NAME);

export const getVersionsDir = (homeDir: string = os.homedir()): string =>
  path.join(getPwvmDir(homeDir), "versions");

export const getShimsDir = (homeDir: string = os.homedir()): string =>
  path.join(getPwvmDir(homeDir), "shims");

export const getActiveVersionFile = (homeDir: string = os.homedir()): string =>
  path.join(getPwvmDir(homeDir), "version");

export const createPaths = (homeDir: string = os.homedir()): Paths => ({
  homeDir,
  pwvmDir: getPwvmDir(homeDir),
  versionsDir: getVersionsDir(homeDir),
  shimsDir: getShimsDir(homeDir),
  activeVersionFile: getActiveVersionFile(homeDir),
});

export const resolveRcPath = (options: ResolveRcOptions = {}): string | null => {
  const startDir = options.startDir ?? process.cwd();
  const rcFileName = options.rcFileName ?? PWVM_RC_NAME;
  const fsImpl = options.fs ?? fs;

  let currentDir = path.resolve(startDir);

  while (true) {
    const candidate = path.join(currentDir, rcFileName);

    if (fsImpl.existsSync(candidate)) {
      const stat = fsImpl.statSync(candidate);
      if (stat.isFile()) {
        return candidate;
      }
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }

    currentDir = parentDir;
  }

  return null;
};
