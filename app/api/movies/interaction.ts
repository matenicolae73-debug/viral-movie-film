import { NextResponse } from "next/server";

async function redis(command: string, args: string[] = []) {
  const base = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!base || !token) throw new Error("Public movie storage is not configured.");
  const r = await fetch(`${base}/${command}/${args.map(encodeURIComponent).join("/")}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!r.ok) throw new Error(`Storage HTTP ${r.status}`);
  return r.json();
}

function validSlug(slug: string) { return /^[a-z0-9-]{1,100}$/i.test(slug); }

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const slug = String(body?.slug || "").trim();
  const action = String(body?.action || "").trim().toLowerCase();
  if (!validSlug(slug) || !["like", "view"].includes(action)) return NextResponse.json({ ok: false, error: "Invalid movie interaction." }, { status: 400 });
  try {
    const exists = await redis("exists", [`vm:movie:${slug}`]);
    if (!exists?.result) return NextResponse.json({ ok: false, error: "Movie not found." }, { status: 404 });
    const key = `vm:movie:${slug}:${action}s`;
    const result = await redis("incr", [key]);
    const value = Number(result?.result || 0);
    return NextResponse.json({ ok: true, action, count: value });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Interaction unavailable." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug") || "";
  if (!validSlug(slug)) return NextResponse.json({ ok: false, error: "Invalid movie slug." }, { status: 400 });
  try {
    const [likes, views] = await Promise.all([
      redis("get", [`vm:movie:${slug}:likes`]),
      redis("get", [`vm:movie:${slug}:views`])
    ]);
    return NextResponse.json({ ok: true, likes: Number(likes?.result || 0), views: Number(views?.result || 0) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Interaction unavailable." }, { status: 500 });
  }
}
