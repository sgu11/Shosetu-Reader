import { NextResponse } from "next/server";
import { subscribeToNovel, unsubscribeFromNovel } from "@/modules/library/application/subscribe";

interface Ctx {
  params: Promise<{ novelId: string }>;
}

export async function POST(_req: Request, ctx: Ctx) {
  try {
    const { novelId } = await ctx.params;
    const result = await subscribeToNovel(novelId);
    return NextResponse.json(result, { status: result.isNew ? 201 : 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Subscribe failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { novelId } = await ctx.params;
    const removed = await unsubscribeFromNovel(novelId);

    if (!removed) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unsubscribe failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
