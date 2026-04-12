import { NextResponse } from "next/server";
import { getLibrary } from "@/modules/library/application/get-library";

export async function GET() {
  try {
    const library = await getLibrary();
    return NextResponse.json(library);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch library";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
