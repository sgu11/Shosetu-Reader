"use client";

import { useEffect, useMemo, useState } from "react";

export interface ModelOption {
  id: string;
  name: string;
  contextLength: number | null;
  promptPrice: string | null;
  completionPrice: string | null;
}

interface Props {
  value: string;
  onChange: (modelName: string) => void;
  favorites: string[];
  onToggleFavorite?: (modelName: string) => void;
  allowedModels?: string[];
  maxVisible?: number;
  placeholder?: string;
}

export function ModelPicker({
  value,
  onChange,
  favorites,
  onToggleFavorite,
  allowedModels,
  maxVisible = 50,
  placeholder = "Search models...",
}: Props) {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/openrouter/models")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setModels(data.models ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const pool = useMemo(() => {
    if (!allowedModels) return models;
    const allow = new Set(allowedModels);
    return models.filter((m) => allow.has(m.id));
  }, [models, allowedModels]);

  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  const { favoriteRows, otherRows } = useMemo(() => {
    const fav: ModelOption[] = [];
    const other: ModelOption[] = [];
    for (const m of pool) {
      if (favoriteSet.has(m.id)) fav.push(m);
      else other.push(m);
    }
    const favOrdered = favorites
      .map((id) => fav.find((m) => m.id === id))
      .filter((m): m is ModelOption => !!m);
    return { favoriteRows: favOrdered, otherRows: other };
  }, [pool, favoriteSet, favorites]);

  const query = search.trim().toLowerCase();
  const filteredOther = query
    ? otherRows.filter(
        (m) =>
          m.id.toLowerCase().includes(query) ||
          m.name.toLowerCase().includes(query),
      )
    : otherRows;

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-border-strong focus:outline-none"
      />

      {loading ? (
        <p className="text-xs text-muted">Loading models…</p>
      ) : (
        <div className="max-h-80 overflow-y-auto rounded-md border border-border">
          {favoriteRows.length > 0 && (
            <>
              <div className="sticky top-0 z-10 bg-surface-strong px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                ★ Favorites
              </div>
              {favoriteRows.map((m) => (
                <ModelRow
                  key={m.id}
                  model={m}
                  active={value === m.id}
                  favorite
                  onClick={() => onChange(m.id)}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
              <div className="border-t border-border" />
            </>
          )}

          {filteredOther.slice(0, maxVisible).map((m) => (
            <ModelRow
              key={m.id}
              model={m}
              active={value === m.id}
              favorite={false}
              onClick={() => onChange(m.id)}
              onToggleFavorite={onToggleFavorite}
            />
          ))}

          {filteredOther.length === 0 && favoriteRows.length === 0 && (
            <p className="px-4 py-3 text-xs text-muted">No models found.</p>
          )}
          {filteredOther.length > maxVisible && (
            <p className="px-4 py-2 text-xs text-muted">
              Refine search to see more (showing {maxVisible} of {filteredOther.length}).
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ModelRow({
  model,
  active,
  favorite,
  onClick,
  onToggleFavorite,
}: {
  model: ModelOption;
  active: boolean;
  favorite: boolean;
  onClick: () => void;
  onToggleFavorite?: (id: string) => void;
}) {
  return (
    <div
      className={`flex items-center gap-1 px-2 py-0.5 ${
        active ? "bg-surface-strong text-accent" : ""
      }`}
    >
      {onToggleFavorite && (
        <button
          type="button"
          onClick={() => onToggleFavorite(model.id)}
          className={`rounded-md px-1.5 py-1 text-sm transition-colors hover:bg-surface-strong ${
            favorite ? "text-amber-500" : "text-muted/40 hover:text-muted"
          }`}
          aria-label={favorite ? "Unfavorite" : "Favorite"}
          title={favorite ? "Remove from favorites" : "Add to favorites"}
        >
          {favorite ? "★" : "☆"}
        </button>
      )}
      <button
        type="button"
        onClick={onClick}
        className={`flex min-w-0 flex-1 items-center justify-between rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-surface-strong ${
          active ? "" : "text-foreground"
        }`}
        title={model.id}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{model.name}</p>
          <p className="truncate text-xs text-muted">{model.id}</p>
        </div>
        {model.contextLength && (
          <span className="ml-3 shrink-0 text-xs text-muted">
            {Math.round(model.contextLength / 1000)}k ctx
          </span>
        )}
      </button>
    </div>
  );
}
