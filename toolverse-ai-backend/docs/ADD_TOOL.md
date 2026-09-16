# Adding a New Tool / Converter / AI Provider

## New tool (no route changes)

`src/tools/registry.ts` is the single source of truth. Routes never hardcode converters.

1. Create a processor:
   ```ts
   // src/tools/processors/<category>/myTools.ts
   import type { Processor } from '../../types.js';
   export const myTool: Processor = async (ctx) => {
     ctx.onProgress(50);
     // ctx.inputPaths (tmp files), ctx.inputNames, ctx.params, ctx.text
     // ... real processing, write to tmp, return paths+names
     return { paths: ['/tmp/...'], names: ['out.pdf'] };
   };
   ```
2. Register:
   ```ts
   { id: 'my-id', slug: 'my-slug', name: 'My Tool', category: 'pdf',
     description: '...', inputType: 'file', acceptedFormats: ['.pdf'],
     outputFormat: '.pdf', limits: { maxFiles: 1, maxFileMb: 50, timeoutSeconds: 120 },
     status: 'active', processor: myTool }
   ```
3. Restart. `syncToolsToDb()` upserts it; `GET /api/tools` + OpenAPI pick it up automatically.

`ToolDefinition` fields: `id, name, category, inputType, acceptedFormats, validationRules?, processor, outputFormat, limits, status`.

## New converter

Extend `BaseConverter` in `src/tools/converters/`:

```ts
export class MyConverter extends BaseConverter<Opts> {
  name = 'my';
  async convert(input: string[], opts: Opts, onProgress?: (n:number)=>void) {
    const out = await this.tmpOutput('.pdf');
    // ... real conversion
    return [out];
  }
}
```

Then call it from a processor. Converters: `pdf.ts (PdfConverter)`, `image.ts (ImageConverter)`, `document.ts (DocumentConverter)`, `media.ts (MediaConverter)`.

## New AI provider

1. Implement `AIProvider` (`src/services/ai/types.ts`):
   ```ts
   export class MyProvider implements AIProvider {
     name = 'my' as const;
     async generate(prompt: string, opts?: AiGenerateOptions) { /* ... */ }
   }
   ```
2. Return it from `getAIProvider()` in `src/services/ai/factory.ts` for a new `AI_PROVIDER` value.
3. Keys via env only. AI tools (`src/tools/processors/ai/`) call `getAIProvider()` — no tool rewrite needed.

## Validation & limits

- Per-tool `acceptedFormats` + `limits` are enforced server-side in `validateInputFiles()` (extension + sniffed MIME via `file-type` + size).
- Add param checks inside the processor (e.g. `width 1..8000`, `crf 18..35`) and throw `Error` — the pipeline maps to `PROCESSING_FAILED` with a safe message.
