import type { Metadata } from "next";
import { ToolsDirectory } from "@/components/ToolsDirectory";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const metadata: Metadata = {
  title: "All Tools — 50+ Free AI, PDF, Image, Video & Developer Tools",
  description:
    "Browse every TOOLVERSE AI tool: AI writer and translator, PDF merge/split/compress, image converter and background remover, video converter, JSON formatter, QR generator and more.",
  alternates: { canonical: `${SITE}/tools` },
  openGraph: {
    title: "All Tools · TOOLVERSE AI",
    description: "50+ free tools across AI, image, PDF, documents, media, developer and utilities.",
    url: `${SITE}/tools`,
    type: "website",
  },
};

export default function ToolsPage() {
  return <ToolsDirectory />;
}
