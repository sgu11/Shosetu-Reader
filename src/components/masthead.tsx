"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ProfileSwitcher } from "@/components/profile-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

interface NavDoublet {
  href: string;
  match: RegExp;
  ko: string;
  en: string;
}

const NAV: NavDoublet[] = [
  { href: "/", match: /^\/$/, ko: "홈", en: "Home" },
  { href: "/library", match: /^\/library/, ko: "서재", en: "Library" },
  { href: "/ranking", match: /^\/ranking/, ko: "랭킹", en: "Ranking" },
  { href: "/register", match: /^\/register/, ko: "등록", en: "Register" },
  { href: "/settings", match: /^\/settings/, ko: "설정", en: "Settings" },
  { href: "/profiles", match: /^\/profiles/, ko: "프로필", en: "Profiles" },
];

function MastheadDate() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const yyyy = now.getFullYear();
  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground">
      {mm} · {dd} · {yyyy}
    </span>
  );
}

export function Masthead() {
  const pathname = usePathname() ?? "/";

  return (
    <header className="border-b border-foreground/80">
      <div className="mx-auto grid max-w-6xl items-end gap-4 px-6 pt-5 md:grid-cols-[1fr_auto_1fr]">
        <div className="flex flex-col gap-1">
          <MastheadDate />
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
            Vol · 05 — Issue 142
          </span>
        </div>

        <Link href="/" className="flex items-baseline gap-2 text-foreground">
          <span className="text-[40px] font-semibold leading-none tracking-tight md:text-[52px]">
            narou
          </span>
          <span className="-translate-y-[2px] font-mono text-[28px] font-light leading-none text-muted md:text-[36px]">
            /
          </span>
          <span className="text-[40px] font-normal leading-none tracking-tight md:text-[52px]">
            reader
          </span>
        </Link>

        <div className="flex items-center justify-end gap-2">
          <ProfileSwitcher />
          <ThemeToggle />
          <LocaleSwitcher />
        </div>
      </div>

      <div className="mx-auto mt-3 flex max-w-6xl items-center gap-3 border-y border-border px-6 py-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          多 源 · 매 일 정 시 · 자 동 번 역
        </span>
        <span className="h-px flex-1 bg-border" />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          syosetu / nocturne / kakuyomu / alphapolis
        </span>
      </div>

      <nav
        className="mx-auto flex max-w-6xl px-6 pb-3 pt-2"
        aria-label="primary"
      >
        {NAV.map((item, idx) => {
          const active = item.match.test(pathname);
          const isLast = idx === NAV.length - 1;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-1 flex-col items-start gap-0.5 py-1.5 pl-1 pr-3 transition-colors ${
                isLast ? "" : "border-r border-border"
              } ${active ? "text-foreground" : "text-muted hover:text-foreground"}`}
            >
              <span
                className={`text-[15px] leading-none ${
                  active ? "font-semibold text-foreground" : "font-medium"
                }`}
              >
                {item.ko}
              </span>
              <span
                className={`font-mono text-[9px] uppercase tracking-[0.2em] ${
                  active ? "text-foreground" : "text-muted/80"
                }`}
              >
                {item.en}
              </span>
              {active ? (
                <span
                  aria-hidden
                  className="absolute -bottom-[10px] left-0 right-3 h-[2px] bg-foreground"
                />
              ) : null}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
