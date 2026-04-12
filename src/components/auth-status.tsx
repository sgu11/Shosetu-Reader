"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/client";

interface AuthSession {
  isAuthenticated: boolean;
  user: {
    id: string;
    email: string;
    displayName: string | null;
  };
}

function userLabel(session: AuthSession) {
  return session.user.displayName || session.user.email.split("@")[0] || session.user.email;
}

export function AuthStatus() {
  const router = useRouter();
  const { t } = useTranslation();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        setSession(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function signOut() {
    setBusy(true);
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
      setSession(null);
      router.refresh();
    } catch {
      // silent
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <span className="text-xs text-muted">{t("auth.loading")}</span>;
  }

  if (!session?.isAuthenticated) {
    return (
      <Link href="/sign-in" className="btn-pill btn-secondary text-xs">
        {t("auth.signIn")}
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="rounded-full border border-border px-3 py-1 text-xs text-muted">
        {t("auth.signedInAs")} {userLabel(session)}
      </span>
      <button
        type="button"
        onClick={signOut}
        disabled={busy}
        className="rounded-full border border-border px-3 py-1 text-xs text-muted transition-colors hover:bg-surface-strong hover:text-foreground disabled:opacity-50"
      >
        {t("auth.signOut")}
      </button>
    </div>
  );
}
