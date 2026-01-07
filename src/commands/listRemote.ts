import semver from "semver";
import { createLogger, type Logger } from "../utils/logger.js";
import { fetchPackageMetadata } from "../utils/registry.js";

export type ListRemoteCommandDeps = {
  logger?: Logger;
};

export const runListRemoteCommand = async (
  deps: ListRemoteCommandDeps = {},
): Promise<void> => {
  const logger = deps.logger ?? createLogger();

  try {
    const metadata = await fetchPackageMetadata("playwright");
    const versions = Object.keys(metadata.versions ?? {}).filter(
      (version) => semver.valid(version) !== null,
    );
    versions.sort((a, b) => semver.rcompare(a, b));

    logger.info("Available Playwright versions:");
    for (const version of versions) {
      logger.info(version);
    }
  } catch {
    logger.error("[ERROR]: Unable to reach npm registry.");
    logger.info("Please check your internet connection and try again.");
    process.exitCode = 1;
  }
};
