declare module "fs-extra" {
  import type { Dirent, PathLike } from "node:fs";
  import type { Stats } from "node:fs";

  type PathExists = (path: PathLike) => Promise<boolean>;
  type ReadDir = (
    path: PathLike,
    options: { withFileTypes: true },
  ) => Promise<Dirent[]>;
  type ReadFile = (path: PathLike, encoding: "utf8") => Promise<string>;
  type ExistsSync = (path: PathLike) => boolean;
  type StatSync = (path: PathLike) => Stats;
  type EnsureDir = (path: PathLike) => Promise<void>;
  type Remove = (path: PathLike) => Promise<void>;
  type WriteFile = (
    path: PathLike,
    data: string,
    encoding: "utf8",
  ) => Promise<void>;
  type Chmod = (path: PathLike, mode: number) => Promise<void>;

  const fsExtra: {
    pathExists: PathExists;
    readdir: ReadDir;
    readFile: ReadFile;
    writeFile: WriteFile;
    ensureDir: EnsureDir;
    remove: Remove;
    chmod: Chmod;
    existsSync: ExistsSync;
    statSync: StatSync;
  };

  export default fsExtra;
}
