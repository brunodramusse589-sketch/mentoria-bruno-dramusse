import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

export const Route = createFileRoute("/acessdash")({
  head: () => ({
    meta: [
      { title: "Dashboard — Mentoria Bruno Dramusse" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "google", content: "notranslate" },
    ],
  }),
  component: AcessDash,
});

type Session = {
  id: string;
  current_step: number;
  last_step_key: string | null;
  completed: boolean;
  qualified: boolean | null;
  answers: Record<string, string>;
  nome: string | null;
  whatsapp: string | null;
  instagram: string | null;
  started_at: string;
  updated_at: string;
  completed_at: string | null;
};

const STEP_LABELS: Record<string, string> = {
  intro: "Intro",
  nome: "Nome",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  conheceu: "Como conheceu",
  modelo: "Modelo de negócio",
  dificuldade: "Dificuldade",
  objetivo: "Objetivo 90d",
  autodidata: "Autodidata",
  caixa: "Caixa",
  duvidas: "Dúvidas",
  flexivel: "Horários flexíveis",
  garantia: "Ciente sem garantia",
  compromisso: "Compromisso",
  investimento: "Investimento 10k",
  thanks: "Finalizou",
};

function AcessDash() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setAuthError(error.message);
  };


  if (authed === null) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] grid place-items-center">
        <div className="w-10 h-10 rounded-full border-4 border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white grid place-items-center px-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center mb-2">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Bem-vindo de volta</h1>
            <p className="text-sm text-white/50 mt-1">Gerencie seus leads e pagamentos.</p>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-white/70 mb-1.5 block">Email</label>
              <input
                type="email"
                required
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-white/30 transition-all text-white placeholder-white/25"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-white/70 mb-1.5 block">Senha</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-white/30 transition-all text-white placeholder-white/25"
              />
            </div>
          </div>
          {authError && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {authError}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white hover:bg-white/90 text-black font-semibold py-3.5 text-sm disabled:opacity-50 transition-colors"
          >
            {loading ? "A entrar..." : "Entrar na conta"}
          </button>
        </form>
      </div>
    );
  }

  return <Dashboard />;
}

type MsgType = "individual" | "network_master" | "reengajamento" | "pitch";
type SentMsg = { uid: string; sessionId: string; nome: string; phone: string; type: MsgType; sentAt: string };
type Pagamento = { uid: string; sessionId: string; nome: string; phone: string; tipo: MsgType; paidAt: string; valor: string };

function Dashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "completed" | "qualified" | "not_qualified" | "in_progress">("all");
  const [search, setSearch] = useState("");
  type DateFilter = "all" | "today" | "yesterday" | "last7" | "this_month" | "last_month" | "custom";
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selected, setSelected] = useState<Session | null>(null);
  const [pitchSession, setPitchSession] = useState<Session | null>(null);
  const [tab, setTab] = useState<"leads" | "mensagens" | "financeiro">("leads");
  const [msgFilter, setMsgFilter] = useState<MsgType | "all">("all");
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [contacted, setContacted] = useState<Set<string>>(new Set());
  const [sentMessages, setSentMessages] = useState<SentMsg[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Carrega dados do Supabase e migra localStorage se necessário
  useEffect(() => {
    const sb = supabase as any;
    const load = async () => {
      const [{ data: msgs }, { data: cont }, { data: pags }] = await Promise.all([
        sb.from("dashboard_msgs").select("*").order("sent_at", { ascending: false }),
        sb.from("dashboard_contacted").select("session_id"),
        sb.from("dashboard_pagamentos").select("*").order("paid_at", { ascending: false }),
      ]);

      const hasSupa = (msgs?.length ?? 0) > 0 || (cont?.length ?? 0) > 0 || (pags?.length ?? 0) > 0;

      if (hasSupa) {
        if (msgs) setSentMessages(msgs.map((m: any) => ({ uid: m.uid, sessionId: m.session_id, nome: m.nome, phone: m.phone, type: m.type as MsgType, sentAt: m.sent_at })));
        if (cont) setContacted(new Set(cont.map((c: any) => c.session_id)));
        if (pags) setPagamentos(pags.map((p: any) => ({ uid: p.uid, sessionId: p.session_id, nome: p.nome ?? "", phone: p.phone ?? "", tipo: p.tipo as MsgType, paidAt: p.paid_at, valor: p.valor ?? "" })));
      } else {
        // Migrar de localStorage para Supabase (apenas uma vez)
        try {
          const localMsgs: SentMsg[] = JSON.parse(localStorage.getItem("mentoria_sent_messages") ?? "[]");
          const localCont: string[] = JSON.parse(localStorage.getItem("mentoria_contacted") ?? "[]");
          const localPags: Pagamento[] = JSON.parse(localStorage.getItem("mentoria_pagamentos") ?? "[]");
          if (localMsgs.length > 0) {
            await sb.from("dashboard_msgs").insert(localMsgs.map((m: SentMsg) => ({ uid: m.uid, session_id: m.sessionId, nome: m.nome, phone: m.phone, type: m.type, sent_at: m.sentAt })));
            setSentMessages(localMsgs);
          }
          if (localCont.length > 0) {
            await sb.from("dashboard_contacted").insert(localCont.map((id: string) => ({ session_id: id })));
            setContacted(new Set(localCont));
          }
          if (localPags.length > 0) {
            await sb.from("dashboard_pagamentos").insert(localPags.map((p: Pagamento) => ({ uid: p.uid, session_id: p.sessionId, nome: p.nome, phone: p.phone, tipo: p.tipo, paid_at: p.paidAt, valor: p.valor })));
            setPagamentos(localPags);
          }
        } catch {}
      }
      setDataLoaded(true);
    };
    load();
  }, []);

  const toggleContacted = async (id: string, value?: boolean) => {
    const sb = supabase as any;
    setContacted(prev => {
      const next = new Set(prev);
      const newVal = value !== undefined ? value : !next.has(id);
      newVal ? next.add(id) : next.delete(id);
      return next;
    });
    const willAdd = value !== undefined ? value : !contacted.has(id);
    if (willAdd) {
      await sb.from("dashboard_contacted").upsert({ session_id: id });
    } else {
      await sb.from("dashboard_contacted").delete().eq("session_id", id);
    }
  };

  const paidIds = useMemo(() => new Set(pagamentos.map(p => p.sessionId)), [pagamentos]);

  const PRECOS: Record<MsgType, number> = {
    individual: 10000,
    network_master: 2500,
    reengajamento: 0,
  };

  const togglePago = async (msg: SentMsg) => {
    const sb = supabase as any;
    if (paidIds.has(msg.sessionId)) {
      setPagamentos(prev => prev.filter(p => p.sessionId !== msg.sessionId));
      await sb.from("dashboard_pagamentos").delete().eq("session_id", msg.sessionId);
    } else {
      const preco = PRECOS[msg.type];
      const valorDefault = preco > 0 ? `${preco.toLocaleString("pt-BR")} MZN` : "";
      const valor = prompt(`Valor pago por ${msg.nome}:`, valorDefault) ?? valorDefault;
      if (valor === null) return;
      const entry: Pagamento = {
        uid: crypto.randomUUID(),
        sessionId: msg.sessionId,
        nome: msg.nome,
        phone: msg.phone,
        tipo: msg.type,
        paidAt: new Date().toISOString(),
        valor,
      };
      setPagamentos(prev => [entry, ...prev]);
      await sb.from("dashboard_pagamentos").insert({ uid: entry.uid, session_id: entry.sessionId, nome: entry.nome, phone: entry.phone, tipo: entry.tipo, paid_at: entry.paidAt, valor: entry.valor });
    }
  };

  const VAPID_PUBLIC = "BDW_wPT7OpGFzH03DgWlWjCXvrEdc24l2MtUjQoAmT6e-KYW4FgCsyTz5qloTVRBiuoVbqk9Ni2jGUKLyWRdCqk";
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

  const [notifPerm, setNotifPerm] = useState<NotificationPermission>("default");
  const [showNotifBanner, setShowNotifBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    const perm = Notification.permission;
    setNotifPerm(perm);
    // Mostra banner automático se ainda não decidiu
    if (perm === "default") setShowNotifBanner(true);
    // Se já tem permissão, garante que está subscrito
    if (perm === "granted") subscribeWebPush();
  }, []);

  const requestNotifPermission = async () => {
    setShowNotifBanner(false);
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
    if (perm === "granted") subscribeWebPush();
  };

  const subscribeWebPush = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: VAPID_PUBLIC,
        });
      }
      // Guardar subscrição no Supabase via REST (bypass TypeScript types)
      await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Prefer": "resolution=merge-duplicates",
        },
        body: JSON.stringify({ endpoint: sub.endpoint, subscription: JSON.stringify(sub) }),
      });
    } catch {}
  };

  const showLocalNotif = (title: string, body: string) => {
    if (Notification.permission !== "granted") return;
    navigator.serviceWorker.ready
      .then(reg => reg.showNotification(title, { body, icon: "/icon-192.png" } as NotificationOptions))
      .catch(() => new Notification(title, { body, icon: "/icon-192.png" }));
  };

  // Realtime: notifica quando entra um novo lead
  useEffect(() => {
    const channel = supabase
      .channel("new_leads_notif")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "quiz_sessions" }, (payload) => {
        const s = payload.new as Session;
        showLocalNotif("Novo lead no formulário", `${s.nome ?? "Alguém"} começou a preencher.`);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "quiz_sessions" }, (payload) => {
        const s = payload.new as Session;
        if (!s.completed) return;
        const nome = s.nome ?? "Alguém";
        const tel = s.whatsapp ?? "";
        if (s.qualified === true)
          showLocalNotif("Novo lead qualificado! 🔥", `${nome} (${tel}) disse SIM — Mentoria Individual.`);
        else if (s.qualified === false)
          showLocalNotif("Lead para Network Master", `${nome} (${tel}) disse NÃO.`);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const recordMessage = async (session: Session, type: MsgType) => {
    const sb = supabase as any;
    toggleContacted(session.id, true);
    const entry: SentMsg = {
      uid: crypto.randomUUID(),
      sessionId: session.id,
      nome: session.nome ?? "Sem nome",
      phone: session.whatsapp ?? "",
      type,
      sentAt: new Date().toISOString(),
    };
    setSentMessages(prev => [entry, ...prev]);
    await sb.from("dashboard_msgs").insert({ uid: entry.uid, session_id: entry.sessionId, nome: entry.nome, phone: entry.phone, type: entry.type, sent_at: entry.sentAt });
  };

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await supabase
        .from("quiz_sessions")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(2000);
      setSessions((data as Session[] | null) ?? []);
    } catch (e) {
      console.error("Erro ao carregar dados:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Após carregar dados do Supabase e sessões, migra contactados sem registo de mensagem
  useEffect(() => {
    if (!dataLoaded || sessions.length === 0 || contacted.size === 0) return;
    const sb = supabase as any;
    const registeredIds = new Set(sentMessages.map(m => m.sessionId));
    const toAdd: SentMsg[] = [];
    for (const s of sessions) {
      if (!contacted.has(s.id)) continue;
      if (registeredIds.has(s.id)) continue;
      const type: MsgType = s.qualified === true ? "individual" : s.qualified === false ? "network_master" : "reengajamento";
      toAdd.push({ uid: crypto.randomUUID(), sessionId: s.id, nome: s.nome ?? "Sem nome", phone: s.whatsapp ?? "", type, sentAt: s.updated_at ?? s.started_at });
    }
    if (toAdd.length === 0) return;
    setSentMessages(prev => [...toAdd, ...prev].sort((a, b) => b.sentAt.localeCompare(a.sentAt)));
    sb.from("dashboard_msgs").insert(toAdd.map((m: SentMsg) => ({ uid: m.uid, session_id: m.sessionId, nome: m.nome, phone: m.phone, type: m.type, sent_at: m.sentAt }))).then(() => {});
  }, [dataLoaded, sessions]);

  // Lista filtrada apenas por período (usada nos stats e como base para os outros filtros)
  const periodFiltered = useMemo(() => {
    if (dateFilter === "all") return sessions;
    const now = new Date();
    const tz = "Africa/Maputo";
    const todayStr = now.toLocaleDateString("sv-SE", { timeZone: tz });
    const yestDate = new Date(now); yestDate.setDate(yestDate.getDate() - 1);
    const yestStr = yestDate.toLocaleDateString("sv-SE", { timeZone: tz });
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    return sessions.filter((s) => {
      const d = new Date(s.started_at);
      const dStr = d.toLocaleDateString("sv-SE", { timeZone: tz });
      if (dateFilter === "today") return dStr === todayStr;
      if (dateFilter === "yesterday") return dStr === yestStr;
      if (dateFilter === "last7") {
        const ago = new Date(now); ago.setDate(ago.getDate() - 6); ago.setHours(0, 0, 0, 0);
        return d >= ago;
      }
      if (dateFilter === "this_month") return d >= firstDayThisMonth;
      if (dateFilter === "last_month") return d >= firstDayLastMonth && d <= lastDayLastMonth;
      if (dateFilter === "custom" && customStart) {
        const start = new Date(customStart + "T00:00:00");
        const end = customEnd ? new Date(customEnd + "T23:59:59") : new Date();
        return d >= start && d <= end;
      }
      return true;
    });
  }, [sessions, dateFilter, customStart, customEnd]);

  const stats = useMemo(() => {
    const total = periodFiltered.length;
    const completed = periodFiltered.filter((s) => s.completed).length;
    const qualified = periodFiltered.filter((s) => s.qualified === true).length;
    const notQualified = periodFiltered.filter((s) => s.completed && s.qualified === false).length;
    const inProgress = periodFiltered.filter((s) => !s.completed && s.current_step > 0).length;
    return { total, completed, qualified, notQualified, inProgress };
  }, [periodFiltered]);

  const filtered = useMemo(() => {
    let list = periodFiltered;
    if (filter === "completed") list = list.filter((s) => s.completed);
    else if (filter === "qualified") list = list.filter((s) => s.qualified === true);
    else if (filter === "not_qualified") list = list.filter((s) => s.completed && s.qualified === false);
    else if (filter === "in_progress") list = list.filter((s) => !s.completed && s.current_step > 0);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          (s.nome ?? "").toLowerCase().includes(q) ||
          (s.whatsapp ?? "").toLowerCase().includes(q) ||
          (s.instagram ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [periodFiltered, filter, search]);

  const exportCSV = () => {
    const headers = ["Nome", "WhatsApp", "Instagram", "Como conheceu", "Modelo negócio", "Dificuldade", "Objetivo 90d", "Autodidata", "Caixa", "Dúvidas", "Horários flexíveis", "Compromisso", "Investimento", "Status", "Completou", "Início", "Atualizado"];
    const rows = filtered.map((s) => [
      s.nome ?? "",
      s.whatsapp ?? "",
      s.instagram ?? "",
      s.answers?.conheceu ?? "",
      s.answers?.modelo ?? "",
      s.answers?.dificuldade ?? "",
      s.answers?.objetivo ?? "",
      s.answers?.autodidata ?? "",
      s.answers?.caixa ?? "",
      s.answers?.duvidas ?? "",
      s.answers?.flexivel ?? "",
      s.answers?.compromisso ?? "",
      s.answers?.investimento ?? "",
      s.qualified === true ? "Qualificado (SIM)" : s.qualified === false ? "Não qualificado" : s.completed ? "Finalizou" : s.current_step > 0 ? "Em progresso" : "Abriu",
      s.completed ? "Sim" : "Não",
      new Date(s.started_at).toLocaleString("pt-BR"),
      new Date(s.updated_at).toLocaleString("pt-BR"),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mentoria-respostas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Banner de notificação — aparece automaticamente */}
      {showNotifBanner && (
        <div className="bg-blue-500/10 border-b border-blue-500/20 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#60a5fa" className="shrink-0"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6V11c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
            <span className="text-sm text-blue-300 leading-tight">Activa as notificações para saber quando entra um lead, mesmo com o app fechado</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={requestNotifPermission} className="rounded-lg bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 text-xs font-medium">
              Activar
            </button>
            <button onClick={() => setShowNotifBanner(false)} className="text-white/30 hover:text-white/60 text-lg leading-none px-1">✕</button>
          </div>
        </div>
      )}

      <header className="border-b border-white/10 px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-base font-semibold truncate">Dashboard — Mentoria Bruno</h1>
          <p className="text-xs text-white/40 hidden sm:block">Acompanhamento em tempo real das candidaturas</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {notifPerm === "granted" && (
            <span title="Notificações activas" className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6V11c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
            </span>
          )}
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="rounded-lg bg-white/10 hover:bg-white/15 px-3 py-1.5 text-xs disabled:opacity-50 flex items-center gap-1.5"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={refreshing ? "animate-spin" : ""}>
              <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
            </svg>
            <span className="hidden sm:inline">{refreshing ? "A actualizar..." : "Actualizar"}</span>
          </button>
          <button onClick={exportCSV} className="rounded-lg bg-white/10 hover:bg-white/15 px-3 py-1.5 text-xs hidden sm:flex items-center">
            Exportar CSV
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/15 flex items-center justify-center"
            title="Definições"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Painel de Definições */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          {/* Painel lateral direito */}
          <div className="absolute right-0 top-0 h-full w-80 max-w-full bg-[#111] border-l border-white/10 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h2 className="font-semibold text-base">Definições</h2>
              <button onClick={() => setShowSettings(false)} className="text-white/40 hover:text-white text-xl leading-none">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-6">

              {/* Conta */}
              <section>
                <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Conta</p>
                <div className="bg-white/5 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-lg">
                      B
                    </div>
                    <div>
                      <p className="text-sm font-medium">Bruno Dramusse</p>
                      <p className="text-xs text-white/40">{userEmail ?? "—"}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { supabase.auth.signOut(); setShowSettings(false); }}
                    className="w-full rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 py-2 text-sm"
                  >
                    Terminar sessão
                  </button>
                </div>
              </section>

              {/* Notificações */}
              <section>
                <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Notificações</p>
                <div className="bg-white/5 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Notificações push</p>
                      <p className="text-xs text-white/40">Avisos de novos leads</p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      notifPerm === "granted"
                        ? "bg-green-500/15 text-green-400 border border-green-500/20"
                        : notifPerm === "denied"
                        ? "bg-red-500/15 text-red-400 border border-red-500/20"
                        : "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20"
                    }`}>
                      {notifPerm === "granted" ? "Activas" : notifPerm === "denied" ? "Bloqueadas" : "Pendente"}
                    </span>
                  </div>
                  {notifPerm === "granted" ? (
                    <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 rounded-lg px-3 py-2">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      Receberás notificações mesmo com o app fechado
                    </div>
                  ) : notifPerm === "denied" ? (
                    <p className="text-xs text-white/40">Vai às Definições do iPhone → Notificações → Mentoria BD e activa.</p>
                  ) : (
                    <button
                      onClick={() => { requestNotifPermission(); }}
                      className="w-full rounded-lg bg-blue-500 hover:bg-blue-600 text-white py-2 text-sm font-medium"
                    >
                      Activar notificações
                    </button>
                  )}
                  <div className="border-t border-white/10 pt-3">
                    <p className="text-xs text-white/40 mb-1">Para notificações em background:</p>
                    <p className="text-xs text-white/30">Partilha → "Adicionar ao ecrã inicial" no Safari do iPhone</p>
                  </div>
                </div>
              </section>

              {/* Exportar */}
              <section>
                <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Dados</p>
                <div className="bg-white/5 rounded-xl p-4">
                  <button onClick={() => { exportCSV(); setShowSettings(false); }} className="w-full rounded-lg bg-white/10 hover:bg-white/15 py-2 text-sm">
                    Exportar leads (CSV)
                  </button>
                </div>
              </section>

              {/* Info */}
              <section>
                <div className="text-center text-xs text-white/20 pt-2">
                  <p>Mentoria Bruno Dramusse</p>
                  <p>Dashboard v2.0</p>
                </div>
              </section>

            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-white/10 px-6 flex gap-1">
        {([
          { key: "leads", label: `Leads (${sessions.length})` },
          { key: "mensagens", label: `Mensagens (${sentMessages.length})` },
          { key: "financeiro", label: `Financeiro (${pagamentos.length})` },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? "border-white text-white" : "border-transparent text-white/40 hover:text-white/70"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-6 space-y-6">
        {tab === "mensagens" && (() => {
          const visibleMsgs = msgFilter === "all" ? sentMessages : sentMessages.filter(m => m.type === msgFilter);
          const chips: { type: MsgType | "all"; label: string; color: string; count: number }[] = [
            { type: "all", label: "Todas", color: "bg-white/40", count: sentMessages.length },
            { type: "individual", label: "Mentoria Individual", color: "bg-green-500", count: sentMessages.filter(m => m.type === "individual").length },
            { type: "network_master", label: "Network Master", color: "bg-blue-400", count: sentMessages.filter(m => m.type === "network_master").length },
            { type: "reengajamento", label: "Reengajamento", color: "bg-yellow-400", count: sentMessages.filter(m => m.type === "reengajamento").length },
          ];
          return (
          <div className="space-y-3">
            {sentMessages.length === 0 ? (
              <p className="text-white/40 text-sm py-8 text-center">Nenhuma mensagem enviada ainda. Clica num botão da dashboard para registar.</p>
            ) : (
              <>
                <div className="flex gap-2 flex-wrap">
                  {chips.map(c => (
                    <button
                      key={c.type}
                      onClick={() => setMsgFilter(c.type)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${msgFilter === c.type ? "border-white/40 bg-white/10 text-white" : "border-white/10 bg-white/[0.03] text-white/50 hover:bg-white/5 hover:text-white/70"}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${c.color} inline-block`}/>
                      {c.label} ({c.count})
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  {visibleMsgs.map((m) => (
                    <div key={m.uid} className={`rounded-xl border border-white/10 p-4 ${paidIds.has(m.sessionId) ? "bg-emerald-500/5 border-emerald-500/20" : "bg-white/[0.03]"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{m.nome}</p>
                          <p className="text-xs text-white/50 mt-0.5">{m.phone}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                          m.type === "individual" ? "bg-green-500/15 text-green-400" :
                          m.type === "network_master" ? "bg-blue-500/15 text-blue-400" :
                          m.type === "pitch" ? "bg-orange-500/15 text-orange-400" :
                          "bg-yellow-500/15 text-yellow-400"
                        }`}>
                          {m.type === "individual" ? "Individual" : m.type === "network_master" ? "NM" : m.type === "pitch" ? "Pitch" : "Reengaj."}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-xs text-white/30">{new Date(m.sentAt).toLocaleString("pt-BR")}</p>
                        <button
                          onClick={() => togglePago(m)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${paidIds.has(m.sessionId) ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"}`}
                        >
                          {paidIds.has(m.sessionId) ? (
                            <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Pago</>
                          ) : "Marcar pago"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          );
        })()}

        {tab === "financeiro" && (() => {
          const nIndividual = pagamentos.filter(p => p.tipo === "individual").length;
          const nNM = pagamentos.filter(p => p.tipo === "network_master").length;
          const receitaIndividual = nIndividual * 10000;
          const receitaNM = nNM * 2500;
          const receitaTotal = receitaIndividual + receitaNM;

          const fmt = (v: number) => v.toLocaleString("pt-BR") + " MZN";

          // Pie chart data
          const pieData = [
            { name: "Mentoria Individual", value: nIndividual, color: "#22c55e" },
            { name: "Network Master", value: nNM, color: "#3b82f6" },
          ].filter(d => d.value > 0);

          // Bar chart: pagamentos por dia (últimos 14 dias)
          const barData = (() => {
            const map: Record<string, { Individual: number; NM: number }> = {};
            pagamentos.forEach(p => {
              const d = new Date(p.paidAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
              if (!map[d]) map[d] = { Individual: 0, NM: 0 };
              if (p.tipo === "individual") map[d].Individual++;
              else if (p.tipo === "network_master") map[d].NM++;
            });
            return Object.entries(map).slice(-14).map(([data, v]) => ({ data, ...v }));
          })();

          return (
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 md:col-span-2">
                  <div className="text-xs text-white/50">Receita Total</div>
                  <div className="mt-1 text-3xl font-bold text-emerald-400">{fmt(receitaTotal)}</div>
                  <div className="text-xs text-white/30 mt-1">{pagamentos.length} pagamentos registados</div>
                </div>
                <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
                  <div className="text-xs text-green-400/70">Mentoria Individual</div>
                  <div className="mt-1 text-xl font-semibold text-green-400">{fmt(receitaIndividual)}</div>
                  <div className="text-xs text-white/30 mt-1">{nIndividual} × 10.000 MZN</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-xs text-white/50">Network Master</div>
                  <div className="mt-1 text-xl font-semibold text-white">{fmt(receitaNM)}</div>
                  <div className="text-xs text-white/30 mt-1">{nNM} × 2.500 MZN</div>
                </div>
              </div>

              {pagamentos.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Bar chart */}
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-xs text-white/50 mb-4 uppercase tracking-wide">Pagamentos por dia</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={barData} barSize={14}>
                        <XAxis dataKey="data" tick={{ fill: "#ffffff55", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#ffffff55", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ background: "#111", border: "1px solid #ffffff15", borderRadius: 8, color: "#fff", fontSize: 12 }} />
                        <Bar dataKey="Individual" name="Mentoria Individual" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="NM" name="Network Master" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Pie chart */}
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-xs text-white/50 mb-4 uppercase tracking-wide">Distribuição</div>
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={45} paddingAngle={3} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                            {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: "#ffffff80", fontSize: 12 }}>{v}</span>} />
                          <Tooltip contentStyle={{ background: "#111", border: "1px solid #ffffff15", borderRadius: 8, color: "#fff", fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-48 flex items-center justify-center text-white/30 text-sm">Sem dados</div>
                    )}
                  </div>
                </div>
              )}

              {pagamentos.length === 0 ? (
                <p className="text-white/40 text-sm py-8 text-center">Nenhum pagamento registado ainda. Marca como pago na aba Mensagens.</p>
              ) : (
                <div className="rounded-xl border border-white/10 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5 text-left text-xs uppercase text-white/50">
                      <tr>
                        <th className="px-4 py-3">Data</th>
                        <th className="px-4 py-3">Nome</th>
                        <th className="px-4 py-3">WhatsApp</th>
                        <th className="px-4 py-3">Produto</th>
                        <th className="px-4 py-3">Valor</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagamentos.map((p) => (
                        <tr key={p.uid} className="border-t border-white/5 hover:bg-white/5">
                          <td className="px-4 py-3 text-white/50 text-xs whitespace-nowrap">{new Date(p.paidAt).toLocaleDateString("pt-BR")}</td>
                          <td className="px-4 py-3 font-medium whitespace-nowrap">{p.nome}</td>
                          <td className="px-4 py-3 text-white/70 whitespace-nowrap">{p.phone}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {p.tipo === "individual" && <span className="rounded-full bg-green-500/15 text-green-400 px-2.5 py-1 text-xs font-medium">Mentoria Individual</span>}
                            {p.tipo === "network_master" && <span className="rounded-full bg-blue-500/15 text-blue-400 px-2.5 py-1 text-xs font-medium">Network Master</span>}
                            {p.tipo === "reengajamento" && <span className="rounded-full bg-yellow-500/15 text-yellow-400 px-2.5 py-1 text-xs font-medium">Reengajamento</span>}
                          </td>
                          <td className="px-4 py-3 font-semibold text-emerald-400 whitespace-nowrap">{p.valor || <span className="text-white/30 font-normal">—</span>}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button
                              onClick={() => {
                                if (confirm(`Remover pagamento de ${p.nome}?`)) {
                                  setPagamentos(prev => {
                                    const next = prev.filter(x => x.uid !== p.uid);
                                    localStorage.setItem("mentoria_pagamentos", JSON.stringify(next));
                                    return next;
                                  });
                                }
                              }}
                              className="text-white/20 hover:text-red-400 transition-colors text-xs"
                              title="Remover"
                            >✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}

        {tab === "leads" && <>
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label="Total" value={stats.total} color="white" onClick={() => setFilter("all")} active={filter === "all"} />
          <StatCard label="Em progresso" value={stats.inProgress} color="#facc15" onClick={() => setFilter("in_progress")} active={filter === "in_progress"} />
          <StatCard label="Finalizaram" value={stats.completed} color="#3b82f6" onClick={() => setFilter("completed")} active={filter === "completed"} />
          <StatCard label="Disseram SIM" value={stats.qualified} color="#22c55e" onClick={() => setFilter("qualified")} active={filter === "qualified"} />
          <StatCard label="Disseram NÃO" value={stats.notQualified} color="#ef4444" onClick={() => setFilter("not_qualified")} active={filter === "not_qualified"} />
        </div>

        {/* Filter tab header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-base font-medium">
            {filter === "all" && `Todas as candidaturas (${stats.total})`}
            {filter === "in_progress" && `Em progresso (${stats.inProgress})`}
            {filter === "completed" && `Finalizaram (${stats.completed})`}
            {filter === "qualified" && `Disseram SIM (${stats.qualified})`}
            {filter === "not_qualified" && `Disseram NÃO (${stats.notQualified})`}
          </h2>
          {filter !== "all" && (
            <button
              onClick={() => setFilter("all")}
              className="text-xs rounded-lg bg-white/10 hover:bg-white/15 px-3 py-1.5"
            >
              Ver todos
            </button>
          )}
        </div>

        {/* Search + Filtro de período */}
        <div className="flex flex-wrap gap-2 items-center">
          <input
            placeholder="Buscar por nome, WhatsApp ou Instagram..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] max-w-md rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/30"
          />
          <div className="relative">
            <select
              value={dateFilter}
              onChange={(e) => {
                const v = e.target.value as DateFilter;
                setDateFilter(v);
                if (v === "custom") setShowDatePicker(true);
                else setShowDatePicker(false);
              }}
              className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/30 appearance-none pr-8 cursor-pointer"
            >
              <option value="all" className="bg-[#111]">Máximo</option>
              <option value="today" className="bg-[#111]">Hoje</option>
              <option value="yesterday" className="bg-[#111]">Ontem</option>
              <option value="last7" className="bg-[#111]">Últimos 7 dias</option>
              <option value="this_month" className="bg-[#111]">Esse mês</option>
              <option value="last_month" className="bg-[#111]">Mês passado</option>
              <option value="custom" className="bg-[#111]">Personalizado</option>
            </select>
            <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/40" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
          </div>
          {dateFilter === "custom" && (
            <div className="flex items-center gap-2 text-sm">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
              />
              <span className="text-white/40 text-xs">até</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
              />
            </div>
          )}
        </div>

        {/* Cards mobile / Tabela desktop */}
        {loading ? (
          <p className="text-center text-white/50 py-8 text-sm">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-white/50 py-8 text-sm">Nenhuma resposta ainda</p>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="space-y-2 md:hidden">
              {filtered.map((s) => (
                <div
                  key={s.id}
                  className={`rounded-xl border border-white/10 p-4 cursor-pointer transition-colors ${contacted.has(s.id) ? "bg-green-500/5 border-green-500/10" : "bg-white/[0.03]"}`}
                  onClick={() => setSelected(s)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{s.nome ?? <span className="text-white/30">Sem nome</span>}</p>
                      <p className="text-xs text-white/50 mt-0.5">{s.whatsapp ?? "Sem número"}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge session={s} />
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleContacted(s.id); }}
                        className="flex items-center justify-center w-7 h-7 rounded-full border transition-colors shrink-0"
                        style={contacted.has(s.id) ? { background: "#22c55e22", borderColor: "#22c55e" } : { background: "transparent", borderColor: "rgba(255,255,255,0.15)" }}
                      >
                        {contacted.has(s.id) && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-xs text-white/30">{new Date(s.started_at).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit", timeZone:"Africa/Maputo" })}</p>
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <WhatsAppButton session={s} onContact={(type) => recordMessage(s, type)} />
                      {s.whatsapp && <button onClick={() => setPitchSession(s)} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors">Pitch</button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: tabela */}
            <div className="hidden md:block rounded-xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white/5 text-left text-xs uppercase text-white/50">
                    <tr>
                      <th className="px-4 py-3 whitespace-nowrap">Data</th>
                      <th className="px-4 py-3 whitespace-nowrap">Nome</th>
                      <th className="px-4 py-3 whitespace-nowrap">WhatsApp</th>
                      <th className="px-4 py-3 whitespace-nowrap">Investimento</th>
                      <th className="px-4 py-3 whitespace-nowrap">Status</th>
                      <th className="px-4 py-3 whitespace-nowrap">Contactar</th>
                      <th className="px-4 py-3 whitespace-nowrap">Contactado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => (
                      <tr key={s.id} onClick={() => setSelected(s)} className={`border-t border-white/5 hover:bg-white/5 cursor-pointer transition-colors ${contacted.has(s.id) ? "bg-green-500/5" : ""}`}>
                        <td className="px-4 py-3 whitespace-nowrap text-white/60 text-xs">{new Date(s.started_at).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit", timeZone:"Africa/Maputo" })}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-medium">{s.nome ?? <span className="text-white/30">—</span>}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-white/80">{s.whatsapp ?? <span className="text-white/30">—</span>}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold" style={{ color: s.answers?.investimento?.toUpperCase()?.startsWith("SIM") ? "#22c55e" : s.answers?.investimento === "NÃO" ? "#ef4444" : undefined }}>
                          {s.answers?.investimento ?? <span className="text-white/30 font-normal">—</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap"><StatusBadge session={s} /></td>
                        <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <WhatsAppButton session={s} onContact={(type) => recordMessage(s, type)} />
                            {s.whatsapp && <button onClick={() => setPitchSession(s)} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors">Pitch</button>}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => toggleContacted(s.id)} className="flex items-center justify-center w-7 h-7 rounded-full border transition-colors" style={contacted.has(s.id) ? { background: "#22c55e22", borderColor: "#22c55e" } : { background: "transparent", borderColor: "rgba(255,255,255,0.15)" }}>
                            {contacted.has(s.id) && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
        </>}
      </div>

      {selected && <DetailDrawer session={selected} onClose={() => setSelected(null)} />}
      {pitchSession && <PitchModal session={pitchSession} onClose={() => setPitchSession(null)} onContact={(type) => { recordMessage(pitchSession, type); setPitchSession(null); }} />}
    </div>
  );
}

function StatCard({ label, value, color, onClick, active }: { label: string; value: number; color: string; onClick: () => void; active: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition ${active ? "border-white/40 bg-white/10" : "border-white/10 bg-white/[0.03] hover:bg-white/5"}`}
    >
      <div className="text-xs text-white/60">{label}</div>
      <div className="mt-1 text-2xl font-semibold" style={{ color }}>{value}</div>
    </button>
  );
}

function StatusBadge({ session }: { session: Session }) {
  if (session.qualified === true) return <span className="rounded-md bg-green-500/15 text-green-400 px-2 py-0.5 text-xs">Qualificado (SIM)</span>;
  if (session.qualified === false) return <span className="rounded-md bg-red-500/15 text-red-400 px-2 py-0.5 text-xs">Não qualificado</span>;
  if (session.completed) return <span className="rounded-md bg-blue-500/15 text-blue-400 px-2 py-0.5 text-xs">Finalizou</span>;
  if (session.current_step > 0) return <span className="rounded-md bg-yellow-500/15 text-yellow-400 px-2 py-0.5 text-xs">Em progresso</span>;
  return <span className="rounded-md bg-white/10 text-white/50 px-2 py-0.5 text-xs">Abriu</span>;
}

function WhatsAppButton({ session, onContact }: { session: Session; onContact?: (type: MsgType) => void }) {
  const nome = session.nome ?? "você";
  const phone = (session.whatsapp ?? "").replace(/\D/g, "");
  if (!phone) return <span className="text-white/20 text-xs">sem número</span>;

  const isQualified = session.qualified === true;
  const isNotQualified = session.qualified === false;
  const isInProgress = !session.completed && (session.current_step ?? 0) > 0;

  let msg = "";
  let btnLabel = "";
  let btnClass = "";

  let msgType: MsgType = "individual";
  if (isQualified) {
    msg = `Opa! ${nome}, tudo bem? Aqui é o Bruno Dramusse. Vi que preencheste o formulário da Mentoria Individual e estás pronto para investir no teu crescimento. Quero agendar uma call contigo para alinharmos tudo antes de fecharmos. Qual o melhor horário para ti?`;
    btnLabel = "Agendar call";
    btnClass = "bg-[#22c55e]/20 text-[#22c55e] hover:bg-[#22c55e]/30";
    msgType = "individual";
  } else if (isNotQualified) {
    msg = `Opa! ${nome}, tudo bem? Aqui é o Bruno Dramusse. Vi que preencheste o formulário da Mentoria Individual. Entendo que o investimento pode estar além do alcance agora, mas tenho a solução certa para ti: o *Network Master*. Por uma fração do valor aprendes o método completo, generates os teus primeiros resultados e constróis o caixa. Depois é só fazer o upgrade para a Mentoria Individual e triplicar os teus ganhos. Queres saber mais?`;
    btnLabel = "Network Master";
    btnClass = "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30";
    msgType = "network_master";
  } else if (isInProgress) {
    msg = `Opa! ${nome}, tudo bem? Aqui é o Bruno Dramusse. Vi que começaste a preencher o formulário da Mentoria Individual mas não chegaste ao fim. Queria perceber o que te levou a parar, podes partilhar? Estou aqui para ajudar e, dependendo da tua situação, posso ter uma proposta que se encaixe no teu momento actual.`;
    btnLabel = "Reengajar";
    btnClass = "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30";
    msgType = "reengajamento";
  } else {
    return <span className="text-white/20 text-xs">—</span>;
  }

  const url = `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onContact?.(msgType)}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-transform hover:scale-105 active:scale-95 ${btnClass}`}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.297-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.05 21.785h-.004a9.87 9.87 0 01-5.031-1.378l-.36-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.463 3.488z"/>
      </svg>
      {btnLabel}
    </a>
  );
}

function DetailDrawer({ session, onClose }: { session: Session; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-md bg-[#0a0a0a] border-l border-white/10 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold">{session.nome ?? "Sem nome"}</h2>
              <p className="text-xs text-white/50">{new Date(session.started_at).toLocaleString("pt-BR")}</p>
            </div>
            <button onClick={onClose} className="text-white/50 hover:text-white">✕</button>
          </div>
          <StatusBadge session={session} />
          <div className="space-y-3">
            {session.whatsapp && (
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="text-xs uppercase text-white/40">WhatsApp</div>
                <a
                  href={`https://wa.me/${session.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 text-sm text-green-400 hover:underline flex items-center gap-1.5"
                >
                  {session.whatsapp}
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
              </div>
            )}
            {Object.entries(session.answers ?? {}).map(([k, v]) => (
              <div key={k} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="text-xs uppercase text-white/40">{STEP_LABELS[k] ?? k}</div>
                <div className="mt-1 text-sm">{v as string}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PitchModal({ session, onClose, onContact }: { session: Session; onClose: () => void; onContact: (type: MsgType) => void }) {
  const nome = (session.nome ?? "você").split(" ")[0];
  const phone = (session.whatsapp ?? "").replace(/\D/g, "");
  const [copied, setCopied] = useState<number | null>(null);

  const msgs = [
    `Opa ${nome}! Aqui é o Bruno Dramusse. Tenho apenas 5 vagas disponíveis para a Mentoria Individual.`,
    `O Carlos, um dos meus mentorados, seguiu o método comigo e num único dia fez R$1.783 de faturamento com ROAS de 2.72 e R$1.128 de lucro líquido. Estou a levá-lo para os 30k no dia.`,
    `Li as tuas respostas no formulário e tens o perfil certo para estar aqui. Queres fechar uma das vagas? Se tiveres alguma dúvida antes de entrar marcamos uma call rápida para esclarecer, caso contrário fechamos direto agora.`,
  ];

  const copy = (i: number) => {
    navigator.clipboard.writeText(msgs[i]).then(() => {
      setCopied(i);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-[#111] rounded-2xl border border-white/10 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <p className="font-semibold text-sm">Pitch Individual</p>
            <p className="text-xs text-white/40 mt-0.5">{session.nome} · {session.whatsapp}</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl leading-none">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-white/40 mb-1">Envia as 3 mensagens seguidas no WhatsApp</p>
          {msgs.map((m, i) => (
            <div key={i} className="rounded-xl bg-white/[0.04] border border-white/10 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-white/50">{i + 1}ª mensagem</span>
                <button
                  onClick={() => copy(i)}
                  className="text-xs rounded-md px-2.5 py-1 bg-white/10 hover:bg-white/15 text-white/60 hover:text-white transition-colors"
                >
                  {copied === i ? "Copiado ✓" : "Copiar"}
                </button>
              </div>
              <p className="text-sm text-white/80 leading-relaxed">{m}</p>
              {i === 0 && phone && (
                <a
                  href={`https://wa.me/${phone}?text=${encodeURIComponent(m)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onContact("pitch")}
                  className="mt-3 flex items-center justify-center gap-2 w-full rounded-lg bg-[#25D366] hover:opacity-90 text-white text-xs font-medium py-2 transition-opacity"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.297-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.05 21.785h-.004a9.87 9.87 0 01-5.031-1.378l-.36-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.463 3.488z"/></svg>
                  Abrir WhatsApp com a 1ª mensagem
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
