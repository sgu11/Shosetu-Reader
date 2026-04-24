import { eq, and, asc, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { novelGlossaryEntries, novelGlossaries } from "@/lib/db/schema";

export interface GlossaryEntryInput {
  termJa: string;
  termKo: string;
  reading?: string;
  category: "character" | "place" | "term" | "skill" | "honorific";
  notes?: string;
  sourceEpisodeNumber?: number;
  status?: "confirmed" | "suggested" | "rejected";
  importance?: number;
  confidence?: number;
  provenanceTranslationId?: string;
}

/** List all entries for a novel, ordered by category then termJa */
export async function listGlossaryEntries(
  novelId: string,
  statusFilter?: string,
) {
  const db = getDb();
  const conditions = [eq(novelGlossaryEntries.novelId, novelId)];
  if (
    statusFilter === "confirmed" ||
    statusFilter === "suggested" ||
    statusFilter === "rejected"
  ) {
    conditions.push(eq(novelGlossaryEntries.status, statusFilter));
  }
  return db
    .select()
    .from(novelGlossaryEntries)
    .where(and(...conditions))
    .orderBy(
      asc(novelGlossaryEntries.category),
      asc(novelGlossaryEntries.termJa),
    );
}

/** Create a single entry. Increments glossary_version if confirmed. */
export async function createGlossaryEntry(
  novelId: string,
  input: GlossaryEntryInput,
) {
  const db = getDb();
  const [entry] = await db
    .insert(novelGlossaryEntries)
    .values({
      novelId,
      termJa: input.termJa,
      termKo: input.termKo,
      reading: input.reading ?? null,
      category: input.category,
      notes: input.notes ?? null,
      sourceEpisodeNumber: input.sourceEpisodeNumber ?? null,
      status: input.status ?? "suggested",
      importance: input.importance ?? 3,
      confidence: input.confidence ?? null,
      provenanceTranslationId: input.provenanceTranslationId ?? null,
    })
    .onConflictDoNothing()
    .returning();

  if (entry && input.status === "confirmed") {
    await bumpGlossaryVersion(novelId);
  }

  return entry ?? null;
}

/** Update an existing entry. Increments glossary_version if the entry is or becomes confirmed. */
export async function updateGlossaryEntry(
  entryId: string,
  novelId: string,
  updates: Partial<GlossaryEntryInput>,
) {
  const db = getDb();

  // Get current state to determine if version bump is needed
  const [current] = await db
    .select({ status: novelGlossaryEntries.status })
    .from(novelGlossaryEntries)
    .where(eq(novelGlossaryEntries.id, entryId))
    .limit(1);

  const [updated] = await db
    .update(novelGlossaryEntries)
    .set({
      ...(updates.termJa !== undefined && { termJa: updates.termJa }),
      ...(updates.termKo !== undefined && { termKo: updates.termKo }),
      ...(updates.reading !== undefined && { reading: updates.reading }),
      ...(updates.category !== undefined && { category: updates.category }),
      ...(updates.notes !== undefined && { notes: updates.notes }),
      ...(updates.sourceEpisodeNumber !== undefined && {
        sourceEpisodeNumber: updates.sourceEpisodeNumber,
      }),
      ...(updates.status !== undefined && { status: updates.status }),
      ...(updates.importance !== undefined && {
        importance: updates.importance,
      }),
      ...(updates.confidence !== undefined && {
        confidence: updates.confidence,
      }),
      updatedAt: new Date(),
    })
    .where(eq(novelGlossaryEntries.id, entryId))
    .returning();

  // Bump version if entry is confirmed or became confirmed
  if (updated) {
    const wasConfirmed = current?.status === "confirmed";
    const isConfirmed = (updates.status ?? current?.status) === "confirmed";
    if (wasConfirmed || isConfirmed) {
      await bumpGlossaryVersion(novelId);
    }
  }

  return updated ?? null;
}

/** Delete an entry. Increments glossary_version if it was confirmed. */
export async function deleteGlossaryEntry(entryId: string, novelId: string) {
  const db = getDb();

  const [deleted] = await db
    .delete(novelGlossaryEntries)
    .where(eq(novelGlossaryEntries.id, entryId))
    .returning({ status: novelGlossaryEntries.status });

  if (deleted?.status === "confirmed") {
    await bumpGlossaryVersion(novelId);
  }

  return deleted != null;
}

const MAX_CONFIRMED_ENTRIES = 200;

/** Evict excess confirmed entries to stay under MAX_CONFIRMED_ENTRIES cap. */
async function evictExcessConfirmedEntries(novelId: string) {
  const db = getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(novelGlossaryEntries)
    .where(
      and(
        eq(novelGlossaryEntries.novelId, novelId),
        eq(novelGlossaryEntries.status, "confirmed"),
      ),
    );
  const count = row?.count ?? 0;
  if (count <= MAX_CONFIRMED_ENTRIES) return;

  const excess = count - MAX_CONFIRMED_ENTRIES;
  const victims = await db
    .select({ id: novelGlossaryEntries.id })
    .from(novelGlossaryEntries)
    .where(
      and(
        eq(novelGlossaryEntries.novelId, novelId),
        eq(novelGlossaryEntries.status, "confirmed"),
      ),
    )
    .orderBy(
      asc(novelGlossaryEntries.importance),
      asc(novelGlossaryEntries.createdAt),
    )
    .limit(excess);
  if (victims.length === 0) return;
  await db
    .delete(novelGlossaryEntries)
    .where(inArray(novelGlossaryEntries.id, victims.map((v) => v.id)));
}

/** Bulk import entries (for extraction and manual import). Skips existing confirmed entries. */
export async function importGlossaryEntries(
  novelId: string,
  entries: GlossaryEntryInput[],
): Promise<{ imported: number; skipped: number }> {
  const db = getDb();
  if (entries.length === 0) return { imported: 0, skipped: 0 };

  // Batch lookup existing entries
  const termJas = Array.from(new Set(entries.map((e) => e.termJa)));
  const existingRows = await db
    .select({
      id: novelGlossaryEntries.id,
      termJa: novelGlossaryEntries.termJa,
      category: novelGlossaryEntries.category,
      status: novelGlossaryEntries.status,
      importance: novelGlossaryEntries.importance,
    })
    .from(novelGlossaryEntries)
    .where(
      and(
        eq(novelGlossaryEntries.novelId, novelId),
        inArray(novelGlossaryEntries.termJa, termJas),
      ),
    );

  const existingByKey = new Map<string, (typeof existingRows)[number]>();
  for (const row of existingRows) {
    existingByKey.set(`${row.termJa}::${row.category}`, row);
  }

  let imported = 0;
  let skipped = 0;
  let confirmedChanged = false;
  const toInsert: Array<typeof novelGlossaryEntries.$inferInsert> = [];

  for (const input of entries) {
    const key = `${input.termJa}::${input.category}`;
    const existing = existingByKey.get(key);

    if (existing) {
      // Don't overwrite confirmed entries with suggested ones
      if (existing.status === "confirmed") {
        // Check if importance changed
        const newImportance = input.importance ?? 3;
        if (existing.importance !== newImportance) {
          await db
            .update(novelGlossaryEntries)
            .set({
              importance: newImportance,
              updatedAt: new Date(),
            })
            .where(eq(novelGlossaryEntries.id, existing.id));
          confirmedChanged = true;
        }
        skipped++;
        continue;
      }
      // Update existing suggested/rejected entry
      await db
        .update(novelGlossaryEntries)
        .set({
          termKo: input.termKo,
          reading: input.reading ?? null,
          notes: input.notes ?? null,
          sourceEpisodeNumber: input.sourceEpisodeNumber ?? null,
          status: input.status ?? "suggested",
          importance: input.importance ?? 3,
          confidence: input.confidence ?? null,
          provenanceTranslationId: input.provenanceTranslationId ?? null,
          updatedAt: new Date(),
        })
        .where(eq(novelGlossaryEntries.id, existing.id));
      if (input.status === "confirmed") confirmedChanged = true;
      imported++;
    } else {
      const effectiveStatus = input.status ?? "suggested";
      if (effectiveStatus === "confirmed") confirmedChanged = true;

      toInsert.push({
        novelId,
        termJa: input.termJa,
        termKo: input.termKo,
        reading: input.reading ?? null,
        category: input.category,
        notes: input.notes ?? null,
        sourceEpisodeNumber: input.sourceEpisodeNumber ?? null,
        status: effectiveStatus,
        importance: input.importance ?? 3,
        confidence: input.confidence ?? null,
        provenanceTranslationId: input.provenanceTranslationId ?? null,
      });
      imported++;
    }
  }

  // Batch insert new entries
  if (toInsert.length > 0) {
    await db.insert(novelGlossaryEntries).values(toInsert).onConflictDoNothing();
  }

  // Handle cap enforcement and version bump for confirmed changes
  if (confirmedChanged) {
    await evictExcessConfirmedEntries(novelId);
    await bumpGlossaryVersion(novelId);
  }

  return { imported, skipped };
}

/** Atomically increment glossary_version on the novel_glossaries row. Creates row if missing. */
async function bumpGlossaryVersion(novelId: string) {
  const db = getDb();
  await db
    .insert(novelGlossaries)
    .values({
      novelId,
      glossary: "",
      glossaryVersion: 2, // start at 2 since first change bumps from default 1
    })
    .onConflictDoUpdate({
      target: novelGlossaries.novelId,
      set: {
        glossaryVersion: sql`${novelGlossaries.glossaryVersion} + 1`,
        updatedAt: new Date(),
      },
    });
}
