import { env } from '../../config/env.js';
import { Errors } from '../../errors.js';
import type { AIProvider, AiGenerateOptions, AiGenerateResult } from './types.js';

export class OpenAIProvider implements AIProvider {
  name = 'openai' as const;

  async generate(prompt: string, opts?: AiGenerateOptions): Promise<AiGenerateResult> {
    if (!env.OPENAI_API_KEY) throw Errors.aiError('OPENAI_API_KEY is not configured');
    const model = opts?.model ?? env.AI_DEFAULT_MODEL;
    const res = await fetch(`${env.OPENAI_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          ...(opts?.systemPrompt ? [{ role: 'system', content: opts.systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
        max_tokens: opts?.maxTokens ?? 1500,
        temperature: opts?.temperature ?? 0.4,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw Errors.aiError(`OpenAI error ${res.status}: ${body.slice(0, 500)}`);
    }
    const json: any = await res.json();
    const text = json?.choices?.[0]?.message?.content?.trim() ?? '';
    if (!text) throw Errors.aiError('OpenAI returned empty response');
    return { text, tokensUsed: json?.usage?.total_tokens, model, provider: 'openai' };
  }
}
