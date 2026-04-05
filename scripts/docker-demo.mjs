import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

// Resolve repo-relative paths from this script's location.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const demoDir = path.join(repoRoot, ".tmp", "docker-demo");
const packedTarball = path.join(demoDir, "pwvm-demo.tgz");
const npmCacheDir = path.join(demoDir, ".npm-cache");
const dockerfile = "Dockerfile.demo";
const imageTag = "pwvm-demo:nonroot";

// Run a command streaming its output so the demo reads naturally in the terminal.
const run = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      stdio: "inherit",
      shell: false,
      env: {
        ...process.env,
        npm_config_cache: npmCacheDir,
      },
      ...options,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`));
    });
  });

// Run a command while also capturing stdout for follow-up steps like `npm pack`.
const runCapture = (command, args) =>
  new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    const child = spawn(command, args, {
      cwd: repoRoot,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        npm_config_cache: npmCacheDir,
      },
    });

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      process.stdout.write(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      process.stderr.write(chunk);
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}\n${stderr}`));
    });
  });

// Keep all demo artifacts local to the repo so the flow is repeatable.
await fs.mkdir(demoDir, { recursive: true });
await fs.mkdir(npmCacheDir, { recursive: true });
await fs.rm(packedTarball, { force: true });

// Build the distributable CLI and pack it as npm would publish it.
await run("npm", ["run", "build"]);

const packedName = await runCapture("npm", [
  "pack",
  "--silent",
  "--pack-destination",
  demoDir,
]);

const packedSource = path.join(demoDir, packedName.split("\n").pop());
await fs.rm(packedTarball, { force: true });
await fs.rename(packedSource, packedTarball);

console.log("\n### Building Docker demo image: nonroot");
await run("docker", ["build", "-f", dockerfile, "-t", imageTag, "."]);

console.log("\n### Running Docker demo image: nonroot");
await run("docker", ["run", "--rm", imageTag]);
