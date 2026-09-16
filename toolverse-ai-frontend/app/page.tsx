import type { Metadata } from "next";
import { HomeClient } from "@/components/HomeClient";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const metadata: Metadata = {
  title: "TOOLVERSE AI — Every Tool. One Place. Free AI, PDF, Image & Converter Tools",
  description:
    "50+ free online tools: AI writer, summarizer & translator, PDF merge/split/compress/convert, image compressor & background remover, video converter, JSON formatter, QR generator and more. No signup needed.",
  keywords: [
    "free online tools",
    "AI tools",
    "PDF tools",
    "merge PDF",
    "compress PDF",
    "PDF to Word",
    "image compressor",
    "background remover",
    "JPG to PNG",
    "MP4 to MP3",
    "JSON formatter",
    "QR generator",
    "unit converter",
  ],
  alternates: { canonical: `${SITE}/` },
  openGraph: {
    title: "TOOLVERSE AI — Every Tool. One Place.",
    description:
      "50+ free tools: AI writing, PDF utilities, image & video converters, developer tools. Fast, private, no signup.",
    url: `${SITE}/`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TOOLVERSE AI — Every Tool. One Place.",
    description: "50+ free AI, PDF, image, video and developer tools. No signup needed.",
  },
};

export default function HomePage() {
  return <HomeClient />;
}
