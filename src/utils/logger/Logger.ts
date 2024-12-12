type options = {
  noColor?: boolean;
};

const logLevels = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const;

type logLevelNameType = keyof typeof logLevels;
type logLevelNumType = (typeof logLevels)[logLevelNameType];
export class Logger {
  private name: string;
  private options: options;
  private logLevel: logLevelNumType;
  constructor(name: string, loggerOptions?: options) {
    this.name = name;
    this.options = loggerOptions ?? {};
    if (process.env.APP_LOG_LEVEL) {
      const levelName = process.env.APP_LOG_LEVEL.toLowerCase();
      switch (levelName) {
        case 'verbose':
          this.logLevel = logLevels['debug'];
          break;
        case 'debug':
        case 'info':
        case 'warn':
        case 'error':
          this.logLevel = logLevels[levelName];
          break;
        case 'log':
        default:
          this.logLevel = logLevels['info'];
      }
    } else {
      if (process.env.NODE_ENV === 'production') {
        this.logLevel = logLevels['info'];
      } else {
        this.logLevel = logLevels['debug'];
      }
    }
  }

  public debug(...args: unknown[]) {
    if (this.logLevel > logLevels['debug']) {
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
    if (this.logLevel > logLevels['info']) {
      return;
    }
    const time = Math.floor(Date.now() / 1000);
    if (this.options.noColor) {
      console.log(`[${time}] [${this.name}] INFO: `, ...args);
    } else {
      console.log(`\x1b[32m [${time}] [${this.name}] INFO: \x1b[0m`, ...args);
    }
  }

  public warn(...args: unknown[]) {
    if (this.logLevel > logLevels['warn']) {
      return;
    }
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
