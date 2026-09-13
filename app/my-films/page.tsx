"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function MyFilms(){
  const [hasFilm,setHasFilm]=useState(false);
  useEffect(()=>{try{const raw=localStorage.getItem("viralmovie-last-project");setHasFilm(!!raw)}catch{}},[]);
  return <main className="simple-page">
    <Link href="/">← ViralMovie AI</Link>
    <h1>My Films</h1>
    <div className="simple-card">
      <h2>🎞️ Your Films</h2>
      <p>{hasFilm ? "Your latest project is saved on this device. Open it to preview or continue working." : "No film has been created on this device yet."}</p>
      <div className="button-row"><Link href="/" className="hero-cta">Create Film →</Link><Link href="/movies-online" className="secondary">Movies Online</Link></div>
    </div>
  </main>
}
