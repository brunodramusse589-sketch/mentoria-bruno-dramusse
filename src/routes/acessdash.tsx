import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
    return <div className="min-h-screen bg-black text-white grid place-items-center">Carregando...</div>;
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-black text-white grid place-items-center px-4">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-xl font-semibold">Dashboard — Acesso</h1>
          <p className="text-sm text-white/60">Entre para ver as respostas.</p>
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm outline-none focus:border-white/40"
          />
          <input
            type="password"
            required
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm outline-none focus:border-white/40"
          />
          {authError && <p className="text-sm text-red-400">{authError}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-white text-black font-medium py-2 text-sm disabled:opacity-50"
          >
            {loading ? "Aguarde..." : "Entrar"}
          </button>

        </form>
      </div>
    );
  }

  return <Dashboard />;
}

function Dashboard() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "completed" | "qualified" | "not_qualified" | "in_progress">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Session | null>(null);

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

  const stats = useMemo(() => {
    const total = sessions.length;
    const completed = sessions.filter((s) => s.completed).length;
    const qualified = sessions.filter((s) => s.qualified === true).length;
    const notQualified = sessions.filter((s) => s.completed && s.qualified === false).length;
    const inProgress = sessions.filter((s) => !s.completed && s.current_step > 0).length;
    return { total, completed, qualified, notQualified, inProgress };
  }, [sessions]);

  const filtered = useMemo(() => {
    let list = sessions;
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
  }, [sessions, filter, search]);

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
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold">Dashboard — Mentoria Bruno</h1>
          <p className="text-xs text-white/50">Acompanhamento em tempo real das candidaturas</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="rounded-lg bg-white/10 hover:bg-white/15 px-3 py-1.5 text-xs disabled:opacity-50 flex items-center gap-1.5"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={refreshing ? "animate-spin" : ""}>
              <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
            </svg>
            {refreshing ? "A actualizar..." : "Actualizar"}
          </button>
          <button onClick={exportCSV} className="rounded-lg bg-white/10 hover:bg-white/15 px-3 py-1.5 text-xs">
            Exportar CSV
          </button>
          <button onClick={() => supabase.auth.signOut()} className="rounded-lg bg-white/10 hover:bg-white/15 px-3 py-1.5 text-xs">
            Sair
          </button>
        </div>
      </header>

      <div className="p-6 space-y-6">
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

        {/* Search */}
        <input
          placeholder="Buscar por nome, WhatsApp ou Instagram..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/30"
        />

        {/* Table */}
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase text-white/50">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">Data</th>
                  <th className="px-4 py-3 whitespace-nowrap">Nome</th>
                  <th className="px-4 py-3 whitespace-nowrap">WhatsApp</th>
                  <th className="px-4 py-3 whitespace-nowrap">Compromisso</th>
                  <th className="px-4 py-3 whitespace-nowrap">Investimento</th>
                  <th className="px-4 py-3 whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 whitespace-nowrap">Contactar</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-white/50">Carregando...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-white/50">Nenhuma resposta ainda</td></tr>
                ) : (
                  filtered.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => setSelected(s)}
                      className="border-t border-white/5 hover:bg-white/5 cursor-pointer"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-white/60 text-xs">
                        {new Date(s.started_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium">{s.nome ?? <span className="text-white/30">—</span>}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-white/80">{s.whatsapp ?? <span className="text-white/30">—</span>}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs">{s.answers?.compromisso ?? <span className="text-white/30">—</span>}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold" style={{ color: s.answers?.investimento?.toUpperCase()?.startsWith("SIM") ? "#22c55e" : s.answers?.investimento === "NÃO" ? "#ef4444" : undefined }}>
                        {s.answers?.investimento ?? <span className="text-white/30 font-normal">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap"><StatusBadge session={s} /></td>
                      <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <WhatsAppButton session={s} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selected && <DetailDrawer session={selected} onClose={() => setSelected(null)} />}
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

function WhatsAppButton({ session }: { session: Session }) {
  const nome = session.nome ?? "você";
  const phone = (session.whatsapp ?? "").replace(/\D/g, "");
  if (!phone) return <span className="text-white/20 text-xs">sem número</span>;

  const isQualified = session.qualified === true;
  const isNotQualified = session.qualified === false;

  let msg = "";
  if (isQualified) {
    msg = `Opa! ${nome}, tudo bem? 👋 Aqui é o Bruno Dramusse. Vi que preencheste o formulário da Mentoria e estás pronto para investir no teu crescimento. Quero agendar uma call contigo para alinharmos tudo antes de fecharmos. Qual o melhor horário para ti?`;
  } else if (isNotQualified) {
    msg = `Opa! ${nome}, tudo bem? 👋 Aqui é o Bruno Dramusse. Vi que preencheste o formulário da Mentoria. Entendo que o investimento individual pode estar além do alcance agora — mas tenho a solução certa para ti: o *Network Master*. Por uma fração do valor aprendes o método completo, generates os teus primeiros resultados e constróis o caixa. Depois é só fazer o upgrade para a Mentoria Individual e triplicar os teus ganhos. Queres saber mais?`;
  } else {
    return <span className="text-white/20 text-xs">—</span>;
  }

  const url = `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-transform hover:scale-105 active:scale-95 ${
        isQualified
          ? "bg-[#22c55e]/20 text-[#22c55e] hover:bg-[#22c55e]/30"
          : "bg-white/10 text-white/70 hover:bg-white/20"
      }`}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.297-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.05 21.785h-.004a9.87 9.87 0 01-5.031-1.378l-.36-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.463 3.488z"/>
      </svg>
      {isQualified ? "Agendar call" : "Network Master"}
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
