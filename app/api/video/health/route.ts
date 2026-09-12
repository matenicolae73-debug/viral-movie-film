import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET() { return NextResponse.json({ ok: true, falConfigured: Boolean(process.env.FAL_KEY), model: process.env.FAL_VIDEO_MODEL?.trim() || "fal-ai/vidu/q3/text-to-video/turbo", storageConfigured: Boolean(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) }); }
