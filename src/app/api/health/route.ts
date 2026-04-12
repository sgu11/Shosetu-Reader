import { NextResponse } from "next/server";

import { getPublicRuntimeConfig } from "@/lib/env";

export async function GET() {
  const config = getPublicRuntimeConfig();

  return NextResponse.json({
    ok: true,
    service: "shosetu-reader",
    environment: config.nodeEnv,
    url: config.appUrl,
    timestamp: new Date().toISOString(),
  });
}
