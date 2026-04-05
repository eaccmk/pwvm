import {
  setGlobalActiveVersion,
  type SetGlobalActiveVersionOptions,
} from "../core/versions.js";
import fs from "fs-extra";
import path from "node:path";
import { getVersionsDir, resolveRcPath } from "../core/paths.js";
import { createLogger, formatError, type Logger } from "../utils/logger.js";

export type UseCommandDeps = {
  logger?: Logger;
  setActive?: typeof setGlobalActiveVersion;
  setOptions?: SetGlobalActiveVersionOptions;
  resolveRc?: typeof resolveRcPath;
  fs?: Pick<typeof fs, "pathExists" | "readFile" | "existsSync" | "statSync">;
  versionsDir?: string;
  getVersionsDir?: typeof getVersionsDir;
};

const resolveRequestedVersion = async (
  version: string | undefined,
  deps: UseCommandDeps,
): Promise<{ version: string | null; fromRc: boolean }> => {
  if (version) {
    return { version, fromRc: false };
  }

  const resolveRc = deps.resolveRc ?? deps.setOptions?.resolveRc ?? resolveRcPath;
  const fsImpl = deps.fs ?? deps.setOptions?.fs ?? fs;
  const rcPath = resolveRc({
    startDir: deps.setOptions?.rcStartDir,
    rcFileName: deps.setOptions?.rcFileName,
    fs: fsImpl,
  });

  if (!rcPath) {
    return { version: null, fromRc: false };
  }

  const contents = await fsImpl.readFile(rcPath, "utf8");
  const trimmed = contents.trim();
  return { version: trimmed.length > 0 ? trimmed : null, fromRc: true };
};

export const runUseCommand = async (
  version: string | undefined,
  deps: UseCommandDeps = {},
): Promise<void> => {
  const logger = deps.logger ?? createLogger();
  const setActive = deps.setActive ?? setGlobalActiveVersion;
  const fsImpl = deps.fs ?? deps.setOptions?.fs ?? fs;

  try {
    const resolved = await resolveRequestedVersion(version, deps);
    if (!resolved.version) {
      logger.error("No version provided and no .pwvmrc file was found.");
      logger.info("Run `pwvm use <version>` or add a `.pwvmrc` file.");
      process.exitCode = 1;
      return;
    }

    const resolveVersionsDir = deps.getVersionsDir ?? getVersionsDir;
    const versionsDir =
      deps.versionsDir ??
      deps.setOptions?.versionsDir ??
      resolveVersionsDir(deps.setOptions?.homeDir);
    const versionDir = path.join(versionsDir, resolved.version);

    const exists = await fsImpl.pathExists(versionDir);
    if (!exists) {
      logger.error(`Playwright version "${resolved.version}" is not installed.`);
      logger.info(`Run \`pwvm install ${resolved.version}\` first.`);
      process.exitCode = 1;
      return;
    }
    await setActive(resolved.version, deps.setOptions);
    const suffix = resolved.fromRc ? " (from .pwvmrc)" : "";
    logger.info(`Using Playwright ${resolved.version}${suffix}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(
      formatError(
        `Failed to set active version: ${message}`,
        version
          ? `Run \`pwvm install ${version}\` first.`
          : "Run `pwvm use <version>` or add a `.pwvmrc` file.",
      ),
    );
    process.exitCode = 1;
  }
};
