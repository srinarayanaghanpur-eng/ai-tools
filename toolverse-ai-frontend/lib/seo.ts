import type { ToolCategorySlug } from "./tools";

export type CategorySeo = {
  title: string;
  description: string;
  intro: string[];
  faqs: Array<{ q: string; a: string }>;
};

export const CATEGORY_SEO: Record<ToolCategorySlug, CategorySeo> = {
  ai: {
    title: "Free AI Tools Online — Writer, Summarizer, Translator",
    description:
      "Free AI tools for writing, summarizing, rewriting, translating and proofreading. No signup needed — paste text and get results.",
    intro: [
      "TOOLVERSE AI bundles everyday AI writing tools in one place: generate drafts, condense long articles into summaries, rewrite text in a new tone, translate between languages, and fix grammar.",
      "Everything runs through our backend API on professional AI models. Your text is processed securely and never used for advertising.",
    ],
    faqs: [
      { q: "Are the AI tools free?", a: "Yes. All AI tools are free to use within fair rate limits. No account is required for basic use." },
      { q: "Is my text kept private?", a: "Your text is sent to our backend only to generate the result and is subject to automatic deletion along with job records." },
      { q: "Which AI models are used?", a: "The backend can use OpenAI, Anthropic or Google models and the provider can be switched without changing the tools." },
    ],
  },
  image: {
    title: "Free Image Tools — Compress, Convert, Resize, Remove Background",
    description:
      "Free online image tools: compress JPG/PNG, convert between formats, resize, remove backgrounds and build favicons. Fast and private.",
    intro: [
      "Resize photos for the web, compress images without visible quality loss, convert between JPG, PNG and WEBP, remove backgrounds with AI, or generate a favicon.ico for your site.",
      "Images are processed on our servers with professional libraries and served back through expiring download links.",
    ],
    faqs: [
      { q: "Will compression ruin my image quality?", a: "The compressor uses quality-controlled encoding (default 75). For photos the difference is usually invisible while files shrink dramatically." },
      { q: "What is the maximum image size?", a: "Up to 50 MB per file for most image tools (25 MB for background removal)." },
      { q: "Are my photos kept?", a: "No. Uploaded images and results are automatically deleted after the retention period." },
    ],
  },
  pdf: {
    title: "Free PDF Tools — Merge, Split, Compress, Convert, OCR",
    description:
      "Free PDF tools: merge and split PDFs, compress, rotate, convert PDF to Word/JPG/PNG, extract text and run OCR. No signup.",
    intro: [
      "Work with PDFs without installing anything: combine multiple PDFs, extract page ranges like 1-3,5, shrink file sizes, rotate pages, convert PDFs to editable Word documents or images, and pull out text with OCR.",
      "Processing happens server-side with real PDF libraries — results are never faked and failures are reported honestly.",
    ],
    faqs: [
      { q: "How do I merge PDFs?", a: "Open the Merge PDF tool, upload two or more PDF files, and download the single combined document." },
      { q: "Can I convert a scanned PDF to text?", a: "Yes — the OCR tool reads scanned pages and images using on-device-quality text recognition and returns editable text." },
      { q: "Is there a file size limit?", a: "PDF tools accept files up to 50 MB each (25 MB for OCR)." },
    ],
  },
  document: {
    title: "Free Document Converters — DOCX, PDF, TXT, CSV, Excel",
    description:
      "Convert Word to PDF, PDF to Word, TXT to PDF, CSV to Excel and back. Free online document conversion that preserves your text.",
    intro: [
      "Switch between office formats in seconds: DOCX to PDF for sharing, PDF back to editable DOCX or plain text, Markdown to styled PDF, and CSV to Excel workbooks and back.",
      "Conversions preserve your text content. For pixel-perfect Word layouts the backend can use LibreOffice when configured.",
    ],
    faqs: [
      { q: "Will my Word formatting survive conversion?", a: "Text content is always preserved. Complex layouts convert best when the backend has LibreOffice configured; otherwise a clean text-preserving conversion is used." },
      { q: "Can I convert Excel to CSV?", a: "Yes — upload .xlsx or .xls and download the first sheet as CSV, or go the other direction just as easily." },
    ],
  },
  media: {
    title: "Free Video & Audio Tools — Convert, Compress, MP4 to MP3, GIF",
    description:
      "Convert video and audio online: MP4 to MP3, compress video, change formats, and make GIFs. Free with professional ffmpeg processing.",
    intro: [
      "Extract MP3 audio from video, compress large videos with H.264, convert between MP4, WebM, MOV and popular audio formats, or turn a clip into a high-quality GIF with two-pass palette encoding.",
      "Media jobs run on real ffmpeg encoders in the background — you get a job ID instantly and can download when it completes.",
    ],
    faqs: [
      { q: "How long does video conversion take?", a: "It depends on length and size. The job runs in the background and the page polls its status — feel free to wait or come back." },
      { q: "What video sizes are accepted?", a: "Up to 500 MB per file for video tools (200 MB for audio)." },
      { q: "How do I make a GIF?", a: "Open the GIF Maker, upload a short clip, pick width, frame rate and seconds, and download a shareable GIF." },
    ],
  },
  developer: {
    title: "Free Developer Tools — JSON, Base64, UUID, Hash, JWT, YAML",
    description:
      "Formatter, validators and encoders for developers: JSON, YAML, Base64, URL, UUID, hashes and JWT decoding. Instant and free.",
    intro: [
      "Everyday developer utilities: pretty-print and validate JSON, convert YAML both ways, encode Base64 and URLs, generate UUIDs and hashes, and decode JWT headers and payloads.",
      "These run as backend jobs with the same reliability guarantees as file conversions — invalid input returns clear validation errors, never fake output.",
    ],
    faqs: [
      { q: "Is the JWT decoder safe for real tokens?", a: "It only decodes the header and payload structure and clearly labels output UNVERIFIED — signatures are never treated as valid. Avoid pasting production secrets anywhere." },
      { q: "Which hash algorithms are supported?", a: "MD5, SHA-1, SHA-256 and SHA-512." },
    ],
  },
  utilities: {
    title: "Free Online Utilities — QR, Passwords, Word Count, Converters",
    description:
      "Handy free utilities that run entirely in your browser: QR generator, password generator, word counter, case/color/unit converters and more.",
    intro: [
      "Quick everyday helpers with zero uploads: generate QR codes and strong passwords, count words, convert case, colors and units, compute BMI and percentages.",
      "Utility tools run 100% locally in your browser — your input never leaves your device.",
    ],
    faqs: [
      { q: "Do utility tools upload my data?", a: "No. Utilities are computed locally in your browser; nothing is sent to any server." },
      { q: "Are generated passwords secure?", a: "Yes — they use your browser's cryptographically secure random generator." },
    ],
  },
};
