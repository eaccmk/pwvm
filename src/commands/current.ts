import fs from "fs-extra";
import { resolveRcPath } from "../core/paths.js";
import {
  getResolvedActiveVersion,
  type GetResolvedActiveVersionOptions,
} from "../core/versions.js";
import { createLogger, formatError, type Logger } from "../utils/logger.js";

export type CurrentCommandDeps = {
  logger?: Logger;
  getActive?: typeof getResolvedActiveVersion;
  activeOptions?: GetResolvedActiveVersionOptions;
  resolveRc?: typeof resolveRcPath;
  fs?: Pick<typeof fs, "readFile" | "existsSync" | "statSync">;
};

export const runCurrentCommand = async (
  deps: CurrentCommandDeps = {},
): Promise<void> => {
  const logger = deps.logger ?? createLogger();
  const getActive = deps.getActive ?? getResolvedActiveVersion;
  const resolveRc =
    deps.resolveRc ?? deps.activeOptions?.resolveRc ?? resolveRcPath;
  const fsImpl = deps.fs ?? deps.activeOptions?.fs ?? fs;

  try {
    const currentVersion = await getActive(deps.activeOptions);
    if (!currentVersion) {
      logger.warn("No active Playwright version. Run `pwvm use <version>`.");
      process.exitCode = 1;
      return;
    }

    let suffix = "";
    try {
      const rcPath = resolveRc({
        startDir: deps.activeOptions?.rcStartDir,
        rcFileName: deps.activeOptions?.rcFileName,
        fs: fsImpl,
      });

      if (rcPath) {
        const contents = await fsImpl.readFile(rcPath, "utf8");
        const trimmed = contents.trim();
        if (trimmed.length > 0 && trimmed === currentVersion) {
          suffix = " (from .pwvmrc)";
        }
      }
    } catch {
      suffix = "";
    }

    logger.info(`${currentVersion}${suffix}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(
      formatError(
        `Failed to read current version: ${message}`,
        "Run `pwvm use <version>` to set one.",
      ),
    );
    process.exitCode = 1;
  }
};
