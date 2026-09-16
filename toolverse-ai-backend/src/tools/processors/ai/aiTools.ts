import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { getAIProvider } from '../../../services/ai/factory.js';
import type { Processor } from '../../types.js';

async function writeText(name: string, content: string): Promise<string> {
  const dir = path.join(os.tmpdir(), 'toolverse-outputs');
  await fs.mkdir(dir, { recursive: true });
  const out = path.join(dir, `${crypto.randomUUID()}-${name}`);
  await fs.writeFile(out, content, 'utf8');
  return out;
}

function needText(ctx: any): string {
  // text may come from body.text, params.text, or extracted file content staged by the job pipeline
  if (typeof ctx.text === 'string' && ctx.text.trim()) return ctx.text;
  if (typeof ctx.params?.text === 'string' && ctx.params.text.trim()) return ctx.params.text;
  if (typeof ctx.params?.prompt === 'string' && ctx.params.prompt.trim()) return ctx.params.prompt;
  throw new Error('Missing text input (provide "text" field)');
}

async function runAi(kind: string, prompt: string, system: string, onProgress: (n: number) => void) {
  onProgress(15);
  const provider = getAIProvider();
  const result = await provider.generate(prompt, { systemPrompt: system, maxTokens: 2000, temperature: 0.4 });
  onProgress(90);
  return result;
}

export const aiSummarize: Processor = async (ctx) => {
  const text = needText(ctx);
  if (text.length < 20) throw new Error('Text too short to summarize');
  if (text.length > 100_000) throw new Error('Text too long (max 100k chars)');
  const len = String(ctx.params.length ?? 'medium');
  const r = await runAi('summarize', `Summarize the following text (${len} length). Return markdown:\n\n${text.slice(0, 60000)}`, 'You are a precise summarizer.', ctx.onProgress);
  const out = await writeText('summary.md', r.text);
  ctx.onProgress(100);
  return { paths: [out], names: ['summary.md'], mimeTypes: ['text/markdown'], meta: { provider: r.provider, model: r.model }, aiTokensUsed: r.tokensUsed };
};

export const aiRewrite: Processor = async (ctx) => {
  const text = needText(ctx);
  const tone = String(ctx.params.tone ?? 'professional');
  const r = await runAi('rewrite', `Rewrite the following text in a ${tone} tone. Keep meaning, improve clarity. Return only the rewritten text:\n\n${text.slice(0, 60000)}`, 'You are an expert editor.', ctx.onProgress);
  const out = await writeText('rewritten.md', r.text);
  ctx.onProgress(100);
  return { paths: [out], names: ['rewritten.md'], mimeTypes: ['text/markdown'], meta: { provider: r.provider, model: r.model }, aiTokensUsed: r.tokensUsed };
};

export const aiTranslate: Processor = async (ctx) => {
  const text = needText(ctx);
  const target = String(ctx.params.target ?? ctx.params.language ?? 'Spanish').slice(0, 40);
  if (!target) throw new Error('target language required');
  const r = await runAi('translate', `Translate the following text to ${target}. Return only the translation:\n\n${text.slice(0, 60000)}`, 'You are a professional translator.', ctx.onProgress);
  const out = await writeText('translation.md', r.text);
  ctx.onProgress(100);
  return { paths: [out], names: ['translation.md'], mimeTypes: ['text/markdown'], meta: { provider: r.provider, model: r.model, target }, aiTokensUsed: r.tokensUsed };
};

export const aiGenerate: Processor = async (ctx) => {
  const prompt = needText(ctx);
  if (prompt.length > 20000) throw new Error('Prompt too long');
  const r = await runAi('generate', prompt.slice(0, 20000), 'You are a helpful writing assistant.', ctx.onProgress);
  const out = await writeText('generated.md', r.text);
  ctx.onProgress(100);
  return { paths: [out], names: ['generated.md'], mimeTypes: ['text/markdown'], meta: { provider: r.provider, model: r.model }, aiTokensUsed: r.tokensUsed };
};

export const aiPdfSummarize: Processor = async (ctx) => {
  // inputPaths[0] is a PDF staged by the pipeline; extract then summarize (real pipeline, no fake)
  const { extractPdfText } = await import('../../../utils/pdfText.js');
  const data = await fs.readFile(ctx.inputPaths[0]);
  ctx.onProgress(20);
  const parsed = await extractPdfText(data);
  const text: string = (parsed?.text ?? '').trim();
  if (text.length < 20) throw new Error('No extractable text in PDF to summarize');
  const len = String(ctx.params.length ?? 'medium');
  const r = await runAi('pdf-summarize', `Summarize this PDF document (${len}). Return markdown with key points:\n\n${text.slice(0, 60000)}`, 'You are a precise document summarizer.', ctx.onProgress);
  const out = await writeText('pdf-summary.md', r.text);
  ctx.onProgress(100);
  return { paths: [out], names: ['pdf-summary.md'], mimeTypes: ['text/markdown'], meta: { provider: r.provider, model: r.model, pages: parsed?.numpages }, aiTokensUsed: r.tokensUsed };
};

export const aiGrammar: Processor = async (ctx) => {
  const text = needText(ctx);
  if (text.length < 3) throw new Error('Text too short to check');
  if (text.length > 50000) throw new Error('Text too long (max 50k chars)');
  const r = await runAi(
    'grammar',
    `Fix grammar, spelling and punctuation in the following text. Preserve meaning, tone and formatting. Return ONLY the corrected text, no explanations:\n\n${text.slice(0, 40000)}`,
    'You are a meticulous proofreader.',
    ctx.onProgress
  );
  const out = await writeText('corrected.md', r.text);
  ctx.onProgress(100);
  return { paths: [out], names: ['corrected.md'], mimeTypes: ['text/markdown'], meta: { provider: r.provider, model: r.model }, aiTokensUsed: r.tokensUsed };
};
