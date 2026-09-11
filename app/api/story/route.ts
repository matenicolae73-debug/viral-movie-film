import { NextResponse } from "next/server";
export async function POST(req: Request) {
 const b=await req.json().catch(()=>({})); const idea=String(b?.idea||"").trim(); const genre=String(b?.genre||"Cinematic"); const minutes=Number(b?.minutes||1);
 if(!idea)return NextResponse.json({error:"Idea is required."},{status:400});
 const count=Math.max(12,Math.round(minutes*12));
 const beats=["Opening shot establishes the world and the main character.","The character discovers a mystery that changes the direction of the story.","A major obstacle appears and raises the stakes.","The character follows a dangerous clue into an unknown location.","A surprising revelation changes what the character believes.","The conflict reaches a critical point.","The character makes a decisive choice.","The story moves toward its final confrontation.","The mystery is finally revealed.","The character faces the consequences of the choice.","The emotional resolution begins.","Final cinematic shot leaves a memorable ending."];
 const scenes=Array.from({length:count},(_,i)=>({id:i+1,title:`Scene ${i+1}`,prompt:`${genre} cinematic scene. ${beats[i%beats.length]} Story premise: ${idea}`,duration:5}));
 return NextResponse.json({ok:true,title:"Untitled ViralMovie",logline:`A ${genre.toLowerCase()} movie built from: ${idea}`,sceneCount:count,scenes});
}
