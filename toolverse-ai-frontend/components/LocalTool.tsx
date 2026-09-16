"use client";

import { useMemo, useState } from "react";
import QRCode from "qrcode";
import { Copy, Download, RefreshCw } from "lucide-react";
import type { FrontendTool } from "@/lib/tools";
import { useToast } from "./providers";

export function LocalTool({ tool }: { tool: FrontendTool }) {
  switch (tool.localKind) {
    case "qr":
      return <QrTool />;
    case "password":
      return <PasswordTool />;
    case "word-counter":
      return <WordCounter />;
    case "case":
      return <CaseTool />;
    case "color":
      return <ColorTool />;
    case "unit":
      return <UnitTool />;
    case "slug":
      return <SlugTool />;
    case "lorem":
      return <LoremTool />;
    case "bmi":
      return <BmiTool />;
    case "percent":
      return <PercentTool />;
    default:
      return <p className="text-muted text-sm">This utility runs entirely in your browser.</p>;
  }
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="surface rounded-2xl p-5">{children}</div>;
}

function useCopy() {
  const { push } = useToast();
  return async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      push({ title: "Copied to clipboard", kind: "success" });
    } catch {
      push({ title: "Copy failed", kind: "error" });
    }
  };
}

function QrTool() {
  const [text, setText] = useState("https://toolverse.ai");
  const [url, setUrl] = useState<string>("");
  const copy = useCopy();
  const make = async () => {
    if (!text.trim()) return;
    const dataUrl = await QRCode.toDataURL(text.trim(), { width: 512, margin: 2 });
    setUrl(dataUrl);
  };
  return (
    <Panel>
      <label className="block text-xs font-semibold">Text or URL</label>
      <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="https://example.com"
          className="surface-soft flex-1 rounded-lg px-3 py-2.5 text-sm outline-none"
        />
        <button onClick={make} className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
          Generate
        </button>
      </div>
      {url && (
        <div className="mt-4 flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={`QR code for ${text}`} width={220} height={220} className="rounded-xl border" style={{ borderColor: "rgb(var(--border))" }} />
          <div className="flex gap-2">
            <a href={url} download="qr.png" className="surface-soft inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium">
              <Download className="h-4 w-4" aria-hidden /> Download PNG
            </a>
            <button onClick={() => copy(text)} className="surface-soft inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium">
              <Copy className="h-4 w-4" aria-hidden /> Copy text
            </button>
          </div>
          <p className="text-muted text-xs">Generated locally — nothing is uploaded.</p>
        </div>
      )}
    </Panel>
  );
}

function PasswordTool() {
  const [len, setLen] = useState(20);
  const [symbols, setSymbols] = useState(true);
  const [out, setOut] = useState("");
  const copy = useCopy();
  const gen = () => {
    const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    const sym = "!@#$%^&*-_+=?";
    const pool = alpha + (symbols ? sym : "");
    const buf = new Uint32Array(len);
    crypto.getRandomValues(buf);
    setOut(Array.from(buf).map((n) => pool[n % pool.length]).join(""));
  };
  return (
    <Panel>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-xs font-semibold">
          Length
          <input type="number" min={8} max={64} value={len} onChange={(e) => setLen(Math.max(8, Math.min(64, Number(e.target.value) || 16)))} className="surface-soft mt-1 block w-28 rounded-lg px-3 py-2 text-sm outline-none" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={symbols} onChange={(e) => setSymbols(e.target.checked)} className="h-4 w-4 accent-indigo-600" /> Symbols
        </label>
        <button onClick={gen} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
          <RefreshCw className="h-4 w-4" aria-hidden /> Generate
        </button>
      </div>
      {out && (
        <div className="surface-soft mt-4 flex items-center gap-2 rounded-xl px-3.5 py-3 font-mono text-sm break-all">
          <span className="flex-1">{out}</span>
          <button onClick={() => copy(out)} aria-label="Copy password" className="surface rounded-lg p-2"><Copy className="h-4 w-4" aria-hidden /></button>
        </div>
      )}
      <p className="text-muted mt-2 text-xs">Generated with cryptographically secure randomness, only in your browser.</p>
    </Panel>
  );
}

function WordCounter() {
  const [text, setText] = useState("");
  const stats = useMemo(() => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const noSpaces = text.replace(/\s/g, "").length;
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim()).length;
    const minutes = Math.max(1, Math.ceil(words / 200));
    return { words, chars, noSpaces, sentences, minutes };
  }, [text]);
  return (
    <Panel>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder="Paste or type text…" aria-label="Text to analyze" className="surface-soft w-full rounded-xl px-3.5 py-3 text-sm outline-none" />
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[["Words", stats.words], ["Characters", stats.chars], ["No spaces", stats.noSpaces], ["Sentences", stats.sentences], ["Read time", `~${stats.minutes} min`]].map(([k, v]) => (
          <div key={k as string} className="surface-soft rounded-xl p-3 text-center">
            <p className="text-lg font-bold">{v}</p>
            <p className="text-muted text-xs">{k}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function CaseTool() {
  const [text, setText] = useState("");
  const copy = useCopy();
  const variants = useMemo(
    () => [
      { label: "UPPERCASE", value: text.toUpperCase() },
      { label: "lowercase", value: text.toLowerCase() },
      { label: "Title Case", value: text.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) },
      { label: "Sentence case", value: text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() },
    ],
    [text]
  );
  return (
    <Panel>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="Type text…" aria-label="Text to convert" className="surface-soft w-full rounded-xl px-3.5 py-3 text-sm outline-none" />
      <div className="mt-3 space-y-2">
        {variants.map((v) => (
          <div key={v.label} className="surface-soft flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm">
            <span className="text-muted w-28 shrink-0 text-xs font-semibold">{v.label}</span>
            <span className="min-w-0 flex-1 truncate">{v.value || "—"}</span>
            <button onClick={() => copy(v.value)} aria-label={`Copy ${v.label}`} className="surface rounded-lg p-1.5"><Copy className="h-4 w-4" aria-hidden /></button>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ColorTool() {
  const [hex, setHex] = useState("#3b63f6");
  const parsed = useMemo(() => {
    const m = hex.trim().match(/^#?([0-9a-f]{6}|[0-9a-f]{3})$/i);
    if (!m) return null;
    let h = m[1];
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    // rgb -> hsl
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
    const l = (max + min) / 2;
    let hh = 0, s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === rn) hh = (gn - bn) / d + (gn < bn ? 6 : 0);
      else if (max === gn) hh = (bn - rn) / d + 2;
      else hh = (rn - gn) / d + 4;
      hh *= 60;
    }
    return { r, g, b, h: Math.round(hh), s: Math.round(s * 100), l: Math.round(l * 100), hex: "#" + h.toLowerCase() };
  }, [hex]);
  const copy = useCopy();
  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-3">
        <input type="color" value={parsed?.hex ?? "#3b63f6"} onChange={(e) => setHex(e.target.value)} aria-label="Pick a color" className="h-11 w-16 cursor-pointer rounded-lg" />
        <input value={hex} onChange={(e) => setHex(e.target.value)} placeholder="#3b63f6" aria-label="HEX value" className="surface-soft w-40 rounded-lg px-3 py-2.5 font-mono text-sm outline-none" />
        {parsed && <span className="h-11 w-24 rounded-lg border" style={{ background: parsed.hex, borderColor: "rgb(var(--border))" }} aria-hidden />}
      </div>
      {parsed ? (
        <div className="mt-3 space-y-2 text-sm">
          {[
            ["HEX", parsed.hex],
            ["RGB", `rgb(${parsed.r}, ${parsed.g}, ${parsed.b})`],
            ["HSL", `hsl(${parsed.h}, ${parsed.s}%, ${parsed.l}%)`],
          ].map(([k, v]) => (
            <div key={k} className="surface-soft flex items-center gap-2 rounded-xl px-3.5 py-2.5">
              <span className="text-muted w-14 text-xs font-semibold">{k}</span>
              <code className="flex-1">{v}</code>
              <button onClick={() => copy(v)} aria-label={`Copy ${k}`} className="surface rounded-lg p-1.5"><Copy className="h-4 w-4" aria-hidden /></button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-amber-600">Enter a valid HEX color, e.g. #3b63f6.</p>
      )}
    </Panel>
  );
}

const UNIT_GROUPS: Record<string, { units: Record<string, number>; base: string }> = {
  Length: { base: "m", units: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.34 } },
  Weight: { base: "kg", units: { g: 0.001, kg: 1, lb: 0.453592, oz: 0.0283495 } },
  Volume: { base: "l", units: { ml: 0.001, l: 1, cup: 0.236588, gal: 3.78541 } },
};

function UnitTool() {
  const [group, setGroup] = useState("Length");
  const [from, setFrom] = useState("m");
  const [to, setTo] = useState("ft");
  const [val, setVal] = useState("1");
  const out = useMemo(() => {
    const g = UNIT_GROUPS[group];
    const n = Number(val);
    if (!g || Number.isNaN(n)) return "—";
    const base = n * (g.units[from] ?? 1);
    const result = base / (g.units[to] ?? 1);
    return Number(result.toPrecision(6)).toString();
  }, [group, from, to, val]);
  const units = Object.keys(UNIT_GROUPS[group].units);
  return (
    <Panel>
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="block text-xs font-semibold">Category
          <select value={group} onChange={(e) => { setGroup(e.target.value); const u = Object.keys(UNIT_GROUPS[e.target.value].units); setFrom(u[0]); setTo(u[1] ?? u[0]); }} className="surface-soft mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none">
            {Object.keys(UNIT_GROUPS).map((g) => <option key={g}>{g}</option>)}
          </select>
        </label>
        <label className="block text-xs font-semibold">Value
          <input value={val} onChange={(e) => setVal(e.target.value)} inputMode="decimal" className="surface-soft mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none" />
        </label>
        <label className="block text-xs font-semibold">From
          <select value={from} onChange={(e) => setFrom(e.target.value)} className="surface-soft mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none">
            {units.map((u) => <option key={u}>{u}</option>)}
          </select>
        </label>
        <label className="block text-xs font-semibold">To
          <select value={to} onChange={(e) => setTo(e.target.value)} className="surface-soft mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none">
            {units.map((u) => <option key={u}>{u}</option>)}
          </select>
        </label>
      </div>
      <p className="mt-4 text-center text-2xl font-bold tabular-nums" role="status">
        {val || "0"} {from} = {out} {to}
      </p>
      <p className="text-muted mt-1 text-center text-xs">Length, weight and volume run fully offline.</p>
    </Panel>
  );
}

function SlugTool() {
  const [text, setText] = useState("");
  const copy = useCopy();
  const slug = useMemo(
    () =>
      text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/[\s_]+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 120),
    [text]
  );
  return (
    <Panel>
      <label className="block text-xs font-semibold">Title</label>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="My Great Blog Post!"
        aria-label="Title to slugify"
        className="surface-soft mt-1.5 w-full rounded-lg px-3 py-2.5 text-sm outline-none"
      />
      <div className="surface-soft mt-3 flex items-center gap-2 rounded-xl px-3.5 py-3 font-mono text-sm break-all">
        <span className="flex-1">{slug || "—"}</span>
        {slug && (
          <button onClick={() => copy(slug)} aria-label="Copy slug" className="surface rounded-lg p-2">
            <Copy className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
    </Panel>
  );
}

const LOREM = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
  "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
  "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
  "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.",
];

function LoremTool() {
  const [paras, setParas] = useState(3);
  const copy = useCopy();
  const text = useMemo(
    () => Array.from({ length: paras }, (_, i) => LOREM[i % LOREM.length]).join("\n\n"),
    [paras]
  );
  return (
    <Panel>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-xs font-semibold">
          Paragraphs (1–10)
          <input
            type="number" min={1} max={10} value={paras}
            onChange={(e) => setParas(Math.max(1, Math.min(10, Number(e.target.value) || 3)))}
            className="surface-soft mt-1 block w-28 rounded-lg px-3 py-2 text-sm outline-none"
          />
        </label>
        <button onClick={() => copy(text)} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
          <Copy className="h-4 w-4" aria-hidden /> Copy text
        </button>
      </div>
      <div className="surface-soft mt-3 max-h-64 space-y-3 overflow-auto rounded-xl p-4 text-sm leading-relaxed">
        {text.split("\n\n").map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </Panel>
  );
}

function BmiTool() {
  const [cm, setCm] = useState("178");
  const [kg, setKg] = useState("72");
  const bmi = useMemo(() => {
    const h = Number(cm) / 100;
    const w = Number(kg);
    if (!h || !w || h <= 0 || w <= 0) return null;
    return w / (h * h);
  }, [cm, kg]);
  const cat =
    bmi === null ? null : bmi < 18.5 ? "Underweight" : bmi < 25 ? "Healthy" : bmi < 30 ? "Overweight" : "Obese";
  return (
    <Panel>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-semibold">
          Height (cm)
          <input value={cm} onChange={(e) => setCm(e.target.value)} inputMode="decimal" className="surface-soft mt-1 w-full rounded-lg px-3 py-2.5 text-sm outline-none" />
        </label>
        <label className="block text-xs font-semibold">
          Weight (kg)
          <input value={kg} onChange={(e) => setKg(e.target.value)} inputMode="decimal" className="surface-soft mt-1 w-full rounded-lg px-3 py-2.5 text-sm outline-none" />
        </label>
      </div>
      <p className="mt-4 text-center" role="status">
        <span className="text-3xl font-bold tabular-nums">{bmi === null ? "—" : bmi.toFixed(1)}</span>
        {cat && <span className="surface-soft ml-2 rounded-full px-3 py-1 text-sm font-semibold">{cat}</span>}
      </p>
      <p className="text-muted mt-1 text-center text-xs">General guide only — not medical advice.</p>
    </Panel>
  );
}

function PercentTool() {
  const [mode, setMode] = useState<"of" | "change" | "tip">("of");
  const [a, setA] = useState("20");
  const [b, setB] = useState("150");
  const out = useMemo(() => {
    const x = Number(a);
    const y = Number(b);
    if (Number.isNaN(x) || Number.isNaN(y)) return "—";
    if (mode === "of") return `${((x / 100) * y).toLocaleString()}  (${x}% of ${y})`;
    if (mode === "change") {
      if (x === 0) return "—";
      const d = ((y - x) / Math.abs(x)) * 100;
      return `${d >= 0 ? "+" : ""}${d.toFixed(2)}%  (${x} → ${y})`;
    }
    return `${(y + (x / 100) * y).toLocaleString()}  (${y} + ${x}% tip)`;
  }, [mode, a, b]);
  return (
    <Panel>
      <div className="flex gap-2" role="radiogroup" aria-label="Calculation">
        {([["of", "X% of Y"], ["change", "% change"], ["tip", "Tip"]] as const).map(([v, label]) => (
          <button
            key={v} role="radio" aria-checked={mode === v} onClick={() => setMode(v)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${mode === v ? "bg-brand-600 text-white" : "surface-soft"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-semibold">
          {mode === "of" ? "Percent (%)" : mode === "change" ? "From" : "Tip (%)"}
          <input value={a} onChange={(e) => setA(e.target.value)} inputMode="decimal" className="surface-soft mt-1 w-full rounded-lg px-3 py-2.5 text-sm outline-none" />
        </label>
        <label className="block text-xs font-semibold">
          {mode === "of" ? "Value" : mode === "change" ? "To" : "Bill"}
          <input value={b} onChange={(e) => setB(e.target.value)} inputMode="decimal" className="surface-soft mt-1 w-full rounded-lg px-3 py-2.5 text-sm outline-none" />
        </label>
      </div>
      <p className="mt-4 text-center text-2xl font-bold tabular-nums" role="status">{out}</p>
    </Panel>
  );
}
