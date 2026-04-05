import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

// Integration test: optional and experimental; safe to remove without impact.
describe("pwvm install (integration)", () => {
  it("installs a version without browsers", async () => {
    const tempHome = await fs.mkdtemp(path.join(os.tmpdir(), "pwvm-itest-"));
    const tempBin = await fs.mkdtemp(path.join(os.tmpdir(), "pwvm-bin-"));
    const version = "1.42.0";
    const distEntry = path.join(process.cwd(), "dist", "index.js");
    const npmStub = path.join(tempBin, "npm");
    const npmStubCmd = path.join(tempBin, "npm.cmd");
    const npmStubScript = path.join(tempBin, "npm-stub.js");

    try {
      await fs.writeFile(
        npmStubScript,
        [
          "import fs from 'node:fs/promises';",
          "import path from 'node:path';",
          "",
          "const cwd = process.cwd();",
          "const pkgDir = path.join(cwd, 'node_modules', 'playwright');",
          "await fs.mkdir(pkgDir, { recursive: true });",
          "await fs.writeFile(",
          "  path.join(pkgDir, 'package.json'),",
          "  JSON.stringify({ name: 'playwright', version: process.argv[2] ?? '0.0.0' }),",
          "  'utf8',",
          ");",
        ].join("\n"),
        "utf8",
      );
      await fs.writeFile(
        npmStub,
        `#!/bin/sh\n"${process.execPath}" "${npmStubScript}" "$@"\n`,
        "utf8",
      );
      await fs.writeFile(
        npmStubCmd,
        `@echo off\r\n"${process.execPath}" "${npmStubScript}" %*\r\n`,
        "utf8",
      );
      await fs.chmod(npmStub, 0o755);

      await execFileAsync("node", [distEntry, "install", version, "--no-browsers"], {
        env: {
          ...process.env,
          HOME: tempHome,
          NODE_ENV: "production",
          PATH: `${tempBin}${path.delimiter}${process.env.PATH ?? ""}`,
          USERPROFILE: tempHome,
        },
      });

      const versionsDir = path.join(tempHome, ".pwvm", "versions", version);
      const browsersDir = path.join(versionsDir, "browsers");

      expect(await pathExists(versionsDir)).toBe(true);
      expect(await pathExists(browsersDir)).toBe(false);
    } finally {
      await fs.rm(tempHome, { recursive: true, force: true });
      await fs.rm(tempBin, { recursive: true, force: true });
    }
  });
});

const pathExists = async (target: string): Promise<boolean> => {
  try {
    await fs.stat(target);
    return true;
  } catch {
    return false;
  }
};
