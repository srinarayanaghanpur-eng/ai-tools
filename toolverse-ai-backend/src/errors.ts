export type ErrorCode =
  | 'INVALID_FILE'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_FORMAT'
  | 'PROCESSING_FAILED'
  | 'JOB_NOT_FOUND'
  | 'FILE_NOT_FOUND'
  | 'RATE_LIMITED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'AI_PROVIDER_ERROR'
  | 'STORAGE_ERROR'
  | 'INTERNAL_ERROR'
  | 'TOOL_NOT_FOUND'
  | 'TOOL_DISABLED'
  | 'QUOTA_EXCEEDED';

export class AppError extends Error {
  code: ErrorCode;
  status: number;
  details?: unknown;
  isOperational = true;
  constructor(code: ErrorCode, message: string, status = 400, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const Errors = {
  unauthorized: (msg = 'Authentication required') => new AppError('UNAUTHORIZED', msg, 401),
  forbidden: (msg = 'Forbidden') => new AppError('FORBIDDEN', msg, 403),
  notFound: (msg = 'Not found') => new AppError('NOT_FOUND', msg, 404),
  validation: (msg: string, details?: unknown) => new AppError('VALIDATION_ERROR', msg, 422, details),
  invalidFile: (msg = 'Invalid file') => new AppError('INVALID_FILE', msg, 400),
  tooLarge: (msg = 'File too large') => new AppError('FILE_TOO_LARGE', msg, 413),
  unsupported: (msg = 'Unsupported format') => new AppError('UNSUPPORTED_FORMAT', msg, 415),
  jobNotFound: () => new AppError('JOB_NOT_FOUND', 'Job not found', 404),
  toolNotFound: () => new AppError('TOOL_NOT_FOUND', 'Tool not found', 404),
  toolDisabled: () => new AppError('TOOL_DISABLED', 'Tool is disabled', 403),
  processingFailed: (msg = 'Processing failed', details?: unknown) =>
    new AppError('PROCESSING_FAILED', msg, 500, details),
  aiError: (msg = 'AI provider error') => new AppError('AI_PROVIDER_ERROR', msg, 502),
  storageError: (msg = 'Storage error') => new AppError('STORAGE_ERROR', msg, 500),
  conflict: (msg: string) => new AppError('CONFLICT', msg, 409),
  quota: (msg = 'Quota exceeded') => new AppError('QUOTA_EXCEEDED', msg, 429),
};
