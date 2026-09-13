"use client";

import { useEffect, useState } from "react";

export default function OwnerPage() {
  const [token, setToken] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [message, setMessage] = useState("Checking secure owner access…");
  const [busy, setBusy] = useState(false);

  async function check() {
    const r = await fetch("/api/admin/status", { cache: "no-store" });
    const d = await r.json().catch(() => ({}));
    setLoggedIn(!!d.loggedIn);
    setMessage(d.loggedIn ? "Owner access is active on this browser." : "Owner authentication required.");
  }

  useEffect(() => { check(); }, []);

  async function login() {
    if (!token.trim()) { setMessage("Enter your Owner publish token."); return; }
    setBusy(true);
    const r = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token.trim() })
    });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setLoggedIn(false); setMessage(d.error || "Owner authentication failed."); return; }
    setToken("");
    setLoggedIn(true);
    setMessage("✓ Owner access verified. Publishing is now enabled on this browser.");
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setLoggedIn(false);
    setMessage("Owner access signed out on this browser.");
  }

  return (
    <main style={{minHeight:"100vh",background:"#070b14",color:"#fff",padding:"24px 16px",fontFamily:"Inter,system-ui,sans-serif"}}>
      <div style={{maxWidth:760,margin:"0 auto"}}>
        <a href="/" style={{color:"#a5b4fc",textDecoration:"none"}}>← Back to ViralMovie AI</a>
        <div style={{marginTop:28,background:"linear-gradient(145deg,#111827,#0b1220)",border:"1px solid #263244",borderRadius:22,padding:28,boxShadow:"0 20px 60px rgba(0,0,0,.35)"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:10,padding:"7px 11px",borderRadius:999,border:"1px solid rgba(139,92,246,.35)",background:"rgba(99,102,241,.1)",color:"#c4b5fd",fontSize:11,fontWeight:900,letterSpacing:".12em"}}>OWNER ADMIN · PRIVATE</div>
          <div style={{fontSize:42,marginTop:16}}>👑</div>
          <h1 style={{margin:"8px 0",fontSize:34}}>Owner Control Center</h1>
          <p style={{color:"#aeb9ca",lineHeight:1.65}}>This private area controls publishing to the public Movies catalog. Only the owner who successfully authenticates with the server-side Owner publish token can unlock publishing.</p>
          <div style={{margin:"22px 0",padding:15,borderRadius:14,background:loggedIn?"#10251b":"#21151a",border:"1px solid #334155",color:"#dbe4f0"}}>{message}</div>
          {!loggedIn ? (
            <div style={{display:"grid",gap:12}}>
              <input type="password" value={token} onChange={e=>setToken(e.target.value)} onKeyDown={e=>{if(e.key==="Enter") login();}} placeholder="Owner publish token" autoComplete="current-password" style={{padding:14,borderRadius:12,border:"1px solid #475569",background:"#0b1220",color:"#fff",fontSize:16}} />
              <button onClick={login} disabled={busy} style={{padding:14,border:0,borderRadius:12,background:"linear-gradient(100deg,#8b5cf6,#2563eb)",color:"#fff",fontWeight:900,fontSize:16}}>{busy?"Verifying…":"Unlock Owner Publishing"}</button>
            </div>
          ) : (
            <div style={{display:"grid",gap:12}}>
              <div style={{padding:14,borderRadius:12,background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.25)",color:"#b7f7d2",fontWeight:800}}>✓ Authenticated owner · Public publishing unlocked</div>
              <a href="/" style={{padding:14,borderRadius:12,background:"linear-gradient(100deg,#8b5cf6,#2563eb)",color:"#fff",textAlign:"center",textDecoration:"none",fontWeight:900}}>🎬 Open Studio / Create Film</a>
              <a href="/movies" style={{padding:14,borderRadius:12,background:"#1f2937",color:"#fff",textAlign:"center",textDecoration:"none",fontWeight:800}}>🍿 Open Public Movies</a>
              <button onClick={logout} style={{padding:12,border:"1px solid #475569",borderRadius:12,background:"transparent",color:"#cbd5e1",fontWeight:700}}>Sign Out Owner</button>
            </div>
          )}
          <div style={{marginTop:24,padding:15,borderRadius:14,background:"rgba(255,255,255,.025)",border:"1px solid rgba(255,255,255,.07)",color:"#7f8da3",fontSize:13,lineHeight:1.6}}>🔐 Publishing is protected server-side. The Owner token is never displayed after authentication and is required before a movie can be added to the public catalog.</div>
        </div>
      </div>
    </main>
  );
}
