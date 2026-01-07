import fs from "fs-extra";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { PathLike } from "node:fs";

export type ScopedFs = Pick<
  typeof fs,
  | "pathExists"
  | "readdir"
  | "readFile"
  | "writeFile"
  | "ensureDir"
  | "remove"
  | "existsSync"
  | "statSync"
>;

type ReadFileOptions = Parameters<typeof fs.readFile>[1];
type WriteFileOptions = Parameters<typeof fs.writeFile>[2];
type WriteFileData = Parameters<typeof fs.writeFile>[1];
type ReaddirOptions = Parameters<typeof fs.readdir>[1];

export const createTempPwvmHome = async (): Promise<{
  homeDir: string;
  cleanup: () => Promise<void>;
}> => {
  const prefix = path.join(os.tmpdir(), "pwvm-");
  const homeDir = await mkdtemp(prefix);

  const cleanup = async () => {
    await rm(homeDir, { recursive: true, force: true });
  };

  return { homeDir, cleanup };
};

const normalizePath = (value: PathLike): string =>
  typeof value === "string" ? value : value.toString();

export const createFsMock = (rootDir: string): ScopedFs => {
  const base = path.resolve(rootDir);

  const resolveWithinRoot = (target: PathLike): string => {
    const targetPath = normalizePath(target);
    const absolute = path.isAbsolute(targetPath)
      ? targetPath
      : path.join(base, targetPath);
    const relative = path.relative(base, absolute);

    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error(`Access outside mock root: ${targetPath}`);
    }

    return absolute;
  };

  return {
    pathExists: (target: PathLike) =>
      fs.pathExists(resolveWithinRoot(target)),
    readdir: (target: PathLike, options?: ReaddirOptions) => {
      const resolved = options ?? ({ withFileTypes: true } as ReaddirOptions);
      return fs.readdir(resolveWithinRoot(target), resolved);
    },
    readFile: (target: PathLike, options?: ReadFileOptions) => {
      const resolved = options ?? ("utf8" as ReadFileOptions);
      return fs.readFile(resolveWithinRoot(target), resolved);
    },
    writeFile: (target: PathLike, data: WriteFileData, options?: WriteFileOptions) => {
      const resolved = options ?? ("utf8" as WriteFileOptions);
      return fs.writeFile(resolveWithinRoot(target), data, resolved);
    },
    ensureDir: (target: PathLike) => fs.ensureDir(resolveWithinRoot(target)),
    remove: (target: PathLike) => fs.remove(resolveWithinRoot(target)),
    existsSync: (target: PathLike) =>
      fs.existsSync(resolveWithinRoot(target)),
    statSync: (target: PathLike) => fs.statSync(resolveWithinRoot(target)),
  };
};
