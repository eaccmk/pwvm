import {
  installPlaywrightVersion,
  type InstallOptions,
} from "../core/install.js";
import { createLogger, type Logger } from "../utils/logger.js";
import { createProgress } from "../utils/progress.js";
import { fetchPackageMetadata } from "../utils/registry.js";

export type InstallCommandOptions = {
  withBrowsers?: boolean;
  browsers?: boolean;
};

export type InstallCommandDeps = {
  logger?: Logger;
  install?: typeof installPlaywrightVersion;
  installOptions?: InstallOptions;
};

export const runInstallCommand = async (
  version: string,
  options: InstallCommandOptions = {},
  deps: InstallCommandDeps = {},
): Promise<void> => {
  const logger = deps.logger ?? createLogger();
  const install = deps.install ?? installPlaywrightVersion;
  const progress = createProgress({ label: "Installing Playwright", logger });
  const resolvedVersion = await resolveLatestVersion(version, logger);
  if (!resolvedVersion) {
    process.exitCode = 1;
    return;
  }

  let withBrowsers = options.browsers !== false;
  if (options.withBrowsers) {
    withBrowsers = true;
  }

  try {
    if (resolvedVersion !== version) {
      logger.info(`Resolved latest Playwright version to ${resolvedVersion}`);
    }
    logger.info(`Installing Playwright ${resolvedVersion}`);
    if (withBrowsers) {
      logger.info("Installing Playwright browsers");
    } else {
      logger.info("Skipping Playwright browser install");
    }
    progress.start();
    const result = await install(resolvedVersion, {
      ...deps.installOptions,
      withBrowsers,
    });
    progress.succeed();

    if (!result.packageInstalled && !result.browsersInstalled) {
      if (result.packageAlreadyInstalled && result.browsersAlreadyInstalled) {
        logger.info(
          `Playwright ${version} is already installed (browsers already installed)`,
        );
      } else {
        logger.info(`Playwright ${version} is already installed`);
      }
      return;
    }

    if (!result.packageInstalled && result.browsersInstalled) {
      logger.info(`🎉 Installed Playwright browsers for ${resolvedVersion}`);
      return;
    }

    const suffix = result.browsersInstalled ? " (browsers installed)" : "";
    logger.info(`🎉 Installed Playwright ${resolvedVersion}${suffix}`);
  } catch (error) {
    progress.fail();
    const message = error instanceof Error ? error.message : String(error);
    const code = getErrorCode(error);

    if (isInvalidVersionError(code, message)) {
      logger.error(
        `[ERROR]: Unable to install Playwright ${resolvedVersion}. The version does not exist.`,
      );
      logger.info(
        "Available versions are published at https://github.com/microsoft/playwright/releases",
      );
    } else if (isNetworkError(code, message)) {
      logger.error(
        "[ERROR]: Unable to install Playwright due to a network or registry issue.",
      );
      logger.info("Please check your internet connection and try again.");
    } else {
      logger.error(`[ERROR]: Unable to install Playwright ${resolvedVersion}.`);
      logger.info("Please try again or verify the version number.");
    }
    process.exitCode = 1;
  }
};

const getErrorCode = (error: unknown): string | undefined => {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  if ("code" in error && typeof error.code === "string") {
    return error.code;
  }
  return undefined;
};

const isInvalidVersionError = (
  code: string | undefined,
  message: string,
): boolean => {
  const text = message.toLowerCase();
  if (code === "ETARGET" || code === "notarget") {
    return true;
  }
  return (
    text.includes("etarget") ||
    text.includes("notarget") ||
    text.includes("no matching version") ||
    text.includes("version not found")
  );
};

const isNetworkError = (code: string | undefined, message: string): boolean => {
  const text = message.toLowerCase();
  if (
    code === "ECONNRESET" ||
    code === "ENOTFOUND" ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "EAI_AGAIN"
  ) {
    return true;
  }
  return (
    text.includes("network") ||
    text.includes("fetch failed") ||
    text.includes("getaddrinfo") ||
    text.includes("econnreset") ||
    text.includes("enotfound")
  );
};

const resolveLatestVersion = async (
  version: string,
  logger: Logger,
): Promise<string | null> => {
  if (version !== "latest") {
    return version;
  }

  try {
    const metadata = await fetchPackageMetadata("playwright");
    const latest = metadata["dist-tags"]?.latest;
    if (!latest) {
      throw new Error("Missing latest tag.");
    }
    return latest;
  } catch {
    logger.error("[ERROR]: Unable to reach npm registry.");
    logger.info("Please check your internet connection and try again.");
    return null;
  }
};
