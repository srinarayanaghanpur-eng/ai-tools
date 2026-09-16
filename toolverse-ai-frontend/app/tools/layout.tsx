import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "All Tools",
  description: "Browse all 40+ TOOLVERSE AI tools — AI, image, PDF, documents, media, developer and utilities.",
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
