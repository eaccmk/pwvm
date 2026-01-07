import type { Logger } from "./logger.js";

export type ProgressHandle = {
  start: () => void;
  succeed: () => void;
  fail: () => void;
};

type ProgressOptions = {
  label: string;
  logger?: Pick<Logger, "info">;
  stream?: NodeJS.WriteStream;
  intervalMs?: number;
};

export const createProgress = (options: ProgressOptions): ProgressHandle => {
  const stream = options.stream ?? process.stdout;
  const isTTY = stream.isTTY === true;
  const intervalMs = options.intervalMs ?? 100;
  const label = options.label;
  const logger = options.logger;
  const width = 24;
  const gradient = ["\x1b[34m", "\x1b[94m", "\x1b[97m", "\x1b[94m", "\x1b[34m"];
  const reset = "\x1b[0m";

  let progress = 0;
  let timer: NodeJS.Timeout | null = null;
  let lastVisibleLength = 0;
  let phase = 0;
  let started = false;

  const render = (): void => {
    const filled = Math.min(width, Math.round((progress / 100) * width));
    let bar = "";
    for (let i = 0; i < filled; i += 1) {
      const color = gradient[(i + phase) % gradient.length];
      bar += `${color}█${reset}`;
    }
    bar += "░".repeat(width - filled);
    const percentText = `${progress.toFixed(0)}%`;
    const line = `${label} [${bar}] ${percentText}`;
    const visibleLength = label.length + 3 + width + 2 + percentText.length;
    stream.write(
      `\r${line}${" ".repeat(Math.max(0, lastVisibleLength - visibleLength))}`,
    );
    lastVisibleLength = visibleLength;
  };

  const clear = (): void => {
    if (lastVisibleLength === 0) {
      return;
    }
    stream.write(`\r${" ".repeat(lastVisibleLength)}\r`);
    lastVisibleLength = 0;
  };

  return {
    start: () => {
      if (started) {
        return;
      }
      started = true;
      progress = 0;

      if (!isTTY) {
        logger?.info(`${label}... (in progress)`);
        return;
      }

      render();
      timer = setInterval(() => {
        if (progress < 95) {
          progress += 1;
          phase = (phase + 1) % gradient.length;
          render();
        }
      }, intervalMs);
    },
    succeed: () => {
      if (!started) {
        return;
      }
      if (timer) {
        clearInterval(timer);
        timer = null;
      }

      if (!isTTY) {
        logger?.info(`${label}... done`);
        return;
      }

      progress = 100;
      phase = 0;
      render();
      stream.write("\n");
      lastVisibleLength = 0;
    },
    fail: () => {
      if (!started) {
        return;
      }
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      if (isTTY) {
        clear();
      }
    },
  };
};
