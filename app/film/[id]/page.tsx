"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function FilmPage(){
  const [url,setUrl]=useState("");
  const [title,setTitle]=useState("ViralMovie AI Film");
  const [trailer,setTrailer]=useState("");
  useEffect(()=>{
    try{
      const raw=localStorage.getItem("viralmovie-last-project");
      if(raw){const p=JSON.parse(raw);setTitle(p.story?.title||"ViralMovie AI Film");}
      const req=indexedDB.open("viralmovie-local",1);
      req.onsuccess=()=>{try{const db=req.result;const tx=db.transaction("films","readonly");const get=tx.objectStore("films").get("latest");get.onsuccess=()=>{if(get.result)setUrl(URL.createObjectURL(get.result));};}catch{}};
    }catch{}
  },[]);
  async function share(){const shareData={title, text:`Watch ${title} on ViralMovie AI`, url:location.href};try{if(navigator.share) await navigator.share(shareData);else await navigator.clipboard.writeText(location.href);}catch{}}
  return <main className="watch-page"><header className="watch-top"><Link href="/" className="stream-brand">🎬 <b>ViralMovie <span>AI</span></b></Link><Link href="/movies-online" className="secondary">Movies Online</Link></header>
    <section className="watch-shell"><div className="watch-kicker">VIRALMOVIE AI • FILM</div><h1>{title}</h1>{url?<video className="watch-video" src={url} controls playsInline/>:<div className="empty-publish"><h3>Film not available on this device</h3><p>Generate a film first. The current zero-cost prototype stores the rendered MP4 locally.</p></div>}
    <div className="button-row"><button className="hero-cta" onClick={share}>↗ Share Film</button><Link href="/" className="secondary">← Film Studio</Link></div>
    </section><footer className="footer">ViralMovie AI • Watch • Share • Create</footer></main>
}
