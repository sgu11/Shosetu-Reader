"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/client";

interface ProfileSummary {
  id: string;
  displayName: string;
  createdAt: string;
  isActive: boolean;
}

interface ProfilesResponse {
  activeProfileId: string | null;
  profiles: ProfileSummary[];
}

export default function ProfilesPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<ProfilesResponse>({ activeProfileId: null, profiles: [] });
  const [displayName, setDisplayName] = useState("");
  const [importGuestData, setImportGuestData] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busyProfileId, setBusyProfileId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function loadProfiles() {
    setLoading(true);
    try {
      const res = await fetch("/api/profiles");
      const data = await res.json();
      setProfiles(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfiles();
  }, []);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          importGuestData,
        }),
      });
      if (res.ok) {
        setDisplayName("");
        await loadProfiles();
        router.refresh();
      }
    } finally {
      setCreating(false);
    }
  }

  async function selectProfile(profileId: string) {
    setBusyProfileId(profileId);
    try {
      const res = await fetch("/api/profiles/active", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          importGuestData,
        }),
      });
      if (res.ok) {
        await loadProfiles();
        router.refresh();
      }
    } finally {
      setBusyProfileId(null);
    }
  }

  async function useGuest() {
    setBusyProfileId("guest");
    try {
      await fetch("/api/profiles/active", { method: "DELETE" });
      await loadProfiles();
      router.refresh();
    } finally {
      setBusyProfileId(null);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-normal leading-none tracking-tight">
          {t("profile.title")}
        </h1>
        <p className="text-sm text-muted">
          {t("profile.subtitle")}
        </p>
      </div>

      <section className="surface-card space-y-5 rounded-xl p-6">
        <h2 className="text-lg font-normal">{t("profile.create")}</h2>

        <form className="space-y-4" onSubmit={handleCreate}>
          <input
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder={t("profile.namePlaceholder")}
            className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-border-strong focus:outline-none"
            required
          />

          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={importGuestData}
              onChange={(event) => setImportGuestData(event.target.checked)}
            />
            <span>{t("profile.importGuestData")}</span>
          </label>

          <button
            type="submit"
            disabled={creating}
            className="btn-pill btn-accent"
          >
            {creating ? t("profile.creating") : t("profile.create")}
          </button>
        </form>
      </section>

      <section className="surface-card space-y-5 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-normal">{t("profile.listTitle")}</h2>
          <button
            type="button"
            onClick={useGuest}
            disabled={busyProfileId === "guest"}
            className="rounded-full border border-border px-3 py-1 text-xs text-muted transition-colors hover:bg-surface-strong hover:text-foreground disabled:opacity-50"
          >
            {t("profile.useGuest")}
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-muted">{t("profile.loading")}</p>
        ) : profiles.profiles.length === 0 ? (
          <p className="text-sm text-muted">{t("profile.empty")}</p>
        ) : (
          <div className="space-y-2">
            {profiles.profiles.map((profile) => (
              <div
                key={profile.id}
                className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {profile.displayName}
                  </p>
                  <p className="text-xs text-muted">
                    {new Date(profile.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {profile.isActive ? (
                  <span className="rounded-full bg-success/10 px-3 py-1 text-xs text-success">
                    {t("profile.current")}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => selectProfile(profile.id)}
                    disabled={busyProfileId === profile.id}
                    className="btn-pill btn-secondary text-xs"
                  >
                    {busyProfileId === profile.id ? t("profile.switching") : t("profile.select")}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
