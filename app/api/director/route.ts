import { NextResponse } from "next/server";

type Scene = { id:number; prompt:string };
export async function POST(req:Request){
  const b=await req.json().catch(()=>({}));
  const scenes:Array<Scene>=Array.isArray(b?.story?.scenes)?b.story.scenes:[];
  if(!scenes.length)return NextResponse.json({ok:false,error:"A movie story with scenes is required."},{status:400});
  const genre=String(b?.genre||"Cinematic");
  const audio=b?.audio||{};
  const plan:Record<number,unknown>={};
  for(const s of scenes){
    const n=s.id%12;
    const shot=n===1?"Wide establishing shot":n===6?"Medium character shot":n===0?"Close-up / emotional detail":"Cinematic medium-wide shot";
    const camera=n===1?"Slow dolly in":n===6?"Gentle handheld tracking":n===0?"Slow push-in close-up":"Controlled lateral camera move";
    const lighting=/horror|thriller/i.test(genre)?"Low-key contrast with motivated practical light":/comedy/i.test(genre)?"Bright natural cinematic light":"Dramatic cinematic lighting with soft subject separation";
    const pace=n===1?"Establish and breathe":n===6?"Build tension / reveal":"Continue with clean cause-and-effect";
    const transition=n===0?"Cut on action into the next beat":n===1?"Match cut / visual continuation":"Straight cinematic cut";
    const audioParts=[audio?.dialogue!==false?"dialogue":"no dialogue",audio?.narration!==false?"narration when useful":"no narration",audio?.music!==false?"original music":"no music",audio?.sfx!==false?"Foley + SFX":"no SFX"].join(", ");
    plan[s.id]={shot,camera,lighting,pace,transition,audio:audioParts};
  }
  return NextResponse.json({ok:true,plan,engine:"ViralMovie AI Director"});
}
