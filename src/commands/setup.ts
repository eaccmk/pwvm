import fs from "fs-extra";
import path from "node:path";
import { getPwvmDir, getShimsDir } from "../core/paths.js";
import { unixShim, windowsShim } from "../core/shimTemplates.js";
import { createLogger, formatError, type Logger } from "../utils/logger.js";

export type SetupCommandDeps = {
  logger?: Logger;
  fs?: Pick<typeof fs, "ensureDir" | "writeFile" | "chmod">;
  shimsDir?: string;
  pwvmBinPath?: string;
};

const buildPathInstructions = (shimsDir: string): string[] => [
  "",
  "==> Next step:",
  "- Run this command in your local terminal or add it to your CI pipeline:",
  "",
  `export PATH="${shimsDir}:$PATH"`,
  ""
];

export const runSetupCommand = async (
  deps: SetupCommandDeps = {},
): Promise<void> => {
  const logger = deps.logger ?? createLogger();
  const fsImpl = deps.fs ?? fs;
  const pwvmDir = getPwvmDir();
  const shimsDir = deps.shimsDir ?? getShimsDir();
  const pwvmBinPath = deps.pwvmBinPath ?? process.argv[1];

  try {
    await fsImpl.ensureDir(shimsDir);

    const unixShimPath = path.join(shimsDir, "playwright");
    const windowsShimPath = path.join(shimsDir, "playwright.cmd");

    await fsImpl.writeFile(unixShimPath, unixShim(pwvmBinPath), "utf8");
    await fsImpl.writeFile(windowsShimPath, windowsShim(pwvmBinPath), "utf8");
    await fsImpl.chmod(unixShimPath, 0o755);
    await fsImpl.ensureDir(pwvmDir);
    await fsImpl.writeFile(path.join(pwvmDir, "setup-complete"), "ok\n", "utf8");

    for (const line of buildPathInstructions(shimsDir)) {
      logger.info(line);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(
      formatError(
        `Setup failed: ${message}`,
        "Check filesystem permissions and try again.",
      ),
    );
    process.exitCode = 1;
  }
};
