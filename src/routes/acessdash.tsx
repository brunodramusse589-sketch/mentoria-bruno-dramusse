import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/acessdash")({
  head: () => ({
    meta: [
      { title: "Dashboard — Mentoria Bruno Dramusse" },
      { name: "robots", content: "noindex,nofollow" },
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
  const [filter, setFilter] = useState<"all" | "completed" | "qualified" | "not_qualified" | "in_progress">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Session | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("quiz_sessions")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(2000);
    setSessions((data as Session[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("quiz_sessions_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "quiz_sessions" }, () => fetchData())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
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
    const headers = ["Nome", "WhatsApp", "Instagram", "Etapa", "Completou", "Qualificado", "Início", "Atualizado"];
    const rows = filtered.map((s) => [
      s.nome ?? "",
      s.whatsapp ?? "",
      s.instagram ?? "",
      STEP_LABELS[s.last_step_key ?? ""] ?? s.last_step_key ?? "",
      s.completed ? "Sim" : "Não",
      s.qualified === true ? "Sim" : s.qualified === false ? "Não" : "",
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
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">WhatsApp</th>
                  <th className="px-4 py-3">Instagram</th>
                  <th className="px-4 py-3">Etapa atual</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Atualizado</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-white/50">Carregando...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-white/50">Nenhuma resposta ainda</td></tr>
                ) : (
                  filtered.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => setSelected(s)}
                      className="border-t border-white/5 hover:bg-white/5 cursor-pointer"
                    >
                      <td className="px-4 py-3">{s.nome ?? <span className="text-white/30">—</span>}</td>
                      <td className="px-4 py-3">{s.whatsapp ?? <span className="text-white/30">—</span>}</td>
                      <td className="px-4 py-3">{s.instagram ?? <span className="text-white/30">—</span>}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs">
                          {STEP_LABELS[s.last_step_key ?? ""] ?? s.last_step_key ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge session={s} />
                      </td>
                      <td className="px-4 py-3 text-white/60 text-xs">
                        {new Date(s.updated_at).toLocaleString("pt-BR")}
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
