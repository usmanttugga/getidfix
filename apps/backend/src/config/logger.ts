/**
 * Structured logger wrapper.
 * Outputs JSON in production for log aggregation tools (Datadog, CloudWatch, etc.)
 * and human-readable colored output in development.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// ANSI color codes for development output
const COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m',  // Green
  warn: '\x1b[33m',  // Yellow
  error: '\x1b[31m', // Red
};
const RESET = '\x1b[0m';

function formatEntry(entry: LogEntry): string {
  if (isProduction) {
    return JSON.stringify(entry);
  }

  const color = COLORS[entry.level];
  const { level, message, timestamp, ...meta } = entry;
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `${color}[${level.toUpperCase()}]${RESET} ${timestamp} ${message}${metaStr}`;
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  // Suppress all logs during tests unless explicitly enabled
  if (isTest && process.env.LOG_IN_TESTS !== 'true') {
    return;
  }

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };

  const formatted = formatEntry(entry);

  if (level === 'error') {
    console.error(formatted);
  } else if (level === 'warn') {
    console.warn(formatted);
  } else {
    console.log(formatted);
  }
}

// ─── Logger Interface ─────────────────────────────────────────────────────────

export const logger = {
  debug(message: string, meta?: Record<string, unknown>): void {
    log('debug', message, meta);
  },

  info(message: string, meta?: Record<string, unknown>): void {
    log('info', message, meta);
  },

  warn(message: string, meta?: Record<string, unknown>): void {
    log('warn', message, meta);
  },

  error(message: string, meta?: Record<string, unknown>): void {
    log('error', message, meta);
  },

  /**
   * Logs an error object with stack trace.
   */
  errorWithStack(message: string, err: unknown, meta?: Record<string, unknown>): void {
    const errorMeta: Record<string, unknown> = { ...meta };

    if (err instanceof Error) {
      errorMeta.errorName = err.name;
      errorMeta.errorMessage = err.message;
      if (!isProduction) {
        errorMeta.stack = err.stack;
      }
    } else {
      errorMeta.error = err;
    }

    log('error', message, errorMeta);
  },
};

export default logger;
