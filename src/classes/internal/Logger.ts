import colors from "ansi-colors";
import { format } from "util";

export type LogLevel = "success" | "error" | "warn" | "info" | "debug";

interface LoggerOptions {
  logLevel?: LogLevel;
}

export default class Logger extends console.Console {
  private logLevel: LogLevel = "debug";

  constructor(options?: LoggerOptions) {
    super({ stdout: process.stdout });
    if (options?.logLevel) {
      this.logLevel = options.logLevel;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: { [key in LogLevel]: number } = {
      debug: 1,
      info: 2,
      warn: 3,
      error: 4,
      success: 5,
    };
    return levels[level] >= levels[this.logLevel];
  }

  private logWithStyle(level: LogLevel, args: unknown[]): void {
    if (!this.shouldLog(level)) return;

    const colorMap: { [key in LogLevel]: keyof typeof colors.styles } = {
      success: "greenBright",
      error: "redBright",
      warn: "yellowBright",
      info: "cyanBright",
      debug: "magentaBright",
    };

    const message = format(...args);
    const colorFunc = colors[colorMap[level]];
    const formattedMessage =
      colorFunc.inverse.bold(` ${level.toUpperCase()} `) +
      colorFunc(` ${message}`);

    console.log(formattedMessage);
  }

  override info(...args: unknown[]): this {
    this.logWithStyle("info", args);
    return this;
  }

  override warn(...args: unknown[]): this {
    this.logWithStyle("warn", args);
    return this;
  }

  override error(...args: unknown[]): this {
    this.logWithStyle("error", args);
    return this;
  }

  override debug(...args: unknown[]): this {
    this.logWithStyle("debug", args);
    return this;
  }

  clear() {
    super.clear();
    return this;
  }

  success(...args: unknown[]): this {
    this.logWithStyle("success", args);
    return this;
  }

  subLog(level: number, ...args: unknown[]): this {
    const colorFunc = colors.cyanBright;
    const message = format(...args);
    const formattedMessage = `${"   ".repeat(level)}${colorFunc(
      "└─"
    )} ${colorFunc(` ${message}`)}`;

    console.log(formattedMessage);
    return this;
  }
}
