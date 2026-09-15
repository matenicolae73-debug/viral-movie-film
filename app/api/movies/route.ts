import { NextResponse } from "next/server";

async function redis(command: string, args: string[] = []) {
  const base = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!base || !token) return null;
  const r = await fetch(`${base}/${command}/${args.map(encodeURIComponent).join("/")}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!r.ok) throw new Error(`Storage HTTP ${r.status}`);
  return r.json();
}

export async function GET() {
  try {
    const ids = await redis("lrange", ["vm:movies", "0", "49"]);
    const list: string[] = Array.isArray(ids?.result) ? ids.result : [];
    const movies = [];
    for (const slug of list) {
      const r = await redis("get", [slug.startsWith("vm:movie:") ? slug : `vm:movie:${slug}`]);
      if (r?.result) {
        const movie = typeof r.result === "string" ? JSON.parse(r.result) : r.result;
        const [likes, views] = await Promise.all([
          redis("get", [`vm:movie:${movie.slug}:likes`]),
          redis("get", [`vm:movie:${movie.slug}:views`])
        ]);
        movies.push({ ...movie, likes: Number(likes?.result || movie.likes || 0), views: Number(views?.result || movie.views || 0) });
      }
    }
    return NextResponse.json({ ok: true, movies });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Movies unavailable." }, { status: 500 });
  }
}
