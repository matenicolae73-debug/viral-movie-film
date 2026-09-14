"use client";

import { useEffect, useState } from "react";

export default function OwnerPage() {
  const [token, setToken] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [message, setMessage] = useState("Checking owner access…");
  const [busy, setBusy] = useState(false);

  async function check() {
    const r = await fetch("/api/admin/status", { cache: "no-store" });
    const d = await r.json().catch(() => ({}));
    setLoggedIn(!!d.loggedIn);
    setMessage(d.loggedIn ? "Owner access is active on this browser." : "Owner login required.");
  }

  useEffect(() => { check(); }, []);

  async function login() {
    if (!token.trim()) { setMessage("Enter your Owner token."); return; }
    setBusy(true);
    const r = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token.trim() })
    });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setLoggedIn(false); setMessage(d.error || "Owner login failed."); return; }
    setToken("");
    setLoggedIn(true);
    setMessage("✅ Owner access enabled. You can now publish finished movies from Studio.");
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setLoggedIn(false);
    setMessage("Owner access logged out on this browser.");
  }

  return (
    <main style={{minHeight:"100vh",background:"#070b14",color:"#fff",padding:"24px 16px",fontFamily:"Inter,system-ui,sans-serif"}}>
      <div style={{maxWidth:720,margin:"0 auto"}}>
        <a href="/" style={{color:"#a5b4fc",textDecoration:"none"}}>← Back to ViralMovie AI</a>
        <div style={{marginTop:28,background:"#111827",border:"1px solid #263244",borderRadius:20,padding:24,boxShadow:"0 20px 60px rgba(0,0,0,.35)"}}>
          <div style={{fontSize:42}}>👑</div>
          <h1 style={{margin:"8px 0",fontSize:32}}>ViralMovie AI — Owner</h1>
          <p style={{color:"#aeb9ca",lineHeight:1.6}}>Private owner area. Only the person who knows the secret Owner token can unlock publishing to the public Movies catalog.</p>
          <div style={{margin:"20px 0",padding:14,borderRadius:12,background:loggedIn?"#10251b":"#21151a",border:"1px solid #334155"}}>{message}</div>
          {!loggedIn ? (
            <div style={{display:"grid",gap:12}}>
              <input type="password" value={token} onChange={e=>setToken(e.target.value)} onKeyDown={e=>{if(e.key==="Enter") login();}} placeholder="Owner publish token" autoComplete="current-password" style={{padding:14,borderRadius:12,border:"1px solid #475569",background:"#0b1220",color:"#fff",fontSize:16}} />
              <button onClick={login} disabled={busy} style={{padding:14,border:0,borderRadius:12,background:"#6366f1",color:"#fff",fontWeight:800,fontSize:16}}>{busy?"Checking…":"Unlock Owner"}</button>
            </div>
          ) : (
            <div style={{display:"grid",gap:12}}>
              <a href="/" style={{padding:14,borderRadius:12,background:"#6366f1",color:"#fff",textAlign:"center",textDecoration:"none",fontWeight:800}}>🎬 Go to Studio / Generate</a>
              <a href="/movies" style={{padding:14,borderRadius:12,background:"#1f2937",color:"#fff",textAlign:"center",textDecoration:"none",fontWeight:700}}>🎞️ Open Movies Catalog</a>
              <button onClick={logout} style={{padding:12,border:"1px solid #475569",borderRadius:12,background:"transparent",color:"#cbd5e1",fontWeight:700}}>Log out Owner</button>
            </div>
          )}
          <p style={{marginTop:22,color:"#7f8da3",fontSize:13,lineHeight:1.5}}>Never share your Owner token. It is stored server-side in Vercel and is never displayed here.</p>
        </div>
      </div>
    </main>
  );
}
