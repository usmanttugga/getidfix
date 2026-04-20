import { Request, Response, NextFunction } from 'express';

// ─── Error Code Constants ─────────────────────────────────────────────────────

export const ERROR_CODES = {
  // Generic
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Auth
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_REVOKED: 'TOKEN_REVOKED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  RESET_TOKEN_INVALID: 'RESET_TOKEN_INVALID',
  RESET_TOKEN_EXPIRED: 'RESET_TOKEN_EXPIRED',
  RESET_TOKEN_USED: 'RESET_TOKEN_USED',

  // Wallet
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  DUPLICATE_TRANSACTION: 'DUPLICATE_TRANSACTION',

  // Services
  SERVICE_NOT_FOUND: 'SERVICE_NOT_FOUND',
  SERVICE_DISABLED: 'SERVICE_DISABLED',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  EXTERNAL_API_TIMEOUT: 'EXTERNAL_API_TIMEOUT',

  // Users
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',

  // Transactions
  TRANSACTION_NOT_FOUND: 'TRANSACTION_NOT_FOUND',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// ─── AppError Class ───────────────────────────────────────────────────────────

/**
 * Custom application error with structured metadata for consistent API responses.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode | string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number,
    code: ErrorCode | string,
    details?: unknown,
    isOperational = true
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);

    // Capture stack trace (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  // ─── Factory Methods ────────────────────────────────────────────────────────

  static badRequest(message: string, details?: unknown): AppError {
    return new AppError(message, 400, ERROR_CODES.BAD_REQUEST, details);
  }

  static validationError(message: string, details?: unknown): AppError {
    return new AppError(message, 422, ERROR_CODES.VALIDATION_ERROR, details);
  }

  static unauthorized(message = 'Authentication required'): AppError {
    return new AppError(message, 401, ERROR_CODES.UNAUTHORIZED);
  }

  static forbidden(message = 'Access denied'): AppError {
    return new AppError(message, 403, ERROR_CODES.FORBIDDEN);
  }

  static notFound(resource: string): AppError {
    return new AppError(`${resource} not found`, 404, ERROR_CODES.NOT_FOUND);
  }

  static insufficientBalance(): AppError {
    return new AppError(
      'Insufficient wallet balance to complete this transaction.',
      402,
      ERROR_CODES.INSUFFICIENT_BALANCE
    );
  }

  static serviceDisabled(serviceName: string): AppError {
    return new AppError(
      `The service "${serviceName}" is currently disabled.`,
      503,
      ERROR_CODES.SERVICE_DISABLED
    );
  }

  static externalApiError(message: string, details?: unknown): AppError {
    return new AppError(message, 502, ERROR_CODES.EXTERNAL_API_ERROR, details);
  }
}

// ─── Error Handler Middleware ─────────────────────────────────────────────────

/**
 * Centralized Express error handler. Formats all errors as:
 * { error: { code, message, details } }
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Operational errors (AppError) — safe to expose to client
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined && { details: err.details }),
      },
    });
    return;
  }

  // Prisma known request errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as Error & { code?: string; meta?: unknown };

    if (prismaErr.code === 'P2002') {
      res.status(409).json({
        error: {
          code: ERROR_CODES.EMAIL_ALREADY_EXISTS,
          message: 'A record with this value already exists.',
          details: prismaErr.meta,
        },
      });
      return;
    }

    if (prismaErr.code === 'P2025') {
      res.status(404).json({
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: 'The requested record was not found.',
        },
      });
      return;
    }
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    res.status(422).json({
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Request validation failed.',
        details: (err as Error & { errors?: unknown }).errors,
      },
    });
    return;
  }

  // Unknown / programming errors — log and return generic message
  console.error('[Unhandled Error]', {
    name: err.name,
    message: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    error: {
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      message:
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred. Please try again later.'
          : err.message,
    },
  });
}
