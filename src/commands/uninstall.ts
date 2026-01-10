import {
  uninstallPlaywrightVersion,
  type UninstallOptions,
} from "../core/uninstall.js";
import { createLogger, formatError, type Logger } from "../utils/logger.js";

export type UninstallCommandDeps = {
  logger?: Logger;
  uninstall?: typeof uninstallPlaywrightVersion;
  uninstallOptions?: UninstallOptions;
};

export const runUninstallCommand = async (
  version: string,
  deps: UninstallCommandDeps = {},
): Promise<void> => {
  const logger = deps.logger ?? createLogger();
  const uninstall = deps.uninstall ?? uninstallPlaywrightVersion;

  try {
    await uninstall(version, deps.uninstallOptions);
    logger.info(`Uninstalled Playwright ${version}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    let hint: string | undefined;
    if (message.includes("is currently active")) {
      hint = "Run `pwvm use <version>` to switch first.";
    } else if (message.includes("is not installed")) {
      hint = "Run `pwvm list` to see installed versions.";
    } else if (message.includes("Invalid Playwright version")) {
      hint = "Use a valid semver like 1.2.3.";
    }
    logger.error(formatError(message, hint));
    process.exitCode = 1;
  }
};
