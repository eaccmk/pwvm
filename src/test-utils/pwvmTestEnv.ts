import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createPaths, type Paths } from "../core/paths.js";

export type TestPwvmEnv = {
  homeDir: string;
  paths: Paths;
  options: {
    homeDir: string;
    pwvmDir: string;
    versionsDir: string;
    shimsDir: string;
    activeVersionFile: string;
  };
  cleanup: () => Promise<void>;
};

export const createTestPwvmEnv = async (): Promise<TestPwvmEnv> => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "pwvm-test-"));
  const homeDir = baseDir;
  const paths = createPaths(homeDir);
  const options = {
    homeDir,
    pwvmDir: paths.pwvmDir,
    versionsDir: paths.versionsDir,
    shimsDir: paths.shimsDir,
    activeVersionFile: paths.activeVersionFile,
  };

  const cleanup = async (): Promise<void> => {
    await rm(baseDir, { recursive: true, force: true });
  };

  return {
    homeDir,
    paths,
    options,
    cleanup,
  };
};

export const withTestPwvmEnv = async <T>(
  fn: (env: TestPwvmEnv) => Promise<T>,
): Promise<T> => {
  const env = await createTestPwvmEnv();
  try {
    return await fn(env);
  } finally {
    await env.cleanup();
  }
};
