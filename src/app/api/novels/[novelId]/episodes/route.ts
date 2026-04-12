import { NextRequest, NextResponse } from "next/server";
import { getNovelById, getEpisodesByNovelId } from "@/modules/catalog/application/get-novel";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ novelId: string }> },
) {
  const { novelId } = await params;

  const novel = await getNovelById(novelId);
  if (!novel) {
    return NextResponse.json({ error: "Novel not found" }, { status: 404 });
  }

  const result = await getEpisodesByNovelId(novelId);
  return NextResponse.json({
    novelId,
    episodes: result.episodes,
    totalCount: result.totalCount,
  });
}
