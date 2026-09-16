import { env } from '../../config/env.js';
import { Errors } from '../../errors.js';
import type { AIProvider, AiGenerateOptions, AiGenerateResult } from './types.js';

export class GoogleProvider implements AIProvider {
  name = 'google' as const;

  async generate(prompt: string, opts?: AiGenerateOptions): Promise<AiGenerateResult> {
    if (!env.GOOGLE_AI_KEY) throw Errors.aiError('GOOGLE_GENERATIVE_AI_KEY is not configured');
    const model = opts?.model ?? env.GOOGLE_AI_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.GOOGLE_AI_KEY)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: opts?.systemPrompt ? { parts: [{ text: opts.systemPrompt }] } : undefined,
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: opts?.maxTokens ?? 1500, temperature: opts?.temperature ?? 0.4 },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw Errors.aiError(`Google AI error ${res.status}: ${body.slice(0, 500)}`);
    }
    const json: any = await res.json();
    const text = (json?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p?.text ?? '').join('').trim();
    if (!text) throw Errors.aiError('Google AI returned empty response');
    const tokens = json?.usageMetadata?.totalTokenCount;
    return { text, tokensUsed: tokens, model, provider: 'google' };
  }
}
