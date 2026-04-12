"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/client";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ProfileSwitcher } from "@/components/profile-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

export function Nav() {
  const { t } = useTranslation();

  const links = [
    { href: "/", label: t("nav.home") },
    { href: "/library", label: t("nav.library") },
    { href: "/ranking", label: t("nav.ranking") },
    { href: "/register", label: t("nav.register") },
    { href: "/settings", label: t("nav.settings") },
    { href: "/profiles", label: t("nav.profiles") },
  ] as const;

  return (
    <nav className="border-b border-border bg-background px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium tracking-tight text-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-accent" />
            {t("nav.brand")}
          </Link>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <ProfileSwitcher />
            <ThemeToggle />
            <LocaleSwitcher />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/register"
            className="btn-pill btn-primary hidden text-xs sm:inline-flex"
          >
            {t("nav.addNovel")}
          </Link>
        </div>
      </div>
    </nav>
  );
}
