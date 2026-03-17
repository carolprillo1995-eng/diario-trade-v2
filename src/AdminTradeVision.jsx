/**
 * AdminTradeVision.jsx
 * Painel administrativo para gerenciar acessos do TradeVision PRO
 * Uso: adicione este componente em uma rota protegida /admin
 * Só você (thiagozacca@gmail.com) deve ter acesso.
 */

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://qqgoojzlhczfexqlgvpe.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxZ29vanpsaGN6ZmV4cWxndnBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2ODM0ODQsImV4cCI6MjA4ODI1OTQ4NH0.C_rElTl676HaMHzkrJMPAkcm58edODGSJzvpu4xaDa0";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ─── Gerar código único TV-XXXXX ────────────────────────────────────────────
function gerarCodigo() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "TV-";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ─── Formatar data BR ────────────────────────────────────────────────────────
const fmtData = (iso) => iso ? new Date(iso).toLocaleDateString("pt-BR") : "—";
const fmtDias = (iso) => {
  if (!iso) return "—";
  const d = Math.ceil((new Date(iso) - new Date()) / 86400000);
  if (d < 0) return <span style={{color:"#f87171"}}>Expirado há {Math.abs(d)}d</span>;
  return <span style={{color:"#4ade80"}}>{d}d restantes</span>;
};

// ─── STATUS BADGE ────────────────────────────────────────────────────────────
function Badge({status}) {
  const map = {
    pago:       {bg:"#22c55e18",border:"#22c55e44",color:"#4ade80",label:"✓ PAGO"},
    trial:      {bg:"#f59e0b18",border:"#f59e0b44",color:"#fbbf24",label:"⏱ TRIAL"},
    aguardando: {bg:"#3b82f618",border:"#3b82f644",color:"#60a5fa",label:"⏳ AGUARDANDO"},
    bloqueado:  {bg:"#ef444418",border:"#ef444444",color:"#f87171",label:"🔒 BLOQUEADO"},
  };
  const s = map[status] || map.aguardando;
  return (
    <span style={{background:s.bg,border:`1px solid ${s.border}`,borderRadius:999,
      padding:"2px 9px",color:s.color,fontSize:10,fontWeight:700,whiteSpace:"nowrap"}}>
      {s.label}
    </span>
  );
}

// ─── TOAST ───────────────────────────────────────────────────────────────────
function Toast({msg, type, onClose}) {
  useEffect(()=>{ const t=setTimeout(onClose,3500); return()=>clearTimeout(t); },[onClose]);
  return (
    <div style={{position:"fixed",bottom:24,right:24,zIndex:9999,
      background:type==="error"?"#1a0505":"#051a0a",
      border:`1px solid ${type==="error"?"#ef444444":"#22c55e44"}`,
      borderRadius:12,padding:"12px 20px",color:type==="error"?"#f87171":"#4ade80",
      fontWeight:700,fontSize:13,boxShadow:"0 8px 32px #00000088",maxWidth:360}}>
      {msg}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function AdminTradeVision() {
  // ── Auth admin ──
  const [adminOk, setAdminOk] = useState(false);
  const [adminSenha, setAdminSenha] = useState("");
  const [validandoAdmin, setValidandoAdmin] = useState(false);

  // ── Estado ──
  const [planos, setPlanos] = useState([]);
  const [codigos, setCodigos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [aba, setAba] = useState("gerar"); // gerar | planos | codigos | usuarios

  // ── Formulário gerar código ──
  const [fEmail, setFEmail] = useState("");
  const [fDias, setFDias] = useState("30");
  const [fObs, setFObs] = useState("");
  const [codigoGerado, setCodigoGerado] = useState(null);

  // ── Formulário liberar direto ──
  const [lEmail, setLEmail] = useState("");
  const [lDias, setLDias] = useState("30");
  const [nEmail, setNEmail] = useState("");
  const [nSenha, setNSenha] = useState("");
  const [nDias, setNDias] = useState("15");
  const [criandoConta, setCriandoConta] = useState(false);

  const showToast = useCallback((msg, type="success") => setToast({msg,type}), []);

  // ── Carregar usuários via Edge Function ──
  const carregarUsuarios = useCallback(async () => {
    setLoadingUsuarios(true);
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/admin-usuarios`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ adminToken: adminSenha }),
      });
      const json = await r.json();
      if (json.ok) setUsuarios(json.usuarios || []);
      else showToast("Erro: " + json.error, "error");
    } catch(e) {
      showToast("Erro ao buscar usuários: " + e.message, "error");
    }
    setLoadingUsuarios(false);
  }, [adminSenha, showToast]);

  // ── Carregar dados ──
  const carregar = useCallback(async () => {
    setLoading(true);
    const [{data:p},{data:c}] = await Promise.all([
      supabase.from("planos").select("*").order("created_at",{ascending:false}),
      supabase.from("codigos_ativacao").select("*").order("criado_em",{ascending:false}),
    ]);
    setPlanos(p || []);
    setCodigos(c || []);
    setLoading(false);
  }, []);

  useEffect(()=>{ if(adminOk) carregar(); },[adminOk, carregar]);

  // ── Gerar código vinculado a email ──
  const handleGerarCodigo = async () => {
    if(!fEmail.trim()) { showToast("Informe o email da pessoa","error"); return; }
    const codigo = gerarCodigo();
    const expiraCodigo = new Date(Date.now() + 7*86400000); // código expira em 7 dias se não usado
    const {error} = await supabase.from("codigos_ativacao").insert({
      codigo,
      email_destino: fEmail.trim().toLowerCase(),
      email_usado: null,
      usado: false,
      dias_acesso: parseInt(fDias)||30,
      criado_em: new Date().toISOString(),
      expira_em: expiraCodigo.toISOString(),
      observacao: fObs||null,
    });
    if(error) { showToast("Erro: "+error.message,"error"); return; }
    setCodigoGerado({codigo, email:fEmail, dias:fDias});
    setFEmail(""); setFObs("");
    carregar();
    showToast(`Código ${codigo} gerado para ${fEmail}`);
  };

  // ── Liberar acesso direto (sem código) ──
  const handleLiberarDireto = async () => {
    if(!lEmail.trim()) { showToast("Informe o email","error"); return; }
    const expira = new Date(Date.now() + (parseInt(lDias)||30)*86400000);
    const {error} = await supabase.from("planos").upsert({
      email: lEmail.trim().toLowerCase(),
      status: "pago",
      data_inicio: new Date().toISOString(),
      data_expiracao: expira.toISOString(),
      observacao: `Liberado pelo admin em ${new Date().toLocaleDateString("pt-BR")}`,
    },{onConflict:"email"});
    if(error) { showToast("Erro: "+error.message,"error"); return; }
    setLEmail(""); setLDias("30");
    carregar();
    showToast(`✅ Acesso liberado para ${lEmail} por ${lDias} dias!`);
  };

  const handleCriarConta = async () => {
    const email = nEmail.trim().toLowerCase();
    const senha = nSenha;
    const dias = parseInt(nDias, 10) || 15;

    if(!email || !email.includes("@")) { showToast("Informe um email válido","error"); return; }
    if(!senha || senha.length < 6) { showToast("Senha deve ter pelo menos 6 caracteres","error"); return; }
    if(dias <= 0) { showToast("Informe dias de acesso válidos","error"); return; }

    setCriandoConta(true);
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/admin-usuarios`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          adminToken: adminSenha,
          action: "create_user",
          email,
          password: senha,
          accessDays: dias,
        }),
      });

      const raw = await r.text();
      let json = {};
      try {
        json = raw ? JSON.parse(raw) : {};
      } catch {
        json = { error: raw || "Resposta inválida do servidor" };
      }

      if (!r.ok || !json.ok) {
        const msg = json.error || json.message || `HTTP ${r.status}`;
        showToast("Erro ao criar conta: " + msg, "error");
        return;
      }

      setNEmail("");
      setNSenha("");
      setNDias("15");
      showToast(`✅ Conta criada para ${email} com ${dias} dias`);
      carregar();
      if (aba === "usuarios") carregarUsuarios();
    } catch (e) {
      showToast("Erro ao criar conta: " + e.message, "error");
    } finally {
      setCriandoConta(false);
    }
  };

  // ── Bloquear plano ──
  const handleBloquear = async (email) => {
    if(!window.confirm(`Bloquear acesso de ${email}?`)) return;
    await supabase.from("planos").update({status:"bloqueado"}).eq("email",email);
    carregar();
    showToast(`🔒 ${email} bloqueado`);
  };

  // ── Renovar plano (+30 dias) ──
  const handleRenovar = async (pl) => {
    const base = pl.data_expiracao && new Date(pl.data_expiracao) > new Date()
      ? new Date(pl.data_expiracao) : new Date();
    const nova = new Date(base.getTime() + 30*86400000);
    await supabase.from("planos").update({
      status:"pago", data_expiracao: nova.toISOString()
    }).eq("email", pl.email);
    carregar();
    showToast(`✅ ${pl.email} renovado até ${fmtData(nova.toISOString())}`);
  };

  // ── Revogar código ──
  const handleRevogarCodigo = async (id, codigo) => {
    if(!window.confirm(`Revogar código ${codigo}?`)) return;
    await supabase.from("codigos_ativacao").update({
      expira_em: new Date(0).toISOString()
    }).eq("id", id);
    carregar();
    showToast(`Código ${codigo} revogado`);
  };

  // ═══════════════════════════════════════════
  // TELA DE LOGIN ADMIN
  // ═══════════════════════════════════════════
  async function validarAdmin() {
    if (!adminSenha) { alert("Informe a senha"); return; }
    setValidandoAdmin(true);
    try {
      // Chama função backend protegida (Supabase Function/API)
      const r = await fetch(`${SUPABASE_URL}/functions/v1/admin-usuarios`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ action: "validate_admin", adminToken: adminSenha }),
      });
      const json = await r.json();
      if (json.ok) setAdminOk(true);
      else alert("Senha incorreta ou validação falhou");
    } catch(e) {
      alert("Erro ao validar admin: " + e.message);
    }
    setValidandoAdmin(false);
  }

  if (!adminOk) return (
    <div style={{minHeight:"100vh",background:"#000",display:"flex",alignItems:"center",
      justifyContent:"center",fontFamily:"'Segoe UI',sans-serif"}}>
      <div style={{background:"#080808",border:"1px solid #1a1a1a",borderRadius:20,
        padding:"40px",width:340,textAlign:"center"}}>
        <div style={{fontSize:36,marginBottom:12}}>🛡️</div>
        <div style={{fontSize:22,fontWeight:900,color:"#c9a227",marginBottom:4}}>Admin Panel</div>
        <div style={{color:"#555",fontSize:12,marginBottom:28}}>TradeVision PRO</div>
        <input
          type="password"
          placeholder="Senha de administrador"
          value={adminSenha}
          onChange={e=>setAdminSenha(e.target.value)}
          onKeyDown={async e=>{
            if(e.key==="Enter") await validarAdmin();
          }}
          style={{width:"100%",background:"#111",border:"1px solid #222",borderRadius:8,
            color:"#fff",padding:"12px 14px",fontSize:14,boxSizing:"border-box",marginBottom:12,outline:"none"}}
        />
        <button
          onClick={validarAdmin}
          disabled={validandoAdmin}
          style={{width:"100%",background:"linear-gradient(135deg,#c9a227,#b8860b)",border:"none",
            borderRadius:8,color:"#000",fontWeight:800,fontSize:14,padding:"12px",cursor:"pointer",opacity:validandoAdmin?0.7:1}}>
          {validandoAdmin ? "Validando..." : "Entrar"}
        </button>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════
  // PAINEL ADMIN
  // ═══════════════════════════════════════════
  const inp = {
    background:"#111",border:"1px solid #222",borderRadius:8,color:"#fff",
    padding:"10px 12px",fontSize:13,outline:"none",width:"100%",boxSizing:"border-box"
  };
  const btn = (bg,color="#fff") => ({
    background:bg,border:"none",borderRadius:8,color,fontWeight:700,
    fontSize:12,padding:"9px 16px",cursor:"pointer",whiteSpace:"nowrap"
  });

  return (
    <div style={{minHeight:"100vh",background:"#000",fontFamily:"'Segoe UI',sans-serif",color:"#fff"}}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}

      {/* ── Header ── */}
      <div style={{background:"#050505",borderBottom:"1px solid #1a1a1a",
        padding:"14px 32px",display:"flex",justifyContent:"space-between",alignItems:"center",
        position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:20}}>🛡️</span>
          <div>
            <div style={{fontWeight:900,fontSize:16,color:"#c9a227"}}>TradeVision Admin</div>
            <div style={{fontSize:10,color:"#555"}}>Painel de Gerenciamento de Acessos</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{background:"#22c55e18",border:"1px solid #22c55e33",borderRadius:8,
            padding:"4px 12px",color:"#4ade80",fontSize:11,fontWeight:700}}>
            {planos.filter(p=>p.status==="pago"&&new Date(p.data_expiracao)>new Date()).length} ativos
          </div>
          <button onClick={carregar} style={{...btn("#1a1a1a"),border:"1px solid #333"}}>
            {loading?"⏳":"🔄"} Atualizar
          </button>
          <button onClick={()=>setAdminOk(false)} style={{...btn("transparent"),border:"1px solid #222",color:"#555"}}>
            Sair
          </button>
        </div>
      </div>

      {/* ── Stats rápidas ── */}
      <div style={{padding:"16px 32px",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        {[
          {label:"Ativos",val:planos.filter(p=>p.status==="pago"&&new Date(p.data_expiracao)>new Date()).length,color:"#4ade80"},
          {label:"Trial",val:planos.filter(p=>p.status==="trial"&&new Date(p.data_expiracao)>new Date()).length,color:"#fbbf24"},
          {label:"Expirados",val:planos.filter(p=>p.data_expiracao&&new Date(p.data_expiracao)<new Date()).length,color:"#f87171"},
          {label:"Códigos ativos",val:codigos.filter(c=>!c.usado&&new Date(c.expira_em)>new Date()).length,color:"#a78bfa"},
        ].map(s=>(
          <div key={s.label} style={{background:"#080808",border:"1px solid #1a1a1a",borderRadius:12,padding:"16px 18px"}}>
            <div style={{color:"#555",fontSize:10,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>{s.label}</div>
            <div style={{color:s.color,fontWeight:900,fontSize:28}}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* ── Abas ── */}
      <div style={{padding:"0 32px",display:"flex",gap:4,marginBottom:20}}>
        {[
          {id:"gerar",label:"➕ Gerar Código / Liberar"},
          {id:"planos",label:`👥 Planos (${planos.length})`},
          {id:"codigos",label:`🔑 Códigos (${codigos.length})`},
          {id:"usuarios",label:`🟢 Usuários (${usuarios.length})`},
        ].map(a=>(
          <button key={a.id} onClick={()=>{ setAba(a.id); if(a.id==="usuarios") carregarUsuarios(); }}
            style={{background:aba===a.id?"#c9a22720":"transparent",
              border:`1px solid ${aba===a.id?"#c9a22766":"#1a1a1a"}`,
              borderRadius:8,color:aba===a.id?"#c9a227":"#555",
              padding:"8px 16px",cursor:"pointer",fontSize:12,fontWeight:700}}>
            {a.label}
          </button>
        ))}
      </div>

      <div style={{padding:"0 32px 40px"}}>

        {/* ════ ABA: GERAR / LIBERAR ════ */}
        {aba==="gerar"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>

            {/* Gerar código para email específico */}
            <div style={{background:"#080808",border:"1px solid #1a1a1a",borderRadius:16,padding:"24px"}}>
              <div style={{color:"#c9a227",fontWeight:800,fontSize:14,marginBottom:4}}>🔑 Gerar Código de Ativação</div>
              <div style={{color:"#555",fontSize:12,marginBottom:20}}>
                Gera um código único <strong style={{color:"#888"}}>TV-XXXXXX</strong> vinculado ao email.<br/>
                Só funciona para aquele email. Expira em 7 dias se não usado.
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div>
                  <div style={{color:"#777",fontSize:11,fontWeight:600,marginBottom:5}}>EMAIL DA PESSOA</div>
                  <input style={inp} placeholder="cliente@gmail.com" value={fEmail}
                    onChange={e=>setFEmail(e.target.value)}/>
                </div>
                <div>
                  <div style={{color:"#777",fontSize:11,fontWeight:600,marginBottom:5}}>DIAS DE ACESSO</div>
                  <div style={{display:"flex",gap:6}}>
                    {["15","30","60","90","365"].map(d=>(
                      <button key={d} onClick={()=>setFDias(d)}
                        style={{flex:1,padding:"8px 0",background:fDias===d?"#c9a22720":"#111",
                          border:`1px solid ${fDias===d?"#c9a22766":"#222"}`,borderRadius:6,
                          color:fDias===d?"#c9a227":"#666",cursor:"pointer",fontWeight:700,fontSize:12}}>
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{color:"#777",fontSize:11,fontWeight:600,marginBottom:5}}>OBSERVAÇÃO (opcional)</div>
                  <input style={inp} placeholder="ex: Plano mensal pago em 10/03" value={fObs}
                    onChange={e=>setFObs(e.target.value)}/>
                </div>
                <button onClick={handleGerarCodigo}
                  style={{...btn("linear-gradient(135deg,#c9a227,#b8860b)","#000"),padding:"12px",fontSize:13,borderRadius:10}}>
                  ✨ Gerar Código
                </button>
              </div>

              {/* Código gerado */}
              {codigoGerado&&(
                <div style={{marginTop:20,background:"#0a1a0a",border:"2px solid #22c55e44",borderRadius:12,padding:"16px",textAlign:"center"}}>
                  <div style={{color:"#4ade80",fontSize:12,fontWeight:700,marginBottom:8}}>✅ Código gerado! Envie para {codigoGerado.email}:</div>
                  <div style={{fontFamily:"monospace",fontSize:28,fontWeight:900,color:"#fff",
                    letterSpacing:3,background:"#111",borderRadius:8,padding:"12px",marginBottom:8}}>
                    {codigoGerado.codigo}
                  </div>
                  <div style={{color:"#555",fontSize:11,marginBottom:10}}>
                    Válido para <strong style={{color:"#aaa"}}>{codigoGerado.email}</strong> · {codigoGerado.dias} dias de acesso
                  </div>
                  <button
                    onClick={()=>{
                      const msg = `Olá! Aqui está seu código de ativação do *TradeVision PRO*:\n\n*${codigoGerado.codigo}*\n\nValidade: ${codigoGerado.dias} dias de acesso\n\nComo usar: abra o TradeVision → clique em "Inserir Código de Ativação" → cole o código acima.\n\nQualquer dúvida, fale comigo! 😊`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`,"_blank");
                    }}
                    style={{...btn("#25D366"),padding:"10px 20px",borderRadius:8}}>
                    📱 Enviar pelo WhatsApp
                  </button>
                </div>
              )}
            </div>

            {/* Liberar acesso direto */}
            <div style={{background:"#080808",border:"1px solid #1a1a1a",borderRadius:16,padding:"24px"}}>
              <div style={{color:"#60a5fa",fontWeight:800,fontSize:14,marginBottom:4}}>⚡ Liberar Acesso Direto</div>
              <div style={{color:"#555",fontSize:12,marginBottom:20}}>
                Libera acesso sem precisar de código.<br/>
                Ideal para quem você já conhece ou pagamento confirmado.
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div>
                  <div style={{color:"#777",fontSize:11,fontWeight:600,marginBottom:5}}>EMAIL DA PESSOA</div>
                  <input style={inp} placeholder="cliente@gmail.com" value={lEmail}
                    onChange={e=>setLEmail(e.target.value)}/>
                </div>
                <div>
                  <div style={{color:"#777",fontSize:11,fontWeight:600,marginBottom:5}}>DIAS DE ACESSO</div>
                  <div style={{display:"flex",gap:6}}>
                    {["15","30","60","90","365"].map(d=>(
                      <button key={d} onClick={()=>setLDias(d)}
                        style={{flex:1,padding:"8px 0",background:lDias===d?"#3b82f620":"#111",
                          border:`1px solid ${lDias===d?"#3b82f666":"#222"}`,borderRadius:6,
                          color:lDias===d?"#60a5fa":"#666",cursor:"pointer",fontWeight:700,fontSize:12}}>
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={handleLiberarDireto}
                  style={{...btn("linear-gradient(135deg,#1d4ed8,#2563eb)"),padding:"12px",fontSize:13,borderRadius:10,marginTop:4}}>
                  🚀 Liberar Acesso Agora
                </button>
              </div>

              {/* Dica */}
              <div style={{marginTop:20,background:"#0a0a0a",border:"1px solid #1a1a1a",borderRadius:10,padding:"14px"}}>
                <div style={{color:"#555",fontSize:11,fontWeight:700,marginBottom:8}}>💡 QUANDO USAR CADA UM</div>
                <div style={{color:"#444",fontSize:11,lineHeight:1.7}}>
                  <strong style={{color:"#666"}}>Gerar código:</strong> pessoa paga, você gera, ela ativa sozinha pelo app<br/>
                  <strong style={{color:"#666"}}>Liberar direto:</strong> você tem certeza do email, quer liberar na hora
                </div>
              </div>
            </div>

            <div style={{background:"#080808",border:"1px solid #1a1a1a",borderRadius:16,padding:"24px"}}>
              <div style={{color:"#a78bfa",fontWeight:800,fontSize:14,marginBottom:4}}>👤 Criar Conta de Usuário</div>
              <div style={{color:"#555",fontSize:12,marginBottom:20}}>
                Cria conta com email e senha pelo painel admin.<br/>
                A conta já nasce confirmada e pronta para login.
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div>
                  <div style={{color:"#777",fontSize:11,fontWeight:600,marginBottom:5}}>EMAIL</div>
                  <input
                    style={inp}
                    placeholder="usuario@gmail.com"
                    value={nEmail}
                    onChange={e=>setNEmail(e.target.value)}
                  />
                </div>
                <div>
                  <div style={{color:"#777",fontSize:11,fontWeight:600,marginBottom:5}}>SENHA</div>
                  <input
                    style={inp}
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={nSenha}
                    onChange={e=>setNSenha(e.target.value)}
                  />
                </div>
                <div>
                  <div style={{color:"#777",fontSize:11,fontWeight:600,marginBottom:5}}>DIAS DE ACESSO</div>
                  <div style={{display:"flex",gap:6}}>
                    {["15","30","60","90"].map(d=>(
                      <button key={d} onClick={()=>setNDias(d)}
                        style={{flex:1,padding:"8px 0",background:nDias===d?"#8b5cf620":"#111",
                          border:`1px solid ${nDias===d?"#8b5cf666":"#222"}`,borderRadius:6,
                          color:nDias===d?"#c4b5fd":"#666",cursor:"pointer",fontWeight:700,fontSize:12}}>
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleCriarConta}
                  disabled={criandoConta}
                  style={{
                    ...btn("linear-gradient(135deg,#8b5cf6,#7c3aed)"),
                    padding:"12px",
                    fontSize:13,
                    borderRadius:10,
                    opacity: criandoConta ? 0.7 : 1,
                    cursor: criandoConta ? "not-allowed" : "pointer"
                  }}
                >
                  {criandoConta ? "Criando conta..." : "➕ Criar Conta"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════ ABA: PLANOS ════ */}
        {aba==="planos"&&(
          <div style={{background:"#080808",border:"1px solid #1a1a1a",borderRadius:16,overflow:"hidden"}}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid #1a1a1a",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontWeight:700,fontSize:14,color:"#c9a227"}}>👥 Todos os Planos</div>
              <div style={{color:"#555",fontSize:11}}>{planos.length} registros</div>
            </div>
            {loading ? (
              <div style={{padding:40,textAlign:"center",color:"#555"}}>Carregando...</div>
            ) : planos.length===0 ? (
              <div style={{padding:40,textAlign:"center",color:"#555"}}>Nenhum plano cadastrado</div>
            ) : (
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead>
                    <tr style={{background:"#0a0a0a"}}>
                      {["Email","Status","Início","Expira","Restantes","Obs","Ações"].map(h=>(
                        <th key={h} style={{padding:"10px 14px",color:"#555",fontWeight:700,
                          fontSize:10,textAlign:"left",borderBottom:"1px solid #1a1a1a",
                          textTransform:"uppercase",whiteSpace:"nowrap"}}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {planos.map((p,i)=>(
                      <tr key={p.id} style={{background:i%2===0?"transparent":"#0a0a0a0a",
                        borderBottom:"1px solid #1a1a1a11"}}>
                        <td style={{padding:"10px 14px",color:"#ccc",fontWeight:600}}>{p.email}</td>
                        <td style={{padding:"10px 14px"}}><Badge status={p.status}/></td>
                        <td style={{padding:"10px 14px",color:"#666"}}>{fmtData(p.data_inicio)}</td>
                        <td style={{padding:"10px 14px",color:"#666"}}>{fmtData(p.data_expiracao)}</td>
                        <td style={{padding:"10px 14px"}}>{fmtDias(p.data_expiracao)}</td>
                        <td style={{padding:"10px 14px",color:"#555",fontSize:10,maxWidth:150,
                          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                          {p.observacao||"—"}
                        </td>
                        <td style={{padding:"10px 14px"}}>
                          <div style={{display:"flex",gap:6}}>
                            <button onClick={()=>handleRenovar(p)}
                              style={{...btn("#22c55e20"),border:"1px solid #22c55e44",color:"#4ade80",fontSize:11}}>
                              +30d
                            </button>
                            <button onClick={()=>handleBloquear(p.email)}
                              style={{...btn("#ef444415"),border:"1px solid #ef444433",color:"#f87171",fontSize:11}}>
                              Bloquear
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ════ ABA: USUÁRIOS ════ */}
        {aba==="usuarios"&&(
          <div style={{background:"#080808",border:"1px solid #1a1a1a",borderRadius:16,overflow:"hidden"}}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid #1a1a1a",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{fontWeight:700,fontSize:14,color:"#c9a227"}}>🟢 Usuários Cadastrados</div>
                <span style={{background:"#22c55e18",border:"1px solid #22c55e44",borderRadius:999,padding:"2px 10px",color:"#4ade80",fontSize:11,fontWeight:700}}>
                  {usuarios.filter(u=>u.online).length} online agora
                </span>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <div style={{color:"#555",fontSize:11}}>{usuarios.length} contas cadastradas</div>
                <button onClick={carregarUsuarios} style={{...btn("#1a1a1a"),border:"1px solid #333",fontSize:11}}>
                  {loadingUsuarios?"⏳":"🔄"} Atualizar
                </button>
              </div>
            </div>
            {loadingUsuarios ? (
              <div style={{padding:40,textAlign:"center",color:"#555"}}>Carregando usuários...</div>
            ) : usuarios.length===0 ? (
              <div style={{padding:40,textAlign:"center",color:"#555"}}>
                <div style={{marginBottom:8}}>Nenhum usuário encontrado</div>
                <div style={{fontSize:11,color:"#333"}}>Deploy da Edge Function admin-usuarios necessário</div>
              </div>
            ) : (
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead>
                    <tr style={{background:"#0a0a0a"}}>
                      {["","Email","Cadastro","Último acesso","Status plano","Expira",""].map((h,i)=>(
                        <th key={i} style={{padding:"10px 14px",color:"#555",fontWeight:700,fontSize:10,
                          textAlign:"left",borderBottom:"1px solid #1a1a1a",textTransform:"uppercase",whiteSpace:"nowrap"}}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((u,i)=>{
                      const onlineMin = u.onlineMinutos;
                      const onlineLabel = u.online ? "ONLINE"
                        : onlineMin===null ? "nunca"
                        : onlineMin < 60 ? `${onlineMin}min atrás`
                        : onlineMin < 1440 ? `${Math.floor(onlineMin/60)}h atrás`
                        : `${Math.floor(onlineMin/1440)}d atrás`;
                      const planoColor = u.planoStatus==="pago" ? "#4ade80"
                        : u.planoStatus==="trial" ? "#fbbf24"
                        : u.planoStatus==="bloqueado" ? "#f87171" : "#555";
                      return (
                        <tr key={u.id} style={{background:i%2===0?"transparent":"#0a0a0a",borderBottom:"1px solid #1a1a1a11"}}>
                          <td style={{padding:"10px 14px"}}>
                            <div style={{width:8,height:8,borderRadius:999,
                              background:u.online?"#22c55e":"#333",
                              boxShadow:u.online?"0 0 6px #22c55e":"none"}}/>
                          </td>
                          <td style={{padding:"10px 14px",color:"#ccc",fontWeight:600}}>{u.email||"—"}</td>
                          <td style={{padding:"10px 14px",color:"#666",whiteSpace:"nowrap"}}>{fmtData(u.created_at)}</td>
                          <td style={{padding:"10px 14px",whiteSpace:"nowrap"}}>
                            <span style={{color:u.online?"#4ade80":"#555",fontWeight:u.online?700:400}}>
                              {u.online&&<span style={{marginRight:4}}>●</span>}{onlineLabel}
                            </span>
                          </td>
                          <td style={{padding:"10px 14px"}}>
                            {u.planoStatus ? (
                              <span style={{background:planoColor+"18",border:`1px solid ${planoColor}44`,
                                borderRadius:999,padding:"2px 8px",color:planoColor,fontSize:10,fontWeight:700}}>
                                {u.planoStatus.toUpperCase()}
                              </span>
                            ) : <span style={{color:"#333",fontSize:10}}>sem plano</span>}
                          </td>
                          <td style={{padding:"10px 14px",color:"#666",whiteSpace:"nowrap"}}>{fmtData(u.planoExpira)}</td>
                          <td style={{padding:"10px 14px"}}>{fmtDias(u.planoExpira)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ════ ABA: CÓDIGOS ════ */}
        {aba==="codigos"&&(
          <div style={{background:"#080808",border:"1px solid #1a1a1a",borderRadius:16,overflow:"hidden"}}>
            <div style={{padding:"16px 20px",borderBottom:"1px solid #1a1a1a",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontWeight:700,fontSize:14,color:"#c9a227"}}>🔑 Códigos de Ativação</div>
              <div style={{color:"#555",fontSize:11}}>{codigos.length} códigos gerados</div>
            </div>
            {loading ? (
              <div style={{padding:40,textAlign:"center",color:"#555"}}>Carregando...</div>
            ) : codigos.length===0 ? (
              <div style={{padding:40,textAlign:"center",color:"#555"}}>Nenhum código gerado ainda</div>
            ) : (
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead>
                    <tr style={{background:"#0a0a0a"}}>
                      {["Código","Email destino","Dias","Criado","Expira código","Usado por","Status","Ações"].map(h=>(
                        <th key={h} style={{padding:"10px 14px",color:"#555",fontWeight:700,
                          fontSize:10,textAlign:"left",borderBottom:"1px solid #1a1a1a",
                          textTransform:"uppercase",whiteSpace:"nowrap"}}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {codigos.map((c,i)=>{
                      const expirou = new Date(c.expira_em) < new Date();
                      const statusCod = c.usado?"usado": expirou?"expirado":"ativo";
                      const statusColor = {usado:"#4ade80",expirado:"#f87171",ativo:"#fbbf24"}[statusCod];
                      return (
                        <tr key={c.id} style={{background:i%2===0?"transparent":"#0a0a0a0a",
                          borderBottom:"1px solid #1a1a1a11"}}>
                          <td style={{padding:"10px 14px"}}>
                            <span style={{fontFamily:"monospace",fontWeight:900,color:"#fff",
                              fontSize:13,letterSpacing:1}}>{c.codigo}</span>
                          </td>
                          <td style={{padding:"10px 14px",color:"#aaa"}}>{c.email_destino||"—"}</td>
                          <td style={{padding:"10px 14px",color:"#60a5fa",fontWeight:700}}>{c.dias_acesso}d</td>
                          <td style={{padding:"10px 14px",color:"#666"}}>{fmtData(c.criado_em)}</td>
                          <td style={{padding:"10px 14px"}}>{fmtDias(c.expira_em)}</td>
                          <td style={{padding:"10px 14px",color:c.email_usado?"#4ade80":"#555"}}>
                            {c.email_usado||"—"}
                          </td>
                          <td style={{padding:"10px 14px"}}>
                            <span style={{background:statusColor+"18",border:`1px solid ${statusColor}44`,
                              borderRadius:999,padding:"2px 8px",color:statusColor,fontSize:10,fontWeight:700}}>
                              {statusCod.toUpperCase()}
                            </span>
                          </td>
                          <td style={{padding:"10px 14px"}}>
                            {!c.usado&&!expirou&&(
                              <button onClick={()=>handleRevogarCodigo(c.id, c.codigo)}
                                style={{...btn("#ef444415"),border:"1px solid #ef444433",color:"#f87171",fontSize:11}}>
                                Revogar
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}