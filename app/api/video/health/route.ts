import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, service: "video-generation", storageConfigured: Boolean(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) });
}
