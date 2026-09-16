import { env } from '../../config/env.js';
import type { AIProvider } from './types.js';
import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { GoogleProvider } from './google.js';

/** Switch providers via AI_PROVIDER env without rewriting tool logic. */
export function getAIProvider(name?: string): AIProvider {
  const which = (name ?? env.AI_PROVIDER).toLowerCase();
  if (which === 'anthropic') return new AnthropicProvider();
  if (which === 'google') return new GoogleProvider();
  return new OpenAIProvider();
}
