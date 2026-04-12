import { NextRequest, NextResponse } from "next/server";
import { getNovelById } from "@/modules/catalog/application/get-novel";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ novelId: string }> },
) {
  const { novelId } = await params;

  const novel = await getNovelById(novelId);
  if (!novel) {
    return NextResponse.json({ error: "Novel not found" }, { status: 404 });
  }

  return NextResponse.json(novel);
}
