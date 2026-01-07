import type { Dirent, PathLike, Stats } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  getInstalledVersions,
  getResolvedActiveVersion,
} from "./versions.js";
import type { VersionsFs } from "./versions.js";

type ReaddirOptions = Parameters<VersionsFs["readdir"]>[1];

type DirentLike = {
  name: string;
  isDirectory: () => boolean;
};

const dirent = (name: string, isDirectory: boolean): DirentLike => ({
  name,
  isDirectory: () => isDirectory,
});

const makeFs = (overrides: Partial<VersionsFs> = {}): VersionsFs => ({
  pathExists: async (_path: PathLike) => false,
  readdir: async (_path: PathLike, _options?: ReaddirOptions) => [],
  readFile: async (_path: PathLike) => "",
  writeFile: async () => {},
  ensureDir: async () => {},
  existsSync: () => false,
  statSync: (_path: PathLike) => ({ isFile: () => false } as Stats),
  ...overrides,
});

describe("getInstalledVersions", () => {
  it("returns empty list when no versions exist", async () => {
    const fs = makeFs({ pathExists: async (_path: PathLike) => false });

    await expect(
      getInstalledVersions({ fs, versionsDir: "/versions" }),
    ).resolves.toEqual([]);
  });

  it("reads installed versions correctly", async () => {
    const fs = makeFs({
      pathExists: async (_path: PathLike) => true,
      readdir: async (_path: PathLike) =>
        [
          dirent("1.0.0", true),
          dirent("2.0.0", false),
          dirent("not-a-version", true),
          dirent("1.2.3", true),
        ] as unknown as Dirent[],
    });

    const versions = await getInstalledVersions({
      fs,
      versionsDir: "/versions",
    });

    expect(versions).toEqual(["1.0.0", "1.2.3"]);
  });

  it("sorts versions with semver", async () => {
    const fs = makeFs({
      pathExists: async (_path: PathLike) => true,
      readdir: async (_path: PathLike) =>
        [
          dirent("1.10.0", true),
          dirent("0.9.0", true),
          dirent("1.2.0", true),
        ] as unknown as Dirent[],
    });

    const versions = await getInstalledVersions({
      fs,
      versionsDir: "/versions",
    });

    expect(versions).toEqual(["0.9.0", "1.2.0", "1.10.0"]);
  });
});

describe("getResolvedActiveVersion", () => {
  it("respects .pwvmrc override", async () => {
    const rcPath = "/repo/.pwvmrc";
    const globalPath = "/home/.pwvm/version";
    const fs = makeFs({
      pathExists: async (path: PathLike) => String(path) === globalPath,
      readFile: async (path: PathLike) => {
        if (String(path) === rcPath) {
          return "1.9.0\n";
        }
        if (String(path) === globalPath) {
          return "2.0.0\n";
        }
        return "";
      },
    });

    const resolveRc = () => rcPath;

    const version = await getResolvedActiveVersion({
      fs,
      resolveRc,
      activeVersionFile: globalPath,
    });

    expect(version).toBe("1.9.0");
  });

  it("falls back to global version", async () => {
    const globalPath = "/home/.pwvm/version";
    const fs = makeFs({
      pathExists: async (path: PathLike) => String(path) === globalPath,
      readFile: async (path: PathLike) =>
        String(path) === globalPath ? "2.4.0\n" : "",
    });

    const resolveRc = () => null;

    const version = await getResolvedActiveVersion({
      fs,
      resolveRc,
      activeVersionFile: globalPath,
    });

    expect(version).toBe("2.4.0");
  });
});
