import { describe, it, expect } from 'vitest';
import { listTools, getToolBySlug, getToolById } from '../src/tools/registry.js';
import { api } from './helpers.js';

describe('tool registry', () => {
  it('registers all required tool families', () => {
    const slugs = new Set(listTools().map((t) => t.slug));
    const required = [
      'background-remover', 'image-compressor', 'image-resizer', 'jpg-to-png', 'png-to-jpg', 'webp-to-jpg',
      'image-converter', 'image-effects', 'png-to-ico',
      'pdf-to-word', 'pdf-to-jpg', 'pdf-to-png', 'merge-pdf', 'split-pdf', 'compress-pdf', 'rotate-pdf', 'pdf-ocr', 'pdf-text-extraction',
      'docx-to-pdf', 'pdf-to-docx', 'txt-to-pdf', 'csv-to-xlsx', 'xlsx-to-csv', 'docx-to-txt', 'markdown-to-pdf',
      'mp4-to-mp3', 'video-compressor', 'audio-converter', 'video-converter', 'video-to-gif',
      'json-formatter', 'json-validator', 'base64-encoder-decoder', 'url-encoder-decoder', 'uuid-generator', 'hash-generator',
      'yaml-converter', 'jwt-decoder',
      'summarizer', 'rewriter', 'translator', 'text-generator', 'pdf-summarizer', 'grammar-checker',
    ];
    for (const s of required) expect(slugs.has(s), `missing ${s}`).toBe(true);
  });

  it('every tool defines id/name/category/input/processor/limits/status', () => {
    for (const t of listTools()) {
      expect(t.id).toBeTypeOf('string');
      expect(t.name).toBeTypeOf('string');
      expect(t.category).toMatch(/image|pdf|document|media|developer|ai/);
      expect(t.inputType).toBeTypeOf('string');
      expect(t.processor).toBeTypeOf('function');
      expect(t.limits.maxFiles).toBeGreaterThanOrEqual(0);
      expect(t.status).toMatch(/active|disabled|beta/);
    }
  });

  it('lookup by id and slug', () => {
    expect(getToolBySlug('json-formatter')?.id).toBe('dev-json-fmt');
    expect(getToolById('dev-json-fmt')?.slug).toBe('json-formatter');
  });

  it('GET /api/tools exposes all tools without functions', async () => {
    const r = await api().get('/api/tools');
    expect(r.status).toBe(200);
    expect(r.body.data.tools.length).toBeGreaterThanOrEqual(30);
    expect(r.body.data.tools[0].processor).toBeUndefined();
  });

  it('GET /api/tools/:slug returns one tool, 404 for unknown', async () => {
    const r = await api().get('/api/tools/json-formatter');
    expect(r.status).toBe(200);
    const nf = await api().get('/api/tools/nope');
    expect(nf.status).toBe(404);
    expect(nf.body.error.code).toBe('TOOL_NOT_FOUND');
  });
});
