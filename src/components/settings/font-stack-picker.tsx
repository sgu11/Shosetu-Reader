"use client";

import { useEffect, useState } from "react";

interface ReaderPrefs {
  fontSize: string;
  lineHeight: string;
  contentWidth: string;
  fontFamily: string;
  fontWeight: string;
}

const DEFAULT: ReaderPrefs = {
  fontSize: "medium",
  lineHeight: "1.8",
  contentWidth: "680",
  fontFamily: "noto-serif-jp",
  fontWeight: "normal",
};

const COOKIE_NAME = "reader-prefs";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

const STACKS: Array<{
  value: string;
  name: string;
  preview: string;
  fontFamily: string;
}> = [
  {
    value: "noto-serif-jp",
    name: "Noto Serif JP",
    preview: "花霞 · 雪解 · 燈火",
    fontFamily: "var(--font-jp), 'Noto Serif JP', serif",
  },
  {
    value: "pretendard",
    name: "Pretendard",
    preview: "花霞 · 雪解 · 燈火",
    fontFamily: "'Pretendard JP Variable', 'Pretendard JP', system-ui, sans-serif",
  },
  {
    value: "newsreader",
    name: "Newsreader · pair",
    preview: "kasumi · yukidoke",
    fontFamily: "var(--font-serif), Georgia, serif",
  },
];

function readPrefs(): ReaderPrefs {
  if (typeof document === "undefined") return DEFAULT;
  try {
    const m = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${COOKIE_NAME}=`));
    if (!m) return DEFAULT;
    return { ...DEFAULT, ...JSON.parse(decodeURIComponent(m.split("=").slice(1).join("="))) };
  } catch {
    return DEFAULT;
  }
}

function writePrefs(p: ReaderPrefs) {
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(p))};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
  const css = STACKS.find((s) => s.value === p.fontFamily)?.fontFamily ?? STACKS[0].fontFamily;
  document.documentElement.style.setProperty("--reader-font-family", css);
}

export function FontStackPicker() {
  const [prefs, setPrefs] = useState<ReaderPrefs>(DEFAULT);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setPrefs(readPrefs());
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  function pick(value: string) {
    const next = { ...prefs, fontFamily: value };
    setPrefs(next);
    writePrefs(next);
  }

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
      {STACKS.map((s) => {
        const active = prefs.fontFamily === s.value;
        return (
          <button
            key={s.value}
            type="button"
            onClick={() => pick(s.value)}
            className={`flex flex-col gap-2 rounded-[4px] border bg-surface px-4 py-3.5 text-left transition-colors ${
              active ? "border-foreground" : "border-border hover:border-foreground"
            }`}
          >
            <span
              className="text-[18px] leading-tight text-foreground"
              style={{ fontFamily: s.fontFamily }}
            >
              {s.preview}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
              {s.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
