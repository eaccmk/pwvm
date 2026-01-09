import fs from "fs-extra";
import { readFileSync } from "node:fs";
import path from "node:path";
import { getPwvmDir, getShimsDir } from "../core/paths.js";
import { createLogger, type Logger } from "../utils/logger.js";

export type DoctorCommandDeps = {
  logger?: Logger;
  fs?: Pick<typeof fs, "pathExists">;
  shimsDir?: string;
  envPath?: string;
};

const readVersion = (): string => {
  try {
    const entry = process.argv[1];
    if (!entry) {
      return "unknown";
    }
    const rootDir = path.resolve(path.dirname(entry), "..");
    const pkgPath = path.join(rootDir, "package.json");
    const contents = readFileSync(pkgPath, "utf8");
    const parsed = JSON.parse(contents) as { version?: string };
    return typeof parsed.version === "string" ? parsed.version : "unknown";
  } catch {
    return "unknown";
  }
};

export const runDoctorCommand = async (
  deps: DoctorCommandDeps = {},
): Promise<void> => {
  const logger = deps.logger ?? createLogger();
  const fsImpl = deps.fs ?? fs;
  const pwvmDir = getPwvmDir();
  const shimsDir = deps.shimsDir ?? getShimsDir();
  const envPath = deps.envPath ?? process.env.PATH ?? process.env.DOCKER_PATH ?? "";

  const shimPath = path.join(shimsDir, "playwright");

  const useColor = process.stdout.isTTY === true;
  const withScope = (message: string): string =>
    message.startsWith(" ") ? `pwvm-doctor${message}` : `pwvm-doctor ${message}`;
  const logInfo = (message: string) => logger.info(withScope(message));
  const logWarn = (message: string) => logger.warn(withScope(message));
  const colorize = (symbol: "check" | "cross"): string => {
    const value = symbol === "check" ? "✔" : "✖";
    if (!useColor) {
      return value;
    }
    const color = symbol === "check" ? "\x1b[32m" : "\x1b[31m";
    const reset = "\x1b[39m";
    return `${color}${value}${reset}`;
  };

  let shimsDirExists = false;
  let shimExists = false;
  let pwvmDirExists = false;

  try {
    pwvmDirExists = await fsImpl.pathExists(pwvmDir);
  } catch {
    pwvmDirExists = false;
  }

  try {
    shimsDirExists = await fsImpl.pathExists(shimsDir);
  } catch {
    shimsDirExists = false;
  }

  try {
    shimExists = await fsImpl.pathExists(shimPath);
  } catch {
    shimExists = false;
  }

  const pathEntries = envPath.split(path.delimiter).filter(Boolean);
  const pathHasShims = pathEntries.includes(shimsDir);

  logInfo(`pwvm Doctor v.${readVersion()}`);
  logInfo("### Diagnostic for required components ###");

  if (pwvmDirExists) {
    logInfo(`  ${colorize("check")} pwvm home directory exists`);
  } else {
    logWarn(`  ${colorize("cross")} pwvm home directory exists`);
  }

  if (shimsDirExists) {
    logInfo(`  ${colorize("check")} shims directory exists`);
  } else {
    logWarn(`  ${colorize("cross")} shims directory exists`);
  }

  if (shimExists) {
    logInfo(`  ${colorize("check")} playwright shim found`);
  } else {
    logWarn(`  ${colorize("cross")} playwright shim found`);
  }

  if (pathHasShims) {
    logInfo(`  ${colorize("check")} shims directory is in PATH`);
  } else {
    logWarn(`  ${colorize("cross")} shims directory is not in PATH`);
  }

  logInfo("### Suggested fixes ###");
  if (!pathHasShims) {
    logInfo('  export PATH="$HOME/.pwvm/shims:$PATH"');
  }
};
