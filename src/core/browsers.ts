import { execa } from "execa";
import fs from "fs-extra";
import path from "node:path";
import { getVersionsDir } from "./paths.js";

export type BrowsersFs = Pick<typeof fs, "pathExists">;

export type InstallBrowsersOptions = {
  homeDir?: string;
  versionsDir?: string;
  fs?: BrowsersFs;
  execa?: typeof execa;
  getVersionsDir?: typeof getVersionsDir;
};

export const installPlaywrightBrowsers = async (
  version: string,
  options: InstallBrowsersOptions = {},
): Promise<void> => {
  const fsImpl = options.fs ?? fs;
  const execaImpl = options.execa ?? execa;
  const resolveVersionsDir = options.getVersionsDir ?? getVersionsDir;
  const versionsDir = options.versionsDir ?? resolveVersionsDir(options.homeDir);
  const installDir = path.join(versionsDir, version);

  const installDirExists = await fsImpl.pathExists(installDir);
  if (!installDirExists) {
    throw new Error(`Playwright ${version} is not installed.`);
  }

  const playwrightDir = path.join(installDir, "node_modules", "playwright");
  const playwrightExists = await fsImpl.pathExists(playwrightDir);
  if (!playwrightExists) {
    throw new Error(`Playwright ${version} is not installed.`);
  }

  const browsersDir = path.join(installDir, "browsers");
  await execaImpl("npx", ["playwright", "install"], {
    cwd: installDir,
    env: {
      ...process.env,
      PLAYWRIGHT_BROWSERS_PATH: browsersDir,
    },
  });
};
