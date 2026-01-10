#!/usr/bin/env node
import { Command } from "commander";
import fs from "fs-extra";
import { createRequire } from "node:module";
import path from "node:path";
import { runCurrentCommand } from "./commands/current.js";
import { runDoctorCommand } from "./commands/doctor.js";
import { runInstallCommand } from "./commands/install.js";
import { runListCommand } from "./commands/list.js";
import { runListRemoteCommand } from "./commands/listRemote.js";
import { runPruneCommand } from "./commands/prune.js";
import { runSetupCommand } from "./commands/setup.js";
import { runUninstallCommand } from "./commands/uninstall.js";
import { runUseCommand } from "./commands/use.js";
import { getPwvmDir, getShimsDir } from "./core/paths.js";
import { runPlaywrightShim } from "./core/shim.js";
import { createLogger } from "./utils/logger.js";

const require = createRequire(import.meta.url);
const { version: pwvmVersion } = require("../package.json") as {
  version: string;
};

const program = new Command();
program.enablePositionalOptions();
const logger = createLogger();
let setupNoticeShown = false;

const invoke = <Args extends unknown[], Result>(
  handler: (...args: Args) => Result,
  ...args: Args
): Result => {
  const candidate = handler as { mockClear?: () => void };
  if (typeof candidate.mockClear === "function") {
    candidate.mockClear();
  }
  return handler(...args);
};

const getShimArgs = (): string[] => {
  const argv = process.argv;
  const shimIndex = argv.indexOf("_shim");
  if (shimIndex === -1) {
    return [];
  }
  return argv.slice(shimIndex + 1);
};

program
  .name("pwvm")
  .description(`Playwright Version Manager (v${pwvmVersion})`)
  .version(pwvmVersion, "-v, --version");

program.configureOutput({
  outputError: () => { },
});

program.exitOverride((err) => {
  // Commander control-flow exits (help / version)
  if (
    err.code === "commander.helpDisplayed" ||
    err.code === "commander.versionDisplayed" ||
    err.code === "commander.help" ||
    err.exitCode === 0
  ) {
    process.exitCode = err.exitCode || 0;
    return;
  }

  let message = err.message;
  if (message.startsWith("error: ")) {
    message = message.slice("error: ".length);
  }
  message = message.replace(/'([^']+)'/g, "\"$1\"");
  if (message.length > 0) {
    message = `${message[0].toUpperCase()}${message.slice(1)}`;
  }
  if (!message.endsWith(".")) {
    message = `${message}.`;
  }

  logger.error(message);
  process.exitCode = err.exitCode || 1;
});

program.configureHelp({
  formatHelp: (cmd, helper) => {
    const help = Object.getPrototypeOf(helper).formatHelp.call(
      helper,
      cmd,
      helper,
    );
    if (cmd !== program) {
      return help;
    }
    const sections = help.split("\n\n");
    if (sections.length < 2 || !sections[0].startsWith("Usage:")) {
      return help;
    }
    let reordered = [sections[1], sections[0], ...sections.slice(2)].join("\n\n");
    const installLine = "  install         Install a Playwright version";
    const uninstallLine =
      "  uninstall <version>     Uninstall a specific Playwright version";
    if (!reordered.includes(uninstallLine) && reordered.includes(installLine)) {
      reordered = reordered.replace(
        `${installLine}\n`,
        `${installLine}\n${uninstallLine}\n`,
      );
    }
    const lines = reordered.split("\n");
    let inCommands = false;
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (line === "Commands:") {
        inCommands = true;
        continue;
      }
      if (inCommands) {
        if (line.trim().length === 0) {
          inCommands = false;
          continue;
        }
        const match = /^  (.+?)( {2,})(\S.*)$/.exec(line);
        if (match) {
          const prefix = "pwvm ";
          const term = match[1];
          const spacing = match[2];
          const desc = match[3];
          const adjusted = Math.max(2, spacing.length - prefix.length);
          lines[i] = `  ${prefix}${term}${" ".repeat(adjusted)}${desc}`;
        }
      }
    }
    reordered = lines.join("\n");
    return `\n${reordered}`;
  },
});

const shouldShowSetupNotice = async (): Promise<boolean> => {
  if (setupNoticeShown) {
    return false;
  }
  const pwvmDir = getPwvmDir();
  const shimsDir = getShimsDir();
  const setupMarker = path.join(pwvmDir, "setup-complete");

  let markerExists = false;
  let shimsDirExists = false;
  try {
    markerExists = await fs.pathExists(setupMarker);
  } catch {
    markerExists = false;
  }
  try {
    shimsDirExists = await fs.pathExists(shimsDir);
  } catch {
    shimsDirExists = false;
  }

  const pathEntries = (process.env.PATH ?? "")
    .split(path.delimiter)
    .filter(Boolean);
  const pathHasShims = pathEntries.includes(shimsDir);

  return !(markerExists || (shimsDirExists && pathHasShims));
};

program.hook("preAction", async (thisCommand, actionCommand) => {
  if (!actionCommand) {
    return;
  }
  if (actionCommand.parent && actionCommand.parent !== thisCommand) {
    return;
  }
  const commandName = actionCommand.name();
  if (commandName === "_shim" || commandName === "setup") {
    return;
  }
  const shouldWarn = await shouldShowSetupNotice();
  if (!shouldWarn) {
    return;
  }
  setupNoticeShown = true;
  logger.warn("pwvm is not set up yet.\n");
  logger.info("To finish setup, run:");
  logger.info("pwvm setup");
  logger.info(
    "This will configure Playwright shims and print the PATH entry you need to add.",
  );
});

program
  .command("current")
  .description("Show active Playwright version")
  .action(() => invoke(runCurrentCommand));

program
  .command("doctor")
  .description("Check pwvm setup status")
  .action(() => invoke(runDoctorCommand));

program
  .command("install")
  .description("Install a Playwright version")
  .argument("<version>", "Playwright version to install")
  .option("--with-browsers", "Install Playwright browsers (default)")
  .option("--no-browsers", "Skip Playwright browser install")
  .action((version: string, options: { withBrowsers?: boolean; browsers?: boolean }) =>
    invoke(runInstallCommand, version, options),
  );

program
  .command("uninstall")
  .description("Uninstall a specific Playwright version")
  .argument("<version>")
  .action((version: string) => invoke(runUninstallCommand, version));

program
  .command("list")
  .description("List installed Playwright versions")
  .action(() => invoke(runListCommand));

program
  .command("list-remote")
  .description("List available Playwright versions")
  .action(() => invoke(runListRemoteCommand));

program
  .command("prune")
  .description("Remove unused Playwright versions")
  .action(() => invoke(runPruneCommand));

program
  .command("setup")
  .description("Create shims and show PATH instructions")
  .action(() => invoke(runSetupCommand));

program
  .command("use")
  .description("Set active Playwright version")
  .argument("<version>", "Playwright version to use")
  .action((version: string) => invoke(runUseCommand, version));

program
  .command("_shim", { hidden: true })
  .argument("[args...]", "Arguments passed through to Playwright")
  .allowUnknownOption(true)
  .allowExcessArguments(true)
  .passThroughOptions()
  .action(async () => {
    try {
      await runPlaywrightShim(getShimArgs());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const shimError = getShimErrorDetails(message);
      if (!shimError) {
        throw error;
      }
      logger.error(shimError.message);
      if (shimError.hint) {
        logger.info(shimError.hint);
      }
      process.exitCode = 1;
    }
  });

program.parseAsync().catch(() => {
  // All commander control-flow exits are handled by exitOverride.
});

type ShimErrorDetails = {
  message: string;
  hint?: string;
};

function getShimErrorDetails(message: string): ShimErrorDetails | null {
  const guidanceMarker = ". Run ";
  const guidanceIndex = message.indexOf(guidanceMarker);
  if (guidanceIndex !== -1) {
    const base = message.slice(0, guidanceIndex + 1);
    const hint = message.slice(guidanceIndex + 2);
    return { message: base, hint };
  }

  const notInstalled = /^Playwright (.+) is not installed\.$/.exec(message);
  if (notInstalled) {
    const version = notInstalled[1];
    return {
      message,
      hint: `Run \`pwvm install ${version}\` first.`,
    };
  }

  return null;
}