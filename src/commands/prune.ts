import { pruneVersions, type PruneOptions } from "../core/prune.js";
import { createLogger, formatError, type Logger } from "../utils/logger.js";

export type PruneCommandDeps = {
  logger?: Logger;
  prune?: typeof pruneVersions;
  pruneOptions?: PruneOptions;
};

export const runPruneCommand = async (
  deps: PruneCommandDeps = {},
): Promise<void> => {
  const logger = deps.logger ?? createLogger();
  const prune = deps.prune ?? pruneVersions;

  try {
    const removed = await prune(deps.pruneOptions);

    if (removed.length === 0) {
      logger.info("Nothing to prune");
      return;
    }

    logger.info("Removed Playwright versions:");
    for (const version of removed) {
        logger.info(`- ${version}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(
      formatError(
        `Failed to prune versions: ${message}`,
        "Run `pwvm list` to review installed versions.",
      ),
    );
    process.exitCode = 1;
  }
};
