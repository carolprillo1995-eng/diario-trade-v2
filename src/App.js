import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import DiarioTrader from "./DiarioTrader";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [modo, setModo] = useState("login");
  const [loadingAuth, setLoadingAuth] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    setErro("");
    setLoadingAuth(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) setErro("Email ou senha incorretos.");
    setLoadingAuth(false);
  };

  const handleCadastro = async () => {
    setErro("");
    setLoadingAuth(true);
    const { error } = await supabase.auth.signUp({ email, password: senha });
    if (error) setErro(error.message);
    else setErro("✅ Verifique seu email para confirmar o cadastro!");
    setLoadingAuth(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) return (
    <div style={{minHeight:"100vh",background:"#070e1a",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{color:"#60a5fa",fontSize:16}}>⏳ Carregando...</div>
    </div>
  );

  if (user) return <DiarioTrader user={user} onLogout={handleLogout} />;

  return (
    <div style={{minHeight:"100vh",background:"#070e1a",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"system-ui,sans-serif"}}>
      <div style={{background:"#0d1f3c",border:"1px solid #1e3a5f",borderRadius:16,padding:"40px 36px",width:"100%",maxWidth:400,boxShadow:"0 25px 60px rgba(0,0,0,0.5)"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:40,marginBottom:12}}>📒</div>
          <h1 style={{fontSize:22,fontWeight:800,margin:0,background:"linear-gradient(135deg,#60a5fa,#93c5fd)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Diário de Trade</h1>
          <p style={{color:"#475569",fontSize:13,marginTop:6}}>Sua jornada de evolução começa aqui</p>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:24,background:"#070e1a",borderRadius:10,padding:4}}>
          <button onClick={()=>{setModo("login");setErro("");}} style={{flex:1,padding:"9px 0",borderRadius:8,border:"none",background:modo==="login"?"#1e3a5f":"transparent",color:modo==="login"?"#60a5fa":"#475569",fontWeight:700,fontSize:13,cursor:"pointer"}}>Entrar</button>
          <button onClick={()=>{setModo("cadastro");setErro("");}} style={{flex:1,padding:"9px 0",borderRadius:8,border:"none",background:modo==="cadastro"?"#1e3a5f":"transparent",color:modo==="cadastro"?"#60a5fa":"#475569",fontWeight:700,fontSize:13,cursor:"pointer"}}>Criar Conta</button>
        </div>
        <div style={{marginBottom:16}}>
          <label style={{display:"block",color:"#94a3b8",fontSize:12,fontWeight:600,marginBottom:6}}>EMAIL</label>
          <input type="email" placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(modo==="login"?handleLogin():handleCadastro())}
            style={{width:"100%",background:"#070e1a",border:"1px solid #1e3a5f",borderRadius:8,color:"#e2e8f0",padding:"11px 14px",fontSize:14,outline:"none",boxSizing:"border-box"}}/>
        </div>
        <div style={{marginBottom:24}}>
          <label style={{display:"block",color:"#94a3b8",fontSize:12,fontWeight:600,marginBottom:6}}>SENHA</label>
          <input type="password" placeholder="••••••••" value={senha} onChange={e=>setSenha(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(modo==="login"?handleLogin():handleCadastro())}
            style={{width:"100%",background:"#070e1a",border:"1px solid #1e3a5f",borderRadius:8,color:"#e2e8f0",padding:"11px 14px",fontSize:14,outline:"none",boxSizing:"border-box"}}/>
        </div>
        {erro&&(
          <div style={{marginBottom:16,padding:"10px 14px",borderRadius:8,background:erro.startsWith("✅")?"#14532d22":"#7f1d1d22",border:`1px solid ${erro.startsWith("✅")?"#22c55e44":"#ef444444"}`,color:erro.startsWith("✅")?"#4ade80":"#f87171",fontSize:13}}>
            {erro}
          </div>
        )}
        <button onClick={modo==="login"?handleLogin:handleCadastro} disabled={loadingAuth||!email||!senha}
          style={{width:"100%",padding:"13px 0",borderRadius:10,border:"none",background:loadingAuth||!email||!senha?"#1e3a5f":"linear-gradient(135deg,#3b82f6,#1d4ed8)",color:loadingAuth||!email||!senha?"#475569":"#fff",fontSize:15,fontWeight:700,cursor:loadingAuth||!email||!senha?"not-allowed":"pointer",boxShadow:"0 4px 15px rgba(59,130,246,0.3)"}}>
          {loadingAuth?"⏳ Aguarde...":(modo==="login"?"🔐 Entrar":"✨ Criar Conta")}
        </button>
      </div>
    </div>
  );
}
