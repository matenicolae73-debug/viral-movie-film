import { NextResponse } from "next/server";

async function redis(command:string,args:string[]=[]){
  const base=process.env.KV_REST_API_URL||process.env.UPSTASH_REDIS_REST_URL;
  const token=process.env.KV_REST_API_TOKEN||process.env.UPSTASH_REDIS_REST_TOKEN;
  if(!base||!token) throw new Error("Public movie storage is not configured.");
  const r=await fetch(`${base}/${command}/${args.map(encodeURIComponent).join("/")}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
  if(!r.ok)throw new Error(`Storage HTTP ${r.status}`);
  return r.json();
}

export async function GET(_req:Request,{params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  try{
    const [v,l]=await Promise.all([redis("get",[`vm:movie:${slug}:views`]),redis("get",[`vm:movie:${slug}:likes`])]);
    return NextResponse.json({ok:true,views:Number(v?.result||0),likes:Number(l?.result||0)});
  }catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Engagement unavailable."},{status:500});}
}

export async function POST(req:Request,{params}:{params:Promise<{slug:string}>}){
  const {slug}=await params; const body=await req.json().catch(()=>({})); const action=String(body?.action||"");
  if(!["view","like"].includes(action))return NextResponse.json({ok:false,error:"Invalid engagement action."},{status:400});
  try{
    const movie=await redis("get",[`vm:movie:${slug}`]); if(!movie?.result)return NextResponse.json({ok:false,error:"Movie not found."},{status:404});
    const key=`vm:movie:${slug}:${action}s`; const result=await redis("incr",[key]);
    const [v,l]=await Promise.all([redis("get",[`vm:movie:${slug}:views`]),redis("get",[`vm:movie:${slug}:likes`])]);
    return NextResponse.json({ok:true,action,views:Number(v?.result||0),likes:Number(l?.result||0),value:Number(result?.result||0)});
  }catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Engagement failed."},{status:500});}
}
