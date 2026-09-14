"use client";
import { useEffect, useState } from "react";

export default function WatchClient({movie}:{movie:any}){
  const [views,setViews]=useState(Number(movie?.views||0));
  const [likes,setLikes]=useState(Number(movie?.likes||0));
  const [liked,setLiked]=useState(false);
  const [message,setMessage]=useState("");
  useEffect(()=>{
    try{setLiked(localStorage.getItem(`vm-liked-${movie.slug}`)==="1");}catch{}
    fetch(`/api/movies/${encodeURIComponent(movie.slug)}/engagement`,{cache:"no-store"}).then(r=>r.json()).then(d=>{if(d?.ok){setViews(Number(d.views||0));setLikes(Number(d.likes||0));}}).catch(()=>{});
    try{
      const key=`vm-viewed-${movie.slug}`;
      if(sessionStorage.getItem(key)!==new Date().toISOString().slice(0,10)){
        sessionStorage.setItem(key,new Date().toISOString().slice(0,10));
        fetch(`/api/movies/${encodeURIComponent(movie.slug)}/engagement`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"view"})}).then(r=>r.json()).then(d=>{if(d?.ok)setViews(Number(d.views||0));}).catch(()=>{});
      }
    }catch{}
  },[movie.slug]);
  async function like(){
    if(liked)return;
    try{localStorage.setItem(`vm-liked-${movie.slug}`,"1");}catch{}
    setLiked(true); setLikes(x=>x+1);
    try{const r=await fetch(`/api/movies/${encodeURIComponent(movie.slug)}/engagement`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"like"})});const d=await r.json();if(d?.ok)setLikes(Number(d.likes||0));else throw new Error();}catch{setLikes(x=>Math.max(0,x-1));setLiked(false);try{localStorage.removeItem(`vm-liked-${movie.slug}`);}catch{}setMessage("Like could not be saved. Try again.");}
  }
  async function share(){
    const url=window.location.href;
    try{if(navigator.share)await navigator.share({title:movie.title,text:"Watch this AI movie on ViralMovie AI",url});else{await navigator.clipboard.writeText(url);setMessage("Movie link copied.");}}catch{}
  }
  return <section className="watch-page">
    <span className="ai-badge">AI GENERATED · CURATED</span>
    <h1>{movie.title}</h1><p>{movie.description}</p>
    {movie.trailerUrl&&<div className="watch-trailer"><div className="watch-label">🎞 TRAILER</div><video controls playsInline preload="metadata" src={movie.trailerUrl}/></div>}
    <video controls playsInline preload="metadata" src={movie.videoUrl}/>
    <div className="watch-stats"><span>👁 {views.toLocaleString()} views</span><span>❤️ {likes.toLocaleString()} likes</span></div>
    <div className="watch-actions"><a href="/movies" className="watch">← Back to Movies</a><button onClick={like} className={liked?"liked":""}>{liked?"♥ Liked":"♡ Like"}</button><button onClick={share}>↗ Share</button></div>
    {movie.posterUrl&&<img className="watch-poster" src={movie.posterUrl} alt={`${movie.title} poster`}/>}<small>Published {new Date(movie.publishedAt).toLocaleDateString('en-US')}</small>{message&&<div className="info-box">{message}</div>}
  </section>;
}
