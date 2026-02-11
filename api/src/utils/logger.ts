/**
 * Structured logging utility for the application
 * Provides consistent logging format across all services
 */

export interface LogContext {
  requestId?: string;
  userId?: string;
  steamId?: string;
  sessionId?: string;
  path?: string;
  errorCode?: string;
  [key: string]: unknown;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  metadata?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private minLevel: LogLevel;
  private prettyPrint: boolean;

  constructor() {
    // Default to 'info' in production, 'debug' in development
    this.minLevel =
      (process.env.LOG_LEVEL as LogLevel) ||
      (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
    this.prettyPrint = process.env.NODE_ENV !== 'production';
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel];
  }

  /**
   * Sanitize sensitive data from log context
   */
  private sanitizeContext(context?: LogContext): LogContext | undefined {
    if (!context) {
      return undefined;
    }

    const sanitized = { ...context };

    // Remove or mask sensitive fields
    const sensitiveFields = [
      'password',
      'token',
      'apiKey',
      'secret',
      'sessionSecret',
      'csrfSecret',
    ];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Format and output a log entry
   */
  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    metadata?: Record<string, unknown>,
    error?: Error
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.sanitizeContext(context),
      metadata,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: this.prettyPrint ? error.stack : undefined,
      };
    }

    if (this.prettyPrint) {
      this.prettyLog(entry);
    } else {
      this.jsonLog(entry);
    }
  }

  /**
   * Pretty print for development
   */
  private prettyLog(entry: LogEntry): void {
    const colors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m', // Green
      warn: '\x1b[33m', // Yellow
      error: '\x1b[31m', // Red
    };
    const reset = '\x1b[0m';
    const color = colors[entry.level];

    let output = `${color}[${entry.timestamp}] ${entry.level.toUpperCase()}${reset}: ${entry.message}`;

    if (entry.context) {
      output += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`;
    }

    if (entry.metadata) {
      output += `\n  Metadata: ${JSON.stringify(entry.metadata, null, 2)}`;
    }

    if (entry.error) {
      output += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack) {
        output += `\n  Stack: ${entry.error.stack}`;
      }
    }

    const logMethod =
      entry.level === 'error'
        ? console.error
        : entry.level === 'warn'
          ? console.warn
          : console.log;

    logMethod(output);
  }

  /**
   * JSON output for production
   */
  private jsonLog(entry: LogEntry): void {
    const logMethod =
      entry.level === 'error'
        ? console.error
        : entry.level === 'warn'
          ? console.warn
          : console.log;

    logMethod(JSON.stringify(entry));
  }

  /**
   * Debug level logging - verbose information for troubleshooting
   */
  public debug(
    message: string,
    context?: LogContext,
    metadata?: Record<string, unknown>
  ): void {
    this.log('debug', message, context, metadata);
  }

  /**
   * Info level logging - general informational messages
   */
  public info(
    message: string,
    context?: LogContext,
    metadata?: Record<string, unknown>
  ): void {
    this.log('info', message, context, metadata);
  }

  /**
   * Warning level logging - potential issues that don't prevent operation
   */
  public warn(
    message: string,
    context?: LogContext,
    metadata?: Record<string, unknown>
  ): void {
    this.log('warn', message, context, metadata);
  }

  /**
   * Error level logging - errors that need attention
   */
  public error(
    message: string,
    error: Error,
    context?: LogContext,
    metadata?: Record<string, unknown>
  ): void {
    this.log('error', message, context, metadata, error);
  }

  /**
   * Authentication-specific logging helper
   * Automatically tags logs as auth-related
   */
  public auth(
    message: string,
    context: LogContext,
    metadata?: Record<string, unknown>
  ): void {
    this.info(message, { ...context, category: 'auth' }, metadata);
  }
}

// Export singleton instance
export const logger = new Logger();
