export type Logger = {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
};

const defaultLogger: Logger = {
  info: (message) => console.log(message),
  warn: (message) => console.warn(message),
  error: (message) => console.error(message),
};

const isDoctorLine = (message: string): boolean =>
  message.startsWith("info pwvm-doctor") || message.startsWith("WARN pwvm-doctor");

const ANSI = {
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  reset: "\x1b[0m",
};

const supportsColor = (): boolean => process.stdout.isTTY === true;

const prefixInfo = (message: string): string => {
  if (isDoctorLine(message)) {
    return message;
  }
  const base = message.startsWith("[INFO]:")
    ? message.slice("[INFO]:".length).trimStart()
    : message;
  const prefix = supportsColor()
    ? `${ANSI.green}[INFO]:${ANSI.reset}`
    : "[INFO]:";
  return `${prefix} ${base}`;
};

const prefixWarn = (message: string): string => {
  if (isDoctorLine(message)) {
    return message;
  }
  const base = message.startsWith("[WARN]:")
    ? message.slice("[WARN]:".length).trimStart()
    : message;
  const prefix = supportsColor()
    ? `${ANSI.yellow}[WARN]:${ANSI.reset}`
    : "[WARN]:";
  return `${prefix} ${base}`;
};

const prefixError = (message: string): string => {
  const trimmed = message.startsWith("[ERROR]:")
    ? message.slice("[ERROR]:".length).trimStart()
    : message.startsWith("Error:")
      ? message.slice("Error:".length).trimStart()
      : message;
  const prefix = supportsColor()
    ? `${ANSI.red}[ERROR]:${ANSI.reset}`
    : "[ERROR]:";
  return `${prefix} ${trimmed}`;
};

export const createLogger = (overrides: Partial<Logger> = {}): Logger => ({
  info: overrides.info ?? ((message) => defaultLogger.info(prefixInfo(message))),
  warn: overrides.warn ?? ((message) => defaultLogger.warn(prefixWarn(message))),
  error: overrides.error ?? ((message) => defaultLogger.error(prefixError(message))),
});

const toSingleLine = (message: string): string =>
  message.replace(/\s+/g, " ").trim();

export const formatError = (message: string, hint?: string): string => {
  const base = toSingleLine(message);
  const withPrefix = base.startsWith("Error:") ? base : `Error: ${base}`;
  if (!hint) {
    return withPrefix;
  }
  return `${withPrefix} ${toSingleLine(hint)}`;
};

export type DoctorLevel = "INFO" | "WARN";

const normalizeDoctorMessage = (message: string): string =>
  message.replace(/\s*\n\s*/g, " ").replace(/\s+$/g, "");

export const formatDoctorLine = (level: DoctorLevel, message: string): string =>
  `${level} pwvm-doctor ${normalizeDoctorMessage(message)}`;
