import fs from "fs-extra";
import semver from "semver";
import {
  getActiveVersionFile,
  getPwvmDir,
  getVersionsDir,
  resolveRcPath,
} from "./paths.js";

export type VersionsFs = Pick<
  typeof fs,
  | "pathExists"
  | "readdir"
  | "readFile"
  | "writeFile"
  | "ensureDir"
  | "existsSync"
  | "statSync"
>;

export type VersionPathOptions = {
  homeDir?: string;
  pwvmDir?: string;
  versionsDir?: string;
  activeVersionFile?: string;
  rcStartDir?: string;
  rcFileName?: string;
};

export type FsOptions = {
  fs?: VersionsFs;
  resolveRc?: typeof resolveRcPath;
};

export type GetInstalledVersionsOptions = VersionPathOptions & FsOptions;
export type GetGlobalActiveVersionOptions = VersionPathOptions & FsOptions;
export type GetResolvedActiveVersionOptions = VersionPathOptions & FsOptions;
export type SetGlobalActiveVersionOptions = VersionPathOptions & FsOptions;

const resolvePwvmDir = (options: VersionPathOptions): string =>
  options.pwvmDir ?? getPwvmDir(options.homeDir);

const resolveVersionsDir = (options: VersionPathOptions): string =>
  options.versionsDir ?? getVersionsDir(options.homeDir);

const resolveActiveVersionFile = (options: VersionPathOptions): string =>
  options.activeVersionFile ?? getActiveVersionFile(options.homeDir);

export const getInstalledVersions = async (
  options: GetInstalledVersionsOptions = {},
): Promise<string[]> => {
  const fsImpl = options.fs ?? fs;
  const versionsDir = resolveVersionsDir(options);

  try {
    const exists = await fsImpl.pathExists(versionsDir);
    if (!exists) {
      return [];
    }

    const entries = await fsImpl.readdir(versionsDir, { withFileTypes: true });
    const versions = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((version) => semver.valid(version) !== null);

    return versions.sort((a, b) => semver.compare(a, b));
  } catch {
    return [];
  }
};

export const getGlobalActiveVersion = async (
  options: GetGlobalActiveVersionOptions = {},
): Promise<string | null> => {
  const fsImpl = options.fs ?? fs;
  const activeVersionFile = resolveActiveVersionFile(options);

  try {
    const exists = await fsImpl.pathExists(activeVersionFile);
    if (!exists) {
      return null;
    }

    const contents = await fsImpl.readFile(activeVersionFile, "utf8");
    const trimmed = contents.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
};

export const getResolvedActiveVersion = async (
  options: GetResolvedActiveVersionOptions = {},
): Promise<string | null> => {
  const fsImpl = options.fs ?? fs;
  const resolveRc = options.resolveRc ?? resolveRcPath;

  try {
    const rcPath = resolveRc({
      startDir: options.rcStartDir,
      rcFileName: options.rcFileName,
      fs: fsImpl,
    });

    if (rcPath) {
      const contents = await fsImpl.readFile(rcPath, "utf8");
      const trimmed = contents.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
  } catch {
    return null;
  }

  return getGlobalActiveVersion(options);
};

export const setGlobalActiveVersion = async (
  version: string,
  options: SetGlobalActiveVersionOptions = {},
): Promise<void> => {
  const fsImpl = options.fs ?? fs;
  const installedVersions = await getInstalledVersions(options);

  if (!installedVersions.includes(version)) {
    throw new Error(`Playwright version "${version}" is not installed.`);
  }

  const pwvmDir = resolvePwvmDir(options);
  const activeVersionFile = resolveActiveVersionFile(options);

  await fsImpl.ensureDir(pwvmDir);
  await fsImpl.writeFile(activeVersionFile, `${version}\n`, "utf8");
};
