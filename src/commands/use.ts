import {
  setGlobalActiveVersion,
  type SetGlobalActiveVersionOptions,
} from "../core/versions.js";
import fs from "fs-extra";
import path from "node:path";
import { getVersionsDir } from "../core/paths.js";
import { createLogger, formatError, type Logger } from "../utils/logger.js";

export type UseCommandDeps = {
  logger?: Logger;
  setActive?: typeof setGlobalActiveVersion;
  setOptions?: SetGlobalActiveVersionOptions;
  fs?: Pick<typeof fs, "pathExists">;
  versionsDir?: string;
  getVersionsDir?: typeof getVersionsDir;
};

export const runUseCommand = async (
  version: string,
  deps: UseCommandDeps = {},
): Promise<void> => {
  const logger = deps.logger ?? createLogger();
  const setActive = deps.setActive ?? setGlobalActiveVersion;
  const fsImpl = deps.fs ?? deps.setOptions?.fs ?? fs;
  const resolveVersionsDir = deps.getVersionsDir ?? getVersionsDir;
  const versionsDir =
    deps.versionsDir ??
    deps.setOptions?.versionsDir ??
    resolveVersionsDir(deps.setOptions?.homeDir);
  const versionDir = path.join(versionsDir, version);

  try {
    const exists = await fsImpl.pathExists(versionDir);
    if (!exists) {
      logger.error(`Playwright version "${version}" is not installed.`);
      logger.info(`Run \`pwvm install ${version}\` first.`);
      process.exitCode = 1;
      return;
    }
    await setActive(version, deps.setOptions);
    logger.info(`Using Playwright ${version}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(
      formatError(
        `Failed to set active version: ${message}`,
        `Run \`pwvm install ${version}\` first.`,
      ),
    );
    process.exitCode = 1;
  }
};
