export type ToolCategory = 'image' | 'pdf' | 'document' | 'media' | 'developer' | 'ai';
export type InputType = 'file' | 'files' | 'text' | 'file+text' | 'json';
export type JobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface ToolLimits {
  maxFiles: number;
  maxFileMb: number;
  timeoutSeconds: number;
  requiresAuth?: boolean;
  premiumOnly?: boolean;
}

export interface ProcessorContext {
  jobId: string;
  userId: string | null;
  toolId: string;
  /** Absolute paths to validated input files on local tmp */
  inputPaths: string[];
  /** Original filenames (sanitized) */
  inputNames: string[];
  /** Parsed params from request (validated per-tool) */
  params: Record<string, any>;
  /** Text input for text/json tools */
  text?: string;
  onProgress: (pct: number) => void;
  signal?: AbortSignal;
}

export interface ProcessorOutput {
  /** Absolute paths to result files */
  paths: string[];
  /** Suggested download names */
  names: string[];
  mimeTypes?: string[];
  meta?: Record<string, any>;
  aiTokensUsed?: number;
}

export type Processor = (ctx: ProcessorContext) => Promise<ProcessorOutput>;

export interface ToolDefinition {
  id: string;
  slug: string;
  name: string;
  category: ToolCategory;
  description: string;
  inputType: InputType;
  acceptedFormats: string[]; // extensions like ['.jpg','.png'] or ['text'] for text tools
  validationRules?: Record<string, any>;
  outputFormat: string;
  limits: ToolLimits;
  status: 'active' | 'disabled' | 'beta';
  processor: Processor;
  /** JSON-schema-ish hint for params, used for docs + validation */
  paramsSchema?: Record<string, any>;
}
