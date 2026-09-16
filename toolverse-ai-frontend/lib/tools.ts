import type { LucideIcon } from "lucide-react";
import {
  PenLine, FileText, RefreshCw, Languages, SpellCheck, FileSearch,
  Eraser, Archive, Scaling, Repeat, Image as ImageIcon, FileImage,
  FileUp, FileDown, Files, Scissors, FileArchive, RotateCw, ScanText,
  FileOutput, FileInput, FilePlus2, Table, Sheet,
  Video, Clapperboard, Music, AudioLines, Film,
  Braces, ShieldCheck, Binary, Link2, Fingerprint, Hash,
  QrCode, KeyRound, WholeWord, CaseSensitive, Palette, Ruler,
  Tag, AlignLeft, Activity, Percent, Wand2, FileDigit,
} from "lucide-react";

export type UiType = "file" | "files" | "text" | "local";

export type ToolCategorySlug =
  | "ai" | "image" | "pdf" | "document" | "media" | "developer" | "utilities";

export type FrontendTool = {
  id: string;
  slug: string;
  name: string;
  category: ToolCategorySlug;
  description: string;
  longDescription?: string;
  icon: LucideIcon;
  accepted: string[]; // extensions or ["text"]
  uiType: UiType;
  tags: string[];
  popular?: boolean;
  params?: Array<{
    key: string;
    label: string;
    type: "text" | "number" | "select" | "textarea";
    placeholder?: string;
    defaultValue?: string | number;
    options?: Array<{ value: string; label: string }>;
    hint?: string;
  }>;
  localKind?: "qr" | "password" | "word-counter" | "case" | "color" | "unit" | "slug" | "lorem" | "bmi" | "percent";
};

export const CATEGORIES: Array<{
  slug: ToolCategorySlug;
  name: string;
  tagline: string;
  icon: LucideIcon;
}> = [
  { slug: "ai", name: "AI Tools", tagline: "Write, summarize, translate", icon: PenLine },
  { slug: "image", name: "Image", tagline: "Compress, convert, resize", icon: ImageIcon },
  { slug: "pdf", name: "PDF", tagline: "Merge, split, extract", icon: FileText },
  { slug: "document", name: "Documents", tagline: "Office conversions", icon: Files },
  { slug: "media", name: "Video & Audio", tagline: "Transcode & extract", icon: Clapperboard },
  { slug: "developer", name: "Developer", tagline: "Format & encode", icon: Braces },
  { slug: "utilities", name: "Utilities", tagline: "Everyday helpers", icon: KeyRound },
];

export const categoryName = (slug: string) =>
  CATEGORIES.find((c) => c.slug === slug)?.name ?? slug;

export const TOOLS: FrontendTool[] = [
  // ---- AI ----
  { id: "ai-generate", slug: "text-generator", name: "AI Writer", category: "ai", description: "Generate drafts, ideas and copy with AI.", icon: PenLine, accepted: ["text"], uiType: "text", tags: ["ai", "writer", "generate", "text"], popular: true, params: [{ key: "prompt", label: "Prompt", type: "textarea", placeholder: "Write a product launch email…" }] },
  { id: "ai-sum", slug: "summarizer", name: "Summarizer", category: "ai", description: "Condense long text into key points.", icon: FileSearch, accepted: ["text"], uiType: "text", tags: ["ai", "summary", "text"], popular: true, params: [{ key: "text", label: "Text to summarize", type: "textarea", placeholder: "Paste text…" }, { key: "length", label: "Length", type: "select", defaultValue: "medium", options: [{ value: "short", label: "Short" }, { value: "medium", label: "Medium" }, { value: "long", label: "Detailed" }] }] },
  { id: "ai-rewrite", slug: "rewriter", name: "Rewriter", category: "ai", description: "Rewrite text in a new tone.", icon: RefreshCw, accepted: ["text"], uiType: "text", tags: ["ai", "rewrite", "paraphrase"], params: [{ key: "text", label: "Text", type: "textarea", placeholder: "Paste text…" }, { key: "tone", label: "Tone", type: "select", defaultValue: "professional", options: [{ value: "professional", label: "Professional" }, { value: "casual", label: "Casual" }, { value: "concise", label: "Concise" }, { value: "friendly", label: "Friendly" }] }] },
  { id: "ai-translate", slug: "translator", name: "Translator", category: "ai", description: "Translate text between languages.", icon: Languages, accepted: ["text"], uiType: "text", tags: ["ai", "translate", "language"], params: [{ key: "text", label: "Text", type: "textarea", placeholder: "Paste text…" }, { key: "target", label: "Target language", type: "text", defaultValue: "Spanish", placeholder: "Spanish" }] },
  { id: "ai-grammar", slug: "grammar-checker", name: "Grammar Checker", category: "ai", description: "Fix grammar and clarity with AI.", icon: SpellCheck, accepted: ["text"], uiType: "text", tags: ["ai", "grammar", "proofread"], params: [{ key: "text", label: "Text", type: "textarea", placeholder: "Paste text…" }] },
  { id: "ai-pdf-sum", slug: "pdf-summarizer", name: "PDF Summarizer", category: "ai", description: "Upload a PDF, get an AI summary.", icon: FileSearch, accepted: [".pdf"], uiType: "file", tags: ["ai", "pdf", "summary"], popular: true, params: [{ key: "length", label: "Length", type: "select", defaultValue: "medium", options: [{ value: "short", label: "Short" }, { value: "medium", label: "Medium" }, { value: "long", label: "Detailed" }] }] },

  // ---- Image ----
  { id: "img-bg-remove", slug: "background-remover", name: "Background Remover", category: "image", description: "Remove the background from your image.", longDescription: "AI-powered background removal. Best on photos with a clear subject.", icon: Eraser, accepted: [".png", ".jpg", ".jpeg", ".webp"], uiType: "file", tags: ["image", "background", "remove", "png"], popular: true },
  { id: "img-compress", slug: "image-compressor", name: "Image Compressor", category: "image", description: "Shrink file size with quality control.", icon: Archive, accepted: [".jpg", ".jpeg", ".png", ".webp"], uiType: "file", tags: ["image", "compress", "optimize"], popular: true, params: [{ key: "quality", label: "Quality (1–100)", type: "number", defaultValue: 75 }] },
  { id: "img-resize", slug: "image-resizer", name: "Image Resizer", category: "image", description: "Resize by width or height.", icon: Scaling, accepted: [".jpg", ".jpeg", ".png", ".webp"], uiType: "file", tags: ["image", "resize", "dimensions"], params: [{ key: "width", label: "Width (px)", type: "number", placeholder: "1200" }, { key: "height", label: "Height (px)", type: "number", placeholder: "800" }] },
  { id: "img-jpg-png", slug: "jpg-to-png", name: "JPG to PNG", category: "image", description: "Convert JPG photos to PNG.", icon: Repeat, accepted: [".jpg", ".jpeg"], uiType: "file", tags: ["image", "convert", "jpg", "png"] },
  { id: "img-png-jpg", slug: "png-to-jpg", name: "PNG to JPG", category: "image", description: "Convert PNG images to JPG.", icon: Repeat, accepted: [".png"], uiType: "file", tags: ["image", "convert", "png", "jpg"], popular: true, params: [{ key: "quality", label: "Quality (1–100)", type: "number", defaultValue: 90 }] },
  { id: "img-webp-jpg", slug: "webp-to-jpg", name: "WEBP to JPG", category: "image", description: "Convert modern WEBP to JPG.", icon: FileImage, accepted: [".webp"], uiType: "file", tags: ["image", "convert", "webp", "jpg"] },
  { id: "img-convert", slug: "image-converter", name: "Image Converter", category: "image", description: "Convert between JPG, PNG and WEBP.", icon: ImageIcon, accepted: [".png", ".jpg", ".jpeg", ".webp"], uiType: "file", tags: ["image", "convert", "jpg", "png", "webp"], popular: true, params: [{ key: "format", label: "Format", type: "select", defaultValue: "png", options: [{ value: "jpeg", label: "JPG" }, { value: "png", label: "PNG" }, { value: "webp", label: "WEBP" }] }, { key: "quality", label: "Quality (1–100)", type: "number", defaultValue: 90 }] },
  { id: "img-effects", slug: "image-effects", name: "Image Effects", category: "image", description: "Grayscale, blur, sharpen and more.", icon: Wand2, accepted: [".jpg", ".jpeg", ".png", ".webp"], uiType: "file", tags: ["image", "effect", "filter", "grayscale", "blur"], params: [{ key: "mode", label: "Effect", type: "select", defaultValue: "grayscale", options: [{ value: "grayscale", label: "Grayscale" }, { value: "blur", label: "Blur" }, { value: "sharpen", label: "Sharpen" }, { value: "negate", label: "Negate" }, { value: "normalize", label: "Normalize" }] }] },
  { id: "img-ico", slug: "png-to-ico", name: "PNG to ICO", category: "image", description: "Build a multi-size favicon.ico.", icon: FileDigit, accepted: [".png"], uiType: "file", tags: ["image", "ico", "favicon", "icon"] },

  // ---- PDF ----
  { id: "pdf-word", slug: "pdf-to-word", name: "PDF to Word", category: "pdf", description: "Convert PDF text to editable DOCX.", icon: FileUp, accepted: [".pdf"], uiType: "file", tags: ["pdf", "word", "docx", "convert"], popular: true },
  { id: "pdf-jpg", slug: "pdf-to-jpg", name: "PDF to JPG", category: "pdf", description: "Rasterize the first page to JPG.", icon: FileDown, accepted: [".pdf"], uiType: "file", tags: ["pdf", "jpg", "image"], params: [{ key: "dpi", label: "DPI (72–300)", type: "number", defaultValue: 150 }] },
  { id: "pdf-merge", slug: "merge-pdf", name: "Merge PDF", category: "pdf", description: "Combine multiple PDFs into one.", icon: Files, accepted: [".pdf"], uiType: "files", tags: ["pdf", "merge", "combine"], popular: true },
  { id: "pdf-split", slug: "split-pdf", name: "Split PDF", category: "pdf", description: "Extract pages, e.g. 1-3,5.", icon: Scissors, accepted: [".pdf"], uiType: "file", tags: ["pdf", "split", "pages"], params: [{ key: "pages", label: "Pages", type: "text", placeholder: "1-3,5" }] },
  { id: "pdf-compress", slug: "compress-pdf", name: "Compress PDF", category: "pdf", description: "Reduce PDF file size.", icon: FileArchive, accepted: [".pdf"], uiType: "file", tags: ["pdf", "compress"] },
  { id: "pdf-rotate", slug: "rotate-pdf", name: "Rotate PDF", category: "pdf", description: "Rotate pages 90 / 180 / 270°.", icon: RotateCw, accepted: [".pdf"], uiType: "file", tags: ["pdf", "rotate"], params: [{ key: "rotation", label: "Rotation", type: "select", defaultValue: "90", options: [{ value: "90", label: "90°" }, { value: "180", label: "180°" }, { value: "270", label: "270°" }] }] },
  { id: "pdf-png", slug: "pdf-to-png", name: "PDF to PNG", category: "pdf", description: "Rasterize the first page to crisp PNG.", icon: FileImage, accepted: [".pdf"], uiType: "file", tags: ["pdf", "png", "image"], params: [{ key: "dpi", label: "DPI (72–300)", type: "number", defaultValue: 150 }] },
  { id: "pdf-ocr", slug: "pdf-ocr", name: "OCR", category: "pdf", description: "Extract text from scans & images.", icon: ScanText, accepted: [".pdf", ".png", ".jpg", ".jpeg", ".webp"], uiType: "file", tags: ["pdf", "ocr", "scan", "text"] },
  { id: "pdf-text", slug: "pdf-text-extraction", name: "PDF Text Extraction", category: "pdf", description: "Pull the text layer into TXT.", icon: FileText, accepted: [".pdf"], uiType: "file", tags: ["pdf", "text", "extract"] },

  // ---- Documents ----
  { id: "doc-docx-pdf", slug: "docx-to-pdf", name: "DOCX to PDF", category: "document", description: "Convert Word docs to PDF.", icon: FileOutput, accepted: [".docx"], uiType: "file", tags: ["docx", "pdf", "word", "convert"], popular: true },
  { id: "doc-pdf-docx", slug: "pdf-to-docx", name: "PDF to DOCX", category: "document", description: "Convert PDF to Word format.", icon: FileInput, accepted: [".pdf"], uiType: "file", tags: ["pdf", "docx", "word"] },
  { id: "doc-txt-pdf", slug: "txt-to-pdf", name: "TXT to PDF", category: "document", description: "Turn plain text into PDF.", icon: FilePlus2, accepted: [".txt"], uiType: "file", tags: ["txt", "pdf", "text"] },
  { id: "doc-csv-xlsx", slug: "csv-to-xlsx", name: "CSV to XLSX", category: "document", description: "Convert CSV to Excel workbook.", icon: Table, accepted: [".csv"], uiType: "file", tags: ["csv", "xlsx", "excel"] },
  { id: "doc-xlsx-csv", slug: "xlsx-to-csv", name: "XLSX to CSV", category: "document", description: "Export Excel sheets to CSV.", icon: Sheet, accepted: [".xlsx", ".xls"], uiType: "file", tags: ["xlsx", "csv", "excel"] },
  { id: "doc-docx-txt", slug: "docx-to-txt", name: "DOCX to TXT", category: "document", description: "Extract plain text from Word docs.", icon: FileText, accepted: [".docx"], uiType: "file", tags: ["docx", "txt", "word", "text"] },
  { id: "doc-md-pdf", slug: "markdown-to-pdf", name: "Markdown to PDF", category: "document", description: "Render Markdown files to styled PDF.", icon: FilePlus2, accepted: [".md", ".markdown", ".txt"], uiType: "file", tags: ["markdown", "md", "pdf"] },

  // ---- Media ----
  { id: "med-mp4-mp3", slug: "mp4-to-mp3", name: "MP4 to MP3", category: "media", description: "Extract audio from video.", icon: Music, accepted: [".mp4", ".mov", ".webm", ".mkv", ".avi"], uiType: "file", tags: ["video", "audio", "mp3", "convert"], popular: true, params: [{ key: "bitrate", label: "Bitrate", type: "select", defaultValue: "192k", options: [{ value: "128k", label: "128k" }, { value: "192k", label: "192k" }, { value: "320k", label: "320k" }] }] },
  { id: "med-vcompress", slug: "video-compressor", name: "Video Compressor", category: "media", description: "Compress video with H.264.", icon: Video, accepted: [".mp4", ".mov", ".webm", ".mkv"], uiType: "file", tags: ["video", "compress"], params: [{ key: "crf", label: "Quality CRF (18–35)", type: "number", defaultValue: 26, hint: "Lower = better quality" }] },
  { id: "med-vconvert", slug: "video-converter", name: "Video Converter", category: "media", description: "Convert between MP4 / WebM / MOV.", icon: Clapperboard, accepted: [".mp4", ".mov", ".webm", ".mkv"], uiType: "file", tags: ["video", "convert"], params: [{ key: "format", label: "Format", type: "select", defaultValue: "mp4", options: [{ value: "mp4", label: "MP4" }, { value: "webm", label: "WebM" }, { value: "mov", label: "MOV" }] }] },
  { id: "med-aconvert", slug: "audio-converter", name: "Audio Converter", category: "media", description: "Convert MP3 / WAV / OGG / M4A / FLAC.", icon: AudioLines, accepted: [".mp3", ".wav", ".ogg", ".m4a", ".flac"], uiType: "file", tags: ["audio", "convert"], params: [{ key: "format", label: "Format", type: "select", defaultValue: "mp3", options: [{ value: "mp3", label: "MP3" }, { value: "wav", label: "WAV" }, { value: "ogg", label: "OGG" }, { value: "m4a", label: "M4A" }, { value: "flac", label: "FLAC" }] }] },
  { id: "med-gif", slug: "video-to-gif", name: "GIF Maker", category: "media", description: "High-quality GIFs via two-pass palette.", icon: Film, accepted: [".mp4", ".mov", ".webm", ".mkv"], uiType: "file", tags: ["video", "gif", "clip"], popular: true, params: [{ key: "width", label: "Width (120–480)", type: "number", defaultValue: 320 }, { key: "fps", label: "FPS (5–20)", type: "number", defaultValue: 12 }, { key: "seconds", label: "Seconds (1–10)", type: "number", defaultValue: 3 }] },

  // ---- Developer ----
  { id: "dev-json-fmt", slug: "json-formatter", name: "JSON Formatter", category: "developer", description: "Pretty-print JSON.", icon: Braces, accepted: ["text"], uiType: "text", tags: ["json", "format", "developer"], popular: true, params: [{ key: "text", label: "JSON", type: "textarea", placeholder: '{"hello":"world"}' }, { key: "indent", label: "Indent", type: "number", defaultValue: 2 }] },
  { id: "dev-json-val", slug: "json-validator", name: "JSON Validator", category: "developer", description: "Validate JSON syntax.", icon: ShieldCheck, accepted: ["text"], uiType: "text", tags: ["json", "validate"], params: [{ key: "text", label: "JSON", type: "textarea", placeholder: '{"hello":"world"}' }] },
  { id: "dev-b64", slug: "base64-encoder-decoder", name: "Base64 Encoder", category: "developer", description: "Encode / decode Base64.", icon: Binary, accepted: ["text"], uiType: "text", tags: ["base64", "encode", "decode"], params: [{ key: "text", label: "Input", type: "textarea", placeholder: "Hello world" }, { key: "mode", label: "Mode", type: "select", defaultValue: "encode", options: [{ value: "encode", label: "Encode" }, { value: "decode", label: "Decode" }] }] },
  { id: "dev-url", slug: "url-encoder-decoder", name: "URL Encoder", category: "developer", description: "Encode / decode URLs.", icon: Link2, accepted: ["text"], uiType: "text", tags: ["url", "encode"], params: [{ key: "text", label: "Input", type: "textarea", placeholder: "https://example.com/?q=hello world" }, { key: "mode", label: "Mode", type: "select", defaultValue: "encode", options: [{ value: "encode", label: "Encode" }, { value: "decode", label: "Decode" }] }] },
  { id: "dev-uuid", slug: "uuid-generator", name: "UUID Generator", category: "developer", description: "Generate random UUIDs.", icon: Fingerprint, accepted: ["text"], uiType: "text", tags: ["uuid", "generate", "id"], params: [{ key: "count", label: "Count (1–100)", type: "number", defaultValue: 1 }] },
  { id: "dev-hash", slug: "hash-generator", name: "Hash Generator", category: "developer", description: "MD5 / SHA-1 / SHA-256 / SHA-512.", icon: Hash, accepted: ["text"], uiType: "text", tags: ["hash", "md5", "sha"], params: [{ key: "text", label: "Input", type: "textarea", placeholder: "Hello world" }, { key: "algorithm", label: "Algorithm", type: "select", defaultValue: "sha256", options: [{ value: "md5", label: "MD5" }, { value: "sha1", label: "SHA-1" }, { value: "sha256", label: "SHA-256" }, { value: "sha512", label: "SHA-512" }] }] },
  { id: "dev-yaml", slug: "yaml-converter", name: "YAML Converter", category: "developer", description: "Convert YAML back and forth with JSON.", icon: Braces, accepted: ["text"], uiType: "text", tags: ["yaml", "json", "convert", "config"], params: [{ key: "text", label: "Input", type: "textarea", placeholder: "a: 1" }, { key: "mode", label: "Direction", type: "select", defaultValue: "auto", options: [{ value: "auto", label: "Auto-detect" }, { value: "yaml-to-json", label: "YAML → JSON" }, { value: "json-to-yaml", label: "JSON → YAML" }] }] },
  { id: "dev-jwt", slug: "jwt-decoder", name: "JWT Decoder", category: "developer", description: "Decode header and payload (unverified).", icon: ShieldCheck, accepted: ["text"], uiType: "text", tags: ["jwt", "token", "decode", "auth"], params: [{ key: "text", label: "JWT", type: "textarea", placeholder: "eyJhbGciOi…" }] },

  // ---- Utilities (100% local, no backend) ----
  { id: "util-qr", slug: "qr-generator", name: "QR Generator", category: "utilities", description: "Create QR codes instantly in your browser.", icon: QrCode, accepted: ["text"], uiType: "local", localKind: "qr", tags: ["qr", "code", "generate", "share"], popular: true },
  { id: "util-pass", slug: "password-generator", name: "Password Generator", category: "utilities", description: "Strong random passwords, generated locally.", icon: KeyRound, accepted: ["text"], uiType: "local", localKind: "password", tags: ["password", "security", "generate"] },
  { id: "util-words", slug: "word-counter", name: "Word Counter", category: "utilities", description: "Count words, characters and reading time.", icon: WholeWord, accepted: ["text"], uiType: "local", localKind: "word-counter", tags: ["word", "count", "text"] },
  { id: "util-case", slug: "case-converter", name: "Case Converter", category: "utilities", description: "UPPER, lower, Title and sentence case.", icon: CaseSensitive, accepted: ["text"], uiType: "local", localKind: "case", tags: ["case", "text", "convert"] },
  { id: "util-color", slug: "color-converter", name: "Color Converter", category: "utilities", description: "HEX ↔ RGB ↔ HSL with preview.", icon: Palette, accepted: ["text"], uiType: "local", localKind: "color", tags: ["color", "hex", "rgb"] },
  { id: "util-unit", slug: "unit-converter", name: "Unit Converter", category: "utilities", description: "Length, weight, temperature and more.", icon: Ruler, accepted: ["text"], uiType: "local", localKind: "unit", tags: ["unit", "convert", "measure"] },
  { id: "util-slug", slug: "slug-generator", name: "Slug Generator", category: "utilities", description: "Turn titles into URL-friendly slugs.", icon: Tag, accepted: ["text"], uiType: "local", localKind: "slug", tags: ["slug", "url", "text"] },
  { id: "util-lorem", slug: "lorem-ipsum", name: "Lorem Ipsum", category: "utilities", description: "Placeholder text for mockups.", icon: AlignLeft, accepted: ["text"], uiType: "local", localKind: "lorem", tags: ["lorem", "ipsum", "placeholder", "text"] },
  { id: "util-bmi", slug: "bmi-calculator", name: "BMI Calculator", category: "utilities", description: "Body mass index with category.", icon: Activity, accepted: ["text"], uiType: "local", localKind: "bmi", tags: ["bmi", "health", "calculator"] },
  { id: "util-percent", slug: "percentage-calculator", name: "Percentage Calculator", category: "utilities", description: "Percentages, change and tips.", icon: Percent, accepted: ["text"], uiType: "local", localKind: "percent", tags: ["percent", "calculator", "math"] },
];

export const toolBySlug = (slug: string) => TOOLS.find((t) => t.slug === slug);

export function searchTools(query: string, limit = 12): FrontendTool[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored = TOOLS.map((t) => {
    const hay = `${t.name} ${t.description} ${t.category} ${t.tags.join(" ")}`.toLowerCase();
    let score = -1;
    if (t.slug === q || t.name.toLowerCase() === q) score = 100;
    else if (t.name.toLowerCase().startsWith(q)) score = 80;
    else if (t.name.toLowerCase().includes(q)) score = 60;
    else if (t.tags.some((tag) => tag.startsWith(q))) score = 50;
    else if (hay.includes(q)) score = 30;
    return { t, score };
  }).filter((s) => s.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.t);
}
