export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiGenerateOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface AiGenerateResult {
  text: string;
  tokensUsed?: number;
  model: string;
  provider: string;
}

export interface AIProvider {
  name: 'openai' | 'anthropic' | 'google';
  generate(prompt: string, opts?: AiGenerateOptions): Promise<AiGenerateResult>;
  chat?(messages: AiChatMessage[], opts?: AiGenerateOptions): Promise<AiGenerateResult>;
}
