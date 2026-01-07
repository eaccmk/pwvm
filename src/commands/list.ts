import {
  getInstalledVersions,
  getResolvedActiveVersion,
  type GetInstalledVersionsOptions,
  type GetResolvedActiveVersionOptions,
} from "../core/versions.js";
import { createLogger, formatError, type Logger } from "../utils/logger.js";

export type ListCommandDeps = {
  logger?: Logger;
  getInstalled?: typeof getInstalledVersions;
  getActive?: typeof getResolvedActiveVersion;
  installedOptions?: GetInstalledVersionsOptions;
  activeOptions?: GetResolvedActiveVersionOptions;
};

export const runListCommand = async (deps: ListCommandDeps = {}): Promise<void> => {
  const logger = deps.logger ?? createLogger();
  const getInstalled = deps.getInstalled ?? getInstalledVersions;
  const getActive = deps.getActive ?? getResolvedActiveVersion;

  try {
    const [versions, currentVersion] = await Promise.all([
      getInstalled(deps.installedOptions),
      getActive(deps.activeOptions),
    ]);

    if (versions.length === 0) {
      logger.info("No Playwright versions installed");
      return;
    }

    for (const version of versions) {
      if (version === currentVersion) {
        logger.info(`* ${version}`);
      } else {
        logger.info(`  ${version}`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(
      formatError(
        `Failed to list versions: ${message}`,
        "Try again or run `pwvm install <version>` to add one.",
      ),
    );
    process.exitCode = 1;
  }
};
