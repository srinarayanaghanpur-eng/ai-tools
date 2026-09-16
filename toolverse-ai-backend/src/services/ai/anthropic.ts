import { env } from '../../config/env.js';
import { Errors } from '../../errors.js';
import type { AIProvider, AiGenerateOptions, AiGenerateResult } from './types.js';

export class AnthropicProvider implements AIProvider {
  name = 'anthropic' as const;

  async generate(prompt: string, opts?: AiGenerateOptions): Promise<AiGenerateResult> {
    if (!env.ANTHROPIC_API_KEY) throw Errors.aiError('ANTHROPIC_API_KEY is not configured');
    const model = opts?.model ?? 'claude-3-5-sonnet-latest';
    const res = await fetch(`${env.ANTHROPIC_BASE_URL.replace(/\/$/, '')}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: opts?.maxTokens ?? 1500,
        temperature: opts?.temperature ?? 0.4,
        system: opts?.systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw Errors.aiError(`Anthropic error ${res.status}: ${body.slice(0, 500)}`);
    }
    const json: any = await res.json();
    const text = (json?.content ?? []).map((b: any) => b?.text ?? '').join('').trim();
    if (!text) throw Errors.aiError('Anthropic returned empty response');
    const tokens = json?.usage ? (json.usage.input_tokens ?? 0) + (json.usage.output_tokens ?? 0) : undefined;
    return { text, tokensUsed: tokens, model, provider: 'anthropic' };
  }
}
