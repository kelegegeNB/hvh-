import fs from 'fs';
import path from 'path';

// Define Log Levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const LOG_LEVEL_NAMES = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
};

const COLORS = {
  [LogLevel.DEBUG]: '\x1b[34m', // Blue
  [LogLevel.INFO]: '\x1b[32m',  // Green
  [LogLevel.WARN]: '\x1b[33m',  // Yellow
  [LogLevel.ERROR]: '\x1b[31m', // Red
  RESET: '\x1b[0m',
};

class Logger {
  private logDir: string;
  private minLevel: LogLevel;

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.minLevel = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;

    // Ensure log directory exists
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private getLogFileName(): string {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.logDir, `app-${date}.log`);
  }

  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const levelName = LOG_LEVEL_NAMES[level];
    let formattedMeta = '';
    if (meta) {
        try {
            formattedMeta = typeof meta === 'string' ? ` ${meta}` : ` ${JSON.stringify(meta)}`;
        } catch (e) {
            formattedMeta = ' [Circular/Error]';
        }
    }
    return `[${timestamp}] [${levelName}] ${message}${formattedMeta}`;
  }

  private writeToFile(logMessage: string) {
    const filePath = this.getLogFileName();
    fs.appendFileSync(filePath, logMessage + '\n', { encoding: 'utf8' });
  }

  public log(level: LogLevel, message: string, meta?: any) {
    if (level < this.minLevel) return;

    const logMessage = this.formatMessage(level, message, meta);

    // Console Output (Colored)
    const color = COLORS[level];
    console.log(`${color}${logMessage}${COLORS.RESET}`);

    // File Output (Plain)
    this.writeToFile(logMessage);
  }

  public debug(message: string, meta?: any) {
    this.log(LogLevel.DEBUG, message, meta);
  }

  public info(message: string, meta?: any) {
    this.log(LogLevel.INFO, message, meta);
  }

  public warn(message: string, meta?: any) {
    this.log(LogLevel.WARN, message, meta);
  }

  public error(message: string, meta?: any) {
    this.log(LogLevel.ERROR, message, meta);
  }
}

export const logger = new Logger();
