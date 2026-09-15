import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const falConfigured = Boolean(process.env.FAL_KEY?.trim());
  const storageConfigured = Boolean(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL);
  return NextResponse.json({ ok: true, service: "video-generation", falConfigured, storageConfigured });
}
