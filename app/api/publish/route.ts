import { NextResponse } from "next/server";
export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(request:Request){
  try{
    const {url,title}=await request.json().catch(()=>({}));
    if(!url) return NextResponse.json({ok:false,message:"Video URL is required."},{status:400});
    const token=process.env.BLOB_READ_WRITE_TOKEN?.trim();
    if(!token) return NextResponse.json({ok:false,message:"Public publishing is not configured yet. The film is still available as a local preview/download. Add BLOB_READ_WRITE_TOKEN to enable permanent Movies Online publishing."},{status:503});
    const { put }=await import("@vercel/blob");
    const response=await fetch(String(url));
    if(!response.ok) throw new Error(`Could not fetch generated video (${response.status}).`);
    const blob=await response.blob();
    const safe=(String(title||"viralmovie-film").replace(/[^a-z0-9-_]+/gi,"-").replace(/^-|-$/g,"").slice(0,80)||"viralmovie-film");
    const result=await put(`films/${Date.now()}-${safe}.mp4`,blob,{access:"public",token,contentType:"video/mp4",addRandomSuffix:false});
    return NextResponse.json({ok:true,url:result.url,pathname:result.pathname});
  }catch(e){return NextResponse.json({ok:false,message:e instanceof Error?e.message:"Publish failed."},{status:500});}
}
