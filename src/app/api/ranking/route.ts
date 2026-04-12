import { NextRequest, NextResponse } from "next/server";
import { getRanking } from "@/modules/catalog/application/get-ranking";
import type { RankingPeriod } from "@/modules/source/infra/syosetu-api";

const VALID_PERIODS = new Set(["daily", "weekly", "monthly", "quarterly"]);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const period = searchParams.get("period") ?? "daily";
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);

    if (!VALID_PERIODS.has(period)) {
      return NextResponse.json(
        { error: "Invalid period. Use: daily, weekly, monthly, quarterly" },
        { status: 400 },
      );
    }

    const items = await getRanking(period as RankingPeriod, limit);
    return NextResponse.json({ items, period });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch ranking";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
