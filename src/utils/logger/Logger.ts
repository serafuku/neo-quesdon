export class Logger {
  private name: string;
  constructor(name: string) {
    this.name = name;
  }

  public debug(...args: unknown[]) {
    if (process.env.NODE_ENV === 'production') {
      return;
    }
    const time = Math.floor(Date.now() / 1000);
    console.log(`\x1b[36m [${time}] [${this.name}] DEBUG: \x1b[0m`, ...args);
  }

  public log(...args: unknown[]) {
    const time = Math.floor(Date.now() / 1000);
    console.log(`\x1b[32m [${time}] [${this.name}] INFO: \x1b[0m`, ...args);
  }

  public warn(...args: unknown[]) {
    const time = Math.floor(Date.now() / 1000);
    console.log(`\x1b[33m [${time}] [${this.name}] WARN: \x1b[0m`, ...args);
  }

  public error(...args: unknown[]) {
    const time = Math.floor(Date.now() / 1000);
    console.log(`\x1b[31m [${time}] [${this.name}] ERROR: \x1b[0m`, ...args);
  }
}
