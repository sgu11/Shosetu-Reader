import { NextRequest, NextResponse } from "next/server";
import { registerNovelInputSchema } from "@/modules/source/api/schemas";
import { registerNovel } from "@/modules/catalog/application/register-novel";
import { SyosetuApiError } from "@/modules/source/infra/syosetu-api";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = registerNovelInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const result = await registerNovel(parsed.data.ncode);
    return NextResponse.json(result, { status: result.isNew ? 201 : 200 });
  } catch (err) {
    if (err instanceof SyosetuApiError) {
      const status = err.statusCode === 404 ? 404 : 502;
      return NextResponse.json({ error: err.message }, { status });
    }
    console.error("Registration failed:", err);
    return NextResponse.json(
      { error: "Internal server error during registration" },
      { status: 500 },
    );
  }
}
