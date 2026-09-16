import type { ToolDefinition } from './types.js';
import {
  imageCompress, imageResize, jpgToPng, pngToJpg, webpToJpg, backgroundRemove,
  imageConvert, imageEffects, pngToIco,
} from './processors/image/imageTools.js';
import {
  pdfMerge, pdfSplit, pdfCompress, pdfRotate, pdfToWord, pdfToJpg, pdfToPng, pdfOcr, pdfTextExtract,
} from './processors/pdf/pdfTools.js';
import { docxToPdf, pdfToDocx, txtToPdf, csvToXlsx, xlsxToCsv, docxToTxt, mdToPdf } from './processors/document/documentTools.js';
import { mp4ToMp3, videoCompress, audioConvert, videoConvert, videoToGif } from './processors/media/mediaTools.js';
import {
  jsonFormat, jsonValidate, base64Codec, urlCodec, uuidGenerate, hashGenerate,
  yamlConvert, jwtDecode,
} from './processors/developer/developerTools.js';
import { aiSummarize, aiRewrite, aiTranslate, aiGenerate, aiPdfSummarize, aiGrammar } from './processors/ai/aiTools.js';

const MB = (n: number) => n;

function def(t: ToolDefinition): ToolDefinition {
  return t;
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  // ---- Image ----
  def({ id: 'img-bg-remove', slug: 'background-remover', name: 'Background Remover', category: 'image', description: 'Remove image background (AI, ONNX local)', inputType: 'file', acceptedFormats: ['.png', '.jpg', '.jpeg', '.webp'], outputFormat: '.png', limits: { maxFiles: 1, maxFileMb: MB(25), timeoutSeconds: 180 }, status: 'active', processor: backgroundRemove }),
  def({ id: 'img-compress', slug: 'image-compressor', name: 'Image Compressor', category: 'image', description: 'Compress images with quality control', inputType: 'file', acceptedFormats: ['.jpg', '.jpeg', '.png', '.webp'], outputFormat: 'image', limits: { maxFiles: 1, maxFileMb: MB(50), timeoutSeconds: 60 }, status: 'active', processor: imageCompress, paramsSchema: { quality: '1-100' } }),
  def({ id: 'img-resize', slug: 'image-resizer', name: 'Image Resizer', category: 'image', description: 'Resize by width/height', inputType: 'file', acceptedFormats: ['.jpg', '.jpeg', '.png', '.webp'], outputFormat: 'image', limits: { maxFiles: 1, maxFileMb: MB(50), timeoutSeconds: 60 }, status: 'active', processor: imageResize, paramsSchema: { width: 'px', height: 'px', fit: 'inside|cover|contain' } }),
  def({ id: 'img-jpg-png', slug: 'jpg-to-png', name: 'JPG to PNG', category: 'image', description: 'Convert JPG to PNG', inputType: 'file', acceptedFormats: ['.jpg', '.jpeg'], outputFormat: '.png', limits: { maxFiles: 1, maxFileMb: MB(50), timeoutSeconds: 60 }, status: 'active', processor: jpgToPng }),
  def({ id: 'img-png-jpg', slug: 'png-to-jpg', name: 'PNG to JPG', category: 'image', description: 'Convert PNG to JPG', inputType: 'file', acceptedFormats: ['.png'], outputFormat: '.jpg', limits: { maxFiles: 1, maxFileMb: MB(50), timeoutSeconds: 60 }, status: 'active', processor: pngToJpg }),
  def({ id: 'img-webp-jpg', slug: 'webp-to-jpg', name: 'WEBP to JPG', category: 'image', description: 'Convert WEBP to JPG', inputType: 'file', acceptedFormats: ['.webp'], outputFormat: '.jpg', limits: { maxFiles: 1, maxFileMb: MB(50), timeoutSeconds: 60 }, status: 'active', processor: webpToJpg }),
  def({ id: 'img-convert', slug: 'image-converter', name: 'Image Converter', category: 'image', description: 'Convert between JPG / PNG / WEBP', inputType: 'file', acceptedFormats: ['.jpg', '.jpeg', '.png', '.webp'], outputFormat: 'image', limits: { maxFiles: 1, maxFileMb: MB(50), timeoutSeconds: 60 }, status: 'active', processor: imageConvert, paramsSchema: { format: 'jpeg|png|webp', quality: '1-100' } }),
  def({ id: 'img-effects', slug: 'image-effects', name: 'Image Effects', category: 'image', description: 'Grayscale, blur, sharpen, negate, normalize', inputType: 'file', acceptedFormats: ['.jpg', '.jpeg', '.png', '.webp'], outputFormat: 'image', limits: { maxFiles: 1, maxFileMb: MB(50), timeoutSeconds: 60 }, status: 'active', processor: imageEffects, paramsSchema: { mode: 'grayscale|blur|sharpen|negate|normalize' } }),
  def({ id: 'img-ico', slug: 'png-to-ico', name: 'PNG to ICO', category: 'image', description: 'Build multi-size favicon.ico (16/32/48)', inputType: 'file', acceptedFormats: ['.png'], outputFormat: '.ico', limits: { maxFiles: 1, maxFileMb: MB(20), timeoutSeconds: 60 }, status: 'active', processor: pngToIco }),

  // ---- PDF ----
  def({ id: 'pdf-word', slug: 'pdf-to-word', name: 'PDF to Word', category: 'pdf', description: 'Convert PDF text to DOCX (text-preserving)', inputType: 'file', acceptedFormats: ['.pdf'], outputFormat: '.docx', limits: { maxFiles: 1, maxFileMb: MB(50), timeoutSeconds: 120 }, status: 'active', processor: pdfToWord }),
  def({ id: 'pdf-jpg', slug: 'pdf-to-jpg', name: 'PDF to JPG', category: 'pdf', description: 'Rasterize first page to JPG (requires Poppler)', inputType: 'file', acceptedFormats: ['.pdf'], outputFormat: '.jpg', limits: { maxFiles: 1, maxFileMb: MB(50), timeoutSeconds: 120 }, status: 'active', processor: pdfToJpg, paramsSchema: { dpi: '72-300' } }),
  def({ id: 'pdf-png', slug: 'pdf-to-png', name: 'PDF to PNG', category: 'pdf', description: 'Rasterize first page to PNG (crisp text)', inputType: 'file', acceptedFormats: ['.pdf'], outputFormat: '.png', limits: { maxFiles: 1, maxFileMb: MB(50), timeoutSeconds: 120 }, status: 'active', processor: pdfToPng, paramsSchema: { dpi: '72-300' } }),
  def({ id: 'pdf-merge', slug: 'merge-pdf', name: 'Merge PDF', category: 'pdf', description: 'Merge multiple PDFs', inputType: 'files', acceptedFormats: ['.pdf'], outputFormat: '.pdf', limits: { maxFiles: 10, maxFileMb: MB(50), timeoutSeconds: 120 }, status: 'active', processor: pdfMerge }),
  def({ id: 'pdf-split', slug: 'split-pdf', name: 'Split PDF', category: 'pdf', description: 'Extract pages (e.g. 1-3,5)', inputType: 'file', acceptedFormats: ['.pdf'], outputFormat: '.pdf', limits: { maxFiles: 1, maxFileMb: MB(50), timeoutSeconds: 120 }, status: 'active', processor: pdfSplit, paramsSchema: { pages: '"1-3,5"' } }),
  def({ id: 'pdf-compress', slug: 'compress-pdf', name: 'Compress PDF', category: 'pdf', description: 'Re-serialize and optimize PDF', inputType: 'file', acceptedFormats: ['.pdf'], outputFormat: '.pdf', limits: { maxFiles: 1, maxFileMb: MB(50), timeoutSeconds: 120 }, status: 'active', processor: pdfCompress }),
  def({ id: 'pdf-rotate', slug: 'rotate-pdf', name: 'Rotate PDF', category: 'pdf', description: 'Rotate pages by 90/180/270', inputType: 'file', acceptedFormats: ['.pdf'], outputFormat: '.pdf', limits: { maxFiles: 1, maxFileMb: MB(50), timeoutSeconds: 60 }, status: 'active', processor: pdfRotate, paramsSchema: { rotation: '90|180|270', pages: 'optional' } }),
  def({ id: 'pdf-ocr', slug: 'pdf-ocr', name: 'PDF OCR', category: 'pdf', description: 'OCR images / extract PDF text (tesseract.js)', inputType: 'file', acceptedFormats: ['.pdf', '.png', '.jpg', '.jpeg', '.webp'], outputFormat: '.txt', limits: { maxFiles: 1, maxFileMb: MB(25), timeoutSeconds: 300 }, status: 'active', processor: pdfOcr, paramsSchema: { lang: 'eng (tesseract lang)' } }),
  def({ id: 'pdf-text', slug: 'pdf-text-extraction', name: 'PDF Text Extraction', category: 'pdf', description: 'Extract text layer to TXT', inputType: 'file', acceptedFormats: ['.pdf'], outputFormat: '.txt', limits: { maxFiles: 1, maxFileMb: MB(50), timeoutSeconds: 60 }, status: 'active', processor: pdfTextExtract }),

  // ---- Documents ----
  def({ id: 'doc-docx-pdf', slug: 'docx-to-pdf', name: 'DOCX to PDF', category: 'document', description: 'Convert DOCX to PDF (LibreOffice if configured, else text-preserving)', inputType: 'file', acceptedFormats: ['.docx'], outputFormat: '.pdf', limits: { maxFiles: 1, maxFileMb: MB(50), timeoutSeconds: 120 }, status: 'active', processor: docxToPdf }),
  def({ id: 'doc-pdf-docx', slug: 'pdf-to-docx', name: 'PDF to DOCX', category: 'document', description: 'Convert PDF to DOCX (text-preserving)', inputType: 'file', acceptedFormats: ['.pdf'], outputFormat: '.docx', limits: { maxFiles: 1, maxFileMb: MB(50), timeoutSeconds: 120 }, status: 'active', processor: pdfToDocx }),
  def({ id: 'doc-txt-pdf', slug: 'txt-to-pdf', name: 'TXT to PDF', category: 'document', description: 'Convert plain text to PDF', inputType: 'file', acceptedFormats: ['.txt'], outputFormat: '.pdf', limits: { maxFiles: 1, maxFileMb: MB(20), timeoutSeconds: 60 }, status: 'active', processor: txtToPdf }),
  def({ id: 'doc-csv-xlsx', slug: 'csv-to-xlsx', name: 'CSV to XLSX', category: 'document', description: 'Convert CSV to Excel workbook', inputType: 'file', acceptedFormats: ['.csv'], outputFormat: '.xlsx', limits: { maxFiles: 1, maxFileMb: MB(30), timeoutSeconds: 60 }, status: 'active', processor: csvToXlsx }),
  def({ id: 'doc-xlsx-csv', slug: 'xlsx-to-csv', name: 'XLSX to CSV', category: 'document', description: 'Convert Excel sheet to CSV', inputType: 'file', acceptedFormats: ['.xlsx', '.xls'], outputFormat: '.csv', limits: { maxFiles: 1, maxFileMb: MB(30), timeoutSeconds: 60 }, status: 'active', processor: xlsxToCsv }),
  def({ id: 'doc-docx-txt', slug: 'docx-to-txt', name: 'DOCX to TXT', category: 'document', description: 'Extract plain text from Word docs', inputType: 'file', acceptedFormats: ['.docx'], outputFormat: '.txt', limits: { maxFiles: 1, maxFileMb: MB(30), timeoutSeconds: 60 }, status: 'active', processor: docxToTxt }),
  def({ id: 'doc-md-pdf', slug: 'markdown-to-pdf', name: 'Markdown to PDF', category: 'document', description: 'Render Markdown files to styled PDF', inputType: 'file', acceptedFormats: ['.md', '.markdown', '.txt'], outputFormat: '.pdf', limits: { maxFiles: 1, maxFileMb: MB(10), timeoutSeconds: 60 }, status: 'active', processor: mdToPdf }),

  // ---- Media ----
  def({ id: 'med-mp4-mp3', slug: 'mp4-to-mp3', name: 'MP4 to MP3', category: 'media', description: 'Extract audio from video (ffmpeg)', inputType: 'file', acceptedFormats: ['.mp4', '.mov', '.webm', '.mkv', '.avi'], outputFormat: '.mp3', limits: { maxFiles: 1, maxFileMb: MB(500), timeoutSeconds: 600 }, status: 'active', processor: mp4ToMp3 }),
  def({ id: 'med-vcompress', slug: 'video-compressor', name: 'Video Compressor', category: 'media', description: 'Compress with H.264 CRF', inputType: 'file', acceptedFormats: ['.mp4', '.mov', '.webm', '.mkv'], outputFormat: '.mp4', limits: { maxFiles: 1, maxFileMb: MB(500), timeoutSeconds: 900 }, status: 'active', processor: videoCompress, paramsSchema: { crf: '18-35' } }),
  def({ id: 'med-aconvert', slug: 'audio-converter', name: 'Audio Converter', category: 'media', description: 'Convert between mp3/wav/ogg/m4a/flac', inputType: 'file', acceptedFormats: ['.mp3', '.wav', '.ogg', '.m4a', '.flac'], outputFormat: 'audio', limits: { maxFiles: 1, maxFileMb: MB(200), timeoutSeconds: 600 }, status: 'active', processor: audioConvert, paramsSchema: { format: 'mp3|wav|ogg|m4a|flac' } }),
  def({ id: 'med-vconvert', slug: 'video-converter', name: 'Video Converter', category: 'media', description: 'Convert between mp4/webm/mov', inputType: 'file', acceptedFormats: ['.mp4', '.mov', '.webm', '.mkv'], outputFormat: 'video', limits: { maxFiles: 1, maxFileMb: MB(500), timeoutSeconds: 900 }, status: 'active', processor: videoConvert, paramsSchema: { format: 'mp4|webm|mov' } }),
  def({ id: 'med-gif', slug: 'video-to-gif', name: 'Video to GIF', category: 'media', description: 'High-quality GIF via two-pass palette (ffmpeg)', inputType: 'file', acceptedFormats: ['.mp4', '.mov', '.webm', '.mkv'], outputFormat: '.gif', limits: { maxFiles: 1, maxFileMb: MB(300), timeoutSeconds: 600 }, status: 'active', processor: videoToGif, paramsSchema: { width: '120-480', fps: '5-20', seconds: '1-10' } }),

  // ---- Developer (text/json, no files) ----
  def({ id: 'dev-json-fmt', slug: 'json-formatter', name: 'JSON Formatter', category: 'developer', description: 'Pretty-print JSON', inputType: 'text', acceptedFormats: ['text'], outputFormat: '.json', limits: { maxFiles: 0, maxFileMb: MB(5), timeoutSeconds: 10 }, status: 'active', processor: jsonFormat }),
  def({ id: 'dev-json-val', slug: 'json-validator', name: 'JSON Validator', category: 'developer', description: 'Validate JSON syntax', inputType: 'text', acceptedFormats: ['text'], outputFormat: '.json', limits: { maxFiles: 0, maxFileMb: MB(5), timeoutSeconds: 10 }, status: 'active', processor: jsonValidate }),
  def({ id: 'dev-b64', slug: 'base64-encoder-decoder', name: 'Base64 Encoder/Decoder', category: 'developer', description: 'Encode/decode base64', inputType: 'text', acceptedFormats: ['text'], outputFormat: '.txt', limits: { maxFiles: 0, maxFileMb: MB(5), timeoutSeconds: 10 }, status: 'active', processor: base64Codec, paramsSchema: { mode: 'encode|decode' } }),
  def({ id: 'dev-url', slug: 'url-encoder-decoder', name: 'URL Encoder/Decoder', category: 'developer', description: 'Encode/decode URLs', inputType: 'text', acceptedFormats: ['text'], outputFormat: '.txt', limits: { maxFiles: 0, maxFileMb: MB(5), timeoutSeconds: 10 }, status: 'active', processor: urlCodec, paramsSchema: { mode: 'encode|decode' } }),
  def({ id: 'dev-uuid', slug: 'uuid-generator', name: 'UUID Generator', category: 'developer', description: 'Generate UUIDs', inputType: 'text', acceptedFormats: ['text'], outputFormat: '.txt', limits: { maxFiles: 0, maxFileMb: MB(1), timeoutSeconds: 10 }, status: 'active', processor: uuidGenerate, paramsSchema: { count: '1-100' } }),
  def({ id: 'dev-hash', slug: 'hash-generator', name: 'Hash Generator', category: 'developer', description: 'md5/sha1/sha256/sha512', inputType: 'text', acceptedFormats: ['text'], outputFormat: '.json', limits: { maxFiles: 0, maxFileMb: MB(5), timeoutSeconds: 10 }, status: 'active', processor: hashGenerate, paramsSchema: { algorithm: 'md5|sha1|sha256|sha512' } }),
  def({ id: 'dev-yaml', slug: 'yaml-converter', name: 'YAML Converter', category: 'developer', description: 'Convert YAML <-> JSON', inputType: 'text', acceptedFormats: ['text'], outputFormat: 'text', limits: { maxFiles: 0, maxFileMb: MB(5), timeoutSeconds: 10 }, status: 'active', processor: yamlConvert, paramsSchema: { mode: 'auto|yaml-to-json|json-to-yaml' } }),
  def({ id: 'dev-jwt', slug: 'jwt-decoder', name: 'JWT Decoder', category: 'developer', description: 'Decode header/payload (unverified)', inputType: 'text', acceptedFormats: ['text'], outputFormat: '.json', limits: { maxFiles: 0, maxFileMb: MB(1), timeoutSeconds: 10 }, status: 'active', processor: jwtDecode }),

  // ---- AI ----
  def({ id: 'ai-sum', slug: 'summarizer', name: 'Summarizer', category: 'ai', description: 'Summarize text with AI', inputType: 'text', acceptedFormats: ['text'], outputFormat: '.md', limits: { maxFiles: 0, maxFileMb: MB(2), timeoutSeconds: 180, requiresAuth: false }, status: 'active', processor: aiSummarize }),
  def({ id: 'ai-rewrite', slug: 'rewriter', name: 'Rewriter', category: 'ai', description: 'Rewrite text with AI', inputType: 'text', acceptedFormats: ['text'], outputFormat: '.md', limits: { maxFiles: 0, maxFileMb: MB(2), timeoutSeconds: 180 }, status: 'active', processor: aiRewrite }),
  def({ id: 'ai-translate', slug: 'translator', name: 'Translator', category: 'ai', description: 'Translate text with AI', inputType: 'text', acceptedFormats: ['text'], outputFormat: '.md', limits: { maxFiles: 0, maxFileMb: MB(2), timeoutSeconds: 180 }, status: 'active', processor: aiTranslate }),
  def({ id: 'ai-generate', slug: 'text-generator', name: 'Text Generator', category: 'ai', description: 'Generate text with AI', inputType: 'text', acceptedFormats: ['text'], outputFormat: '.md', limits: { maxFiles: 0, maxFileMb: MB(2), timeoutSeconds: 180 }, status: 'active', processor: aiGenerate }),
  def({ id: 'ai-pdf-sum', slug: 'pdf-summarizer', name: 'PDF Summarizer', category: 'ai', description: 'Extract + summarize PDF with AI', inputType: 'file', acceptedFormats: ['.pdf'], outputFormat: '.md', limits: { maxFiles: 1, maxFileMb: MB(30), timeoutSeconds: 300 }, status: 'active', processor: aiPdfSummarize }),
  def({ id: 'ai-grammar', slug: 'grammar-checker', name: 'Grammar Checker', category: 'ai', description: 'Fix grammar, spelling and punctuation with AI', inputType: 'text', acceptedFormats: ['text'], outputFormat: '.md', limits: { maxFiles: 0, maxFileMb: MB(2), timeoutSeconds: 180 }, status: 'active', processor: aiGrammar }),
];

const bySlug = new Map<string, ToolDefinition>();
const byId = new Map<string, ToolDefinition>();
for (const t of TOOL_DEFINITIONS) {
  bySlug.set(t.slug, t);
  byId.set(t.id, t);
}

export function getToolBySlug(slug: string): ToolDefinition | undefined {
  return bySlug.get(slug);
}

export function getToolById(id: string): ToolDefinition | undefined {
  // id may be slug or id — support both for API ergonomics
  return byId.get(id) ?? bySlug.get(id);
}

export function listTools(): ToolDefinition[] {
  return TOOL_DEFINITIONS;
}

/** Public JSON (no processor fn) for API responses. */
export function toPublicTool(t: ToolDefinition) {
  const { processor: _p, ...rest } = t;
  return rest;
}
