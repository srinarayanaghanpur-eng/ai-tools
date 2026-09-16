"use client";

import { useMemo } from "react";
import { TOOLS } from "@/lib/tools";
import { ToolGrid } from "./ToolCard";

export function RelatedTools({ slugs }: { slugs: string[] }) {
  const tools = useMemo(
    () => slugs.map((s) => TOOLS.find((t) => t.slug === s)).filter(Boolean) as typeof TOOLS,
    [slugs]
  );
  return <ToolGrid tools={tools} />;
}
