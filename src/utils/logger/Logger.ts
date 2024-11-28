type options = {
  noColor?: boolean
}
export class Logger {
  private name: string;
  private options: options;
  constructor(name: string, loggerOptions?: options) {
    this.name = name;
    this.options = loggerOptions ?? {};
  }

  public debug(...args: unknown[]) {
    if (process.env.NODE_ENV === 'production') {
      return;
    }
    const time = Math.floor(Date.now() / 1000);
    if (this.options.noColor) {
      console.log(`[${time}] [${this.name}] DEBUG: `, ...args);
    } else {
      console.log(`\x1b[36m [${time}] [${this.name}] DEBUG: \x1b[0m`, ...args);
    }
  }

  public log(...args: unknown[]) {
    const time = Math.floor(Date.now() / 1000);
    if (this.options.noColor) {
      console.log(`[${time}] [${this.name}] INFO: `, ...args);
    } else {
      console.log(`\x1b[32m [${time}] [${this.name}] INFO: \x1b[0m`, ...args);
    }
  }

  public warn(...args: unknown[]) {
    const time = Math.floor(Date.now() / 1000);
    if (this.options.noColor) {
      console.log(`[${time}] [${this.name}] WARN: `, ...args);
    } else {
      console.log(`\x1b[33m [${time}] [${this.name}] WARN: \x1b[0m`, ...args);
    }
  }

  public error(...args: unknown[]) {
    const time = Math.floor(Date.now() / 1000);
    if (this.options.noColor) {
      console.log(`[${time}] [${this.name}] ERROR: `, ...args);
    } else {
      console.log(`\x1b[31m [${time}] [${this.name}] ERROR: \x1b[0m`, ...args);
    }
  }
}
