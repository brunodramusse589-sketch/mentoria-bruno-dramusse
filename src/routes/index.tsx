import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import brunoProfile from "@/assets/bruno-profile.jpeg";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "quiz_session_id";
const APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbzYkc_GmzR81Al7xu70c4WGPzucZcoyFo4EuLPyoWS0djgXlT3VQTT4jfiYTXGr_-Fw/exec";



export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mentoria Bruno Dramusse" },
      {
        name: "description",
        content:
          "Formulário de candidatura para a Mentoria Bruno Dramusse. Escale sua operação para no mínimo 500 Mil Meticais por mês.",
      },
      { property: "og:title", content: "Mentoria Bruno Dramusse" },
      {
        property: "og:description",
        content:
          "Formulário de candidatura para a Mentoria Bruno Dramusse. Escale sua operação para no mínimo 500 Mil Meticais por mês.",
      },
    ],
  }),
  component: Index,
});

type Option = { letter: string; label: string };
type CountryOption = { code: string; label: string; flag: string };
type Step =
  | { kind: "intro" }
  | {
      kind: "choice";
      key: string;
      title: string;
      subtitle?: React.ReactNode;
      options: Option[];
    }
  | {
      kind: "text";
      key: string;
      title: string;
      subtitle?: React.ReactNode;
      placeholder?: string;
      inputType?: "text" | "tel" | "textarea";
      prefix?: string;
      countrySelector?: CountryOption[];
    }
  | { kind: "thanks" };

const countries: CountryOption[] = [
  { code: "+258", label: "MZ", flag: "🇲🇿" },
  { code: "+244", label: "AO", flag: "🇦🇴" },
  { code: "+55", label: "BR", flag: "🇧🇷" },
  { code: "+351", label: "PT", flag: "🇵🇹" },
];

const steps: Step[] = [
  { kind: "intro" },
  {
    kind: "text",
    key: "nome",
    title: "Qual é o seu nome e sobrenome?",
    placeholder: "Digite sua resposta aqui...",
  },
  {
    kind: "text",
    key: "whatsapp",
    title: "Qual o seu WhatsApp?",
    placeholder: "Digite sua resposta aqui...",
    inputType: "tel",
    countrySelector: countries,
  },
  {
    kind: "text",
    key: "instagram",
    title: "Qual o seu Instagram?",
    placeholder: "Digite sua resposta aqui...",
  },
  {
    kind: "choice",
    key: "conheceu",
    title: "Como você conheceu o Bruno Dramusse?",
    options: [
      { letter: "A", label: "Youtube" },
      { letter: "B", label: "Instagram" },
      { letter: "C", label: "TikTok" },
      { letter: "D", label: "Me indicaram" },
      { letter: "E", label: "Outro" },
    ],
  },
  {
    kind: "choice",
    key: "modelo",
    title: "Qual seu modelo de negócio atual?",
    options: [
      { letter: "A", label: 'Produto Digital | "PLR"' },
      { letter: "B", label: "Ecommerce | Dropshipping" },
      { letter: "C", label: "Encapsulado" },
      { letter: "D", label: "Gestor de tráfego" },
      { letter: "E", label: "Prestador de serviço" },
      { letter: "F", label: "Ainda não tenho um negócio" },
      { letter: "G", label: "Tenho um negócio físico" },
      { letter: "H", label: "Outro" },
    ],
  },
  {
    kind: "choice",
    key: "dificuldade",
    title: "Qual sua maior dificuldade no tráfego direto hoje?",
    options: [
      { letter: "A", label: "Já vendo porém não consigo escalar" },
      { letter: "B", label: "Não consigo encontrar oferta boa" },
      {
        letter: "C",
        label:
          "Não consigo escalar todos os meses (vivo em ciclo de fica rico fica pobre)",
      },
      { letter: "D", label: "Não sei fazer contingência" },
      { letter: "E", label: "Estou tentando mas não sei pra onde ir" },
      { letter: "F", label: "Ainda não comecei" },
      { letter: "G", label: "Outro" },
    ],
  },
  {
    kind: "choice",
    key: "objetivo",
    title: "Qual seu objetivo principal nos próximos 90 dias?",
    options: [
      { letter: "A", label: "Acertar a primeira oferta" },
      { letter: "B", label: "Chegar nos 50.000 MT/mês com tráfego direto" },
      { letter: "C", label: "Chegar nos 100.000 MT/mês com tráfego direto" },
      { letter: "D", label: "Chegar nos 200.000 MT/mês com tráfego direto" },
      { letter: "E", label: "Chegar nos 500.000 MT/mês com tráfego direto" },
      { letter: "F", label: "Bater o meu primeiro Milhão de Meticais" },
    ],
  },
  {
    kind: "choice",
    key: "autodidata",
    title: "Você se considera autodidata?",
    options: [
      { letter: "A", label: "SIM" },
      { letter: "B", label: "NÃO" },
    ],
  },
  {
    kind: "choice",
    key: "caixa",
    title: "Quanto você / sua empresa tem de caixa hoje?",
    options: [
      { letter: "A", label: "Menos de 5.000 MT" },
      { letter: "B", label: "Mais de 5.000 MT" },
      { letter: "C", label: "Mais de 10.000 MT" },
      { letter: "D", label: "Mais de 25.000 MT" },
      { letter: "E", label: "Mais de 50.000 MT" },
      { letter: "F", label: "Mais de 100.000 MT" },
    ],
  },
  {
    kind: "text",
    key: "duvidas",
    title:
      "Caso você seja selecionado para fazer parte da Mentoria, quais dúvidas você teria antes de concluir o investimento?",
    placeholder: "Digite sua resposta aqui...",
    inputType: "textarea",
  },
  {
    kind: "choice",
    key: "flexivel",
    title:
      "Ao entrar na mentoria, você será adicionado a um grupo com Bruno e sua equipe, onde serão organizadas todas as calls e esclarecidas dúvidas sobre escalar e outros temas. Você tem horários flexíveis?",
    options: [
      { letter: "A", label: "SIM" },
      { letter: "B", label: "NÃO" },
      { letter: "C", label: "NÃO, mas consigo dar um jeito" },
    ],
  },
  {
    kind: "choice",
    key: "garantia",
    title:
      "Você está ciente que a mentoria individual não é uma garantia de resultados?",
    options: [
      { letter: "A", label: "Sim" },
      { letter: "B", label: "Não" },
    ],
  },
  {
    kind: "choice",
    key: "compromisso",
    title:
      "Caso seja selecionado para fazer parte da Mentoria, de qualquer forma faremos uma call para alinhar antes do fechamento. Você se compromete, caso seja selecionado(a), a comparecer no dia e horário agendado?",
    options: [
      { letter: "A", label: "Sim, me comprometo" },
      { letter: "B", label: "Não" },
    ],
  },
  {
    kind: "choice",
    key: "investimento",
    title: "",
    subtitle: (
      <>
        <p>
          Pela necessidade de resultado rápido as pessoas selecionadas serão as
          únicas com acesso a todas estratégias que me diferenciam no jogo.
        </p>
        <p>
          Já que tempo é dinheiro e o meu conhecimento gera milhões.
        </p>
        <p className="mt-6">
          O investimento necessário para ter acesso ao meu nível de jogo é de{" "}
          <strong className="text-white">10.000 MT</strong>.
        </p>
        <p>
          Você tem capacidade de investir agora esse valor em você e no seu
          negócio?
        </p>
        <p className="mt-4 text-white/50 italic text-[15px]">
          Obs: Este valor poderá ser pago via M-Pesa, e-mola ou transferência
          bancária.
        </p>
      </>
    ),
    options: [
      { letter: "A", label: "SIM" },
      { letter: "B", label: "NÃO" },
      { letter: "C", label: "NÃO, mas consigo dar um jeito" },
    ],
  },
  { kind: "thanks" },
];

function Index() {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentText, setCurrentText] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(countries[0]);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const prevAnswersRef = useRef<Record<string, string>>({});
  const wasCompletedRef = useRef(false);

  // ID novo a cada abertura de página — garante linha nova na planilha por cada visita
  const [localId] = useState<string>(() => crypto.randomUUID());

  const step = steps[index];

  // Cria sessão na Supabase em background — não bloqueia o Google Sheets
  const ensureSession = async (): Promise<string> => {
    if (!sessionId) {
      const ua = typeof navigator !== "undefined" ? navigator.userAgent : null;
      supabase
        .from("quiz_sessions")
        .upsert({ id: localId, user_agent: ua }, { onConflict: "id" })
        .then(({ error }) => {
          if (error) console.error("Supabase:", error.message);
          else setSessionId(localId);
        });
    }
    return localId;
  };

  // Sincroniza sempre que o index ou as respostas mudam
  useEffect(() => {
    if (index === 0) return; // não sincroniza na intro
    const currentStep = steps[index];
    const stepKey =
      currentStep.kind === "intro" ? "intro" :
      currentStep.kind === "thanks" ? "thanks" :
      (currentStep as { key: string }).key;
    const isCompleted = currentStep.kind === "thanks";
    const investimento = answers["investimento"];
    const qualified =
      isCompleted && investimento
        ? investimento.toUpperCase().startsWith("SIM")
        : null;

    // Supabase — usa localId directamente (sempre disponível após handleStart)
    supabase.from("quiz_sessions").update({
      current_step: index,
      last_step_key: stepKey,
      answers,
      completed: isCompleted,
      qualified,
      nome: answers["nome"] ?? null,
      whatsapp: answers["whatsapp"] ?? null,
      instagram: answers["instagram"] ?? null,
      ...(isCompleted ? { completed_at: new Date().toISOString() } : {}),
    }).eq("id", localId).then(({ error }) => {
      if (error) console.error("Supabase update:", error.message);
    });

    // Google Sheets — envia só os campos novos (1 pedido por passo, sem race conditions)
    const KEY_MAP: Record<string, string> = {
      nome: "q1", whatsapp: "q2", instagram: "q3",
      conheceu: "q4", modelo: "q5", dificuldade: "q6",
      objetivo: "q7", autodidata: "q8", caixa: "q9",
      duvidas: "q10", flexivel: "q11", compromisso: "q12",
      investimento: "q13",
    };

    // Só envia campos que ainda não foram enviados (ou cujo valor mudou)
    const newEntries = Object.entries(KEY_MAP).filter(([namedKey]) => {
      const value = answers[namedKey];
      return value && value !== prevAnswersRef.current[namedKey];
    });
    prevAnswersRef.current = { ...answers };

    newEntries.forEach(([namedKey, qKey]) => {
      const value = answers[namedKey];
      fetch(APPS_SCRIPT, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ sessionId: localId, key: qKey, value, status: "Em progresso" }),
      }).catch(() => {});
    });

    // Quando o formulário termina, manda 1 pedido só com status=Completo
    // O Apps Script relê q13 da linha já guardada e pinta a cor correta
    if (isCompleted && !wasCompletedRef.current) {
      wasCompletedRef.current = true;
      fetch(APPS_SCRIPT, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ sessionId: localId, status: "Completo" }),
      }).catch(() => {});
    }

  }, [index, answers, localId]);

  const isLast = index === steps.length - 2; // last interactive before thanks
  const total = steps.length - 2; // exclude intro + thanks
  const progress =
    step.kind === "intro"
      ? 0
      : step.kind === "thanks"
      ? 100
      : (index / (steps.length - 1)) * 100;

  useEffect(() => {
    if (step.kind === "text") {
      const saved = answers[step.key] ?? "";
      if (step.countrySelector) {
        const found = step.countrySelector.find((c) => saved.startsWith(c.code));
        if (found) {
          setSelectedCountry(found);
          setCurrentText(saved.slice(found.code.length).trim());
        } else {
          setSelectedCountry(step.countrySelector[0]);
          setCurrentText(saved);
        }
      } else {
        setCurrentText(saved);
      }
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const next = () => setIndex((i) => Math.min(i + 1, steps.length - 1));
  const back = () => setIndex((i) => Math.max(i - 1, 0));

  const handleStart = async () => {
    // Regista o primeiro contacto imediatamente ao clicar em "Iniciar Aplicação"
    fetch(APPS_SCRIPT, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ sessionId: localId, status: "Em progresso" }),
    }).catch(() => {});
    await ensureSession();
    next();
  };

  const handleChoice = (key: string, value: string) => {
    setAnswers((a) => ({ ...a, [key]: value }));
    setTimeout(next, 150);
  };

  const submitText = () => {
    if (step.kind !== "text") return;
    if (!currentText.trim()) return;
    const fullValue = step.countrySelector
      ? `${selectedCountry.code} ${currentText.trim()}`
      : currentText.trim();
    setAnswers((a) => ({ ...a, [step.key]: fullValue }));
    next();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (step.kind !== "text") return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitText();
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-black text-white font-sans">
      {/* Progress bar */}
      <div className="h-[3px] w-full bg-white/10">
        <div
          className="h-full bg-[#3b82f6] transition-[width] duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Content */}
      <main className={`flex-1 overflow-y-auto px-6 sm:px-10 flex flex-col ${step.kind === "intro" ? "pt-16 pb-32" : "pt-24 sm:pt-32 pb-24 sm:pb-32 justify-center"}`}>
        <div className="mx-auto w-full max-w-2xl">
          {step.kind === "intro" && <Intro onStart={handleStart} />}

          {step.kind === "choice" && (
            <ChoiceStep
              title={step.title}
              subtitle={step.subtitle}
              options={step.options}
              selected={answers[step.key]}
              onSelect={(label) => handleChoice(step.key, label)}
            />
          )}

          {step.kind === "text" && (
            <TextStep
              title={step.title}
              subtitle={step.subtitle}
              placeholder={step.placeholder}
              inputType={step.inputType}
              prefix={step.prefix}
              countrySelector={step.countrySelector}
              selectedCountry={selectedCountry}
              onCountryChange={setSelectedCountry}
              value={currentText}
              onChange={setCurrentText}
              onKeyDown={onKeyDown}
              inputRef={inputRef}
            />
          )}

          {step.kind === "thanks" && <Thanks answer={answers["investimento"]} />}

          {step.kind !== "thanks" && step.kind !== "intro" && (
            <div className="mt-8 flex items-center gap-4">
              <button
                onClick={() => {
                  if (step.kind === "text") submitText();
                  else next();
                }}
                disabled={step.kind === "text" && !currentText.trim()}
                className="inline-flex items-center gap-3 rounded-full bg-white px-6 py-3 text-[15px] font-medium text-black transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
              >
                {isLast ? "Enviar" : "Continuar"}
                <span aria-hidden>→</span>
              </button>
              <span className="text-[13px] text-white/50">
                Pressione{" "}
                <kbd className="ml-1 inline-flex items-center rounded-md border border-white/15 bg-white/5 px-2 py-1 font-sans text-[12px] text-white/80">
                  Enter ↵
                </kbd>
              </span>
            </div>
          )}

          {step.kind !== "thanks" && step.kind !== "intro" && index > 1 && (
            <div className="mt-6">
              <button
                onClick={back}
                className="inline-flex items-center gap-2 text-[13px] text-white/40 transition-colors hover:text-white/70"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Voltar
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Intro({ onStart }: { onStart: () => void | Promise<void> }) {
  return (
    <div className="pt-2 text-center">
      <div className="relative mx-auto mb-6 h-28 w-28 sm:h-32 sm:w-32">
        <div className="h-full w-full overflow-hidden rounded-full ring-1 ring-white/20">
          <img
            src={brunoProfile}
            alt="Bruno Dramusse"
            className="h-full w-full object-cover"
            style={{ objectPosition: "50% 22%" }}
          />
        </div>
      </div>
      <h1 className="text-[34px] leading-[1.05] font-black tracking-tight sm:text-5xl">
        Mentoria Bruno Dramusse
      </h1>
      <p className="mt-3 text-[15px] text-white/55">@bruno_dramusse</p>

      <div className="mt-8 space-y-5 text-left text-[16px] leading-[1.6] text-white/85 sm:text-[17px]">
        <p>
          Vou te selecionar para abrir tudo da minha operação (consistência de{" "}
          <strong className="font-bold text-white">no mínimo 500 Mil Meticais por mês</strong>
          ) e te ajudar pessoalmente a escalar.
        </p>
        <p>
          Você vai <strong className="font-bold text-white">escalar junto comigo</strong>, e aprender na prática com o que estiver dando certo pra mim.
        </p>
        <p>
          <strong className="font-bold text-white">Validação - Oferta - Consistência - Networking</strong> (você vai estar a uma ligação de qualquer pessoa do mercado).
        </p>
        <p>
          Além de te ensinar tudo isso, você vai ter <strong className="font-bold text-white">Calls comigo</strong> e acompanhamento via <strong className="font-bold text-white">WhatsApp</strong> para te ajudar em todas as etapas da sua operação.
        </p>
        <p className="text-white/60 italic">( É necessário um investimento! )</p>
      </div>

      <div className="mt-10 mb-8 flex items-center justify-center gap-4">
        <button
          onClick={onStart}
          className="inline-flex items-center gap-3 rounded-full bg-white px-8 py-3.5 text-[15px] font-medium text-black transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Iniciar Aplicação
          <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  );
}


function QuestionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      {subtitle && (
        <div className="mb-5 space-y-3 text-[17px] leading-[1.5] text-white/85">
          {subtitle}
        </div>
      )}
      {title && (
        <h2 className="text-[22px] leading-[1.3] font-normal text-white sm:text-2xl">
          {title} <span className="text-[#ef4d6b]">*</span>
        </h2>
      )}
    </div>
  );
}

function ChoiceStep({
  title,
  subtitle,
  options,
  selected,
  onSelect,
}: {
  title: string;
  subtitle?: React.ReactNode;
  options: Option[];
  selected?: string;
  onSelect: (label: string) => void;
}) {
  return (
    <div>
      <QuestionTitle title={title} subtitle={subtitle} />
      <div className="space-y-3">
        {options.map((o) => {
          const active = selected === o.label;
          return (
            <button
              key={o.letter}
              onClick={() => onSelect(o.label)}
              className={`group flex w-full items-center gap-3 rounded-md border px-3 py-3.5 text-left text-[16px] transition-all sm:text-[17px] ${
                active
                  ? "border-[#3b82f6] bg-[#3b82f6]/10 text-white"
                  : "border-white/25 text-white/90 hover:border-white/60 hover:bg-white/5"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border text-[11px] font-medium ${
                  active
                    ? "border-[#3b82f6] text-[#3b82f6]"
                    : "border-white/40 text-white/70 group-hover:border-white/70"
                }`}
              >
                {o.letter}
              </span>
              <span className="min-w-0 flex-1">{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CountrySelect({
  options,
  selected,
  onChange,
}: {
  options: CountryOption[];
  selected: CountryOption;
  onChange: (c: CountryOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 pb-1 text-[16px] text-white/80 transition-colors hover:text-white"
      >
        <span>{selected.flag}</span>
        <span className="text-[14px] tracking-wide">{selected.label} {selected.code}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="ml-0.5 opacity-60">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[140px] rounded-md border border-white/15 bg-[#1a1a1a] py-1 shadow-xl">
          {options.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => {
                onChange(c);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[14px] transition-colors hover:bg-white/10 ${
                selected.code === c.code ? "text-white" : "text-white/70"
              }`}
            >
              <span>{c.flag}</span>
              <span>{c.label}</span>
              <span className="ml-auto text-white/50">{c.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TextStep({
  title,
  subtitle,
  placeholder,
  inputType,
  prefix,
  countrySelector,
  selectedCountry,
  onCountryChange,
  value,
  onChange,
  onKeyDown,
  inputRef,
}: {
  title: string;
  subtitle?: React.ReactNode;
  placeholder?: string;
  inputType?: "text" | "tel" | "textarea";
  prefix?: string;
  countrySelector?: CountryOption[];
  selectedCountry?: CountryOption;
  onCountryChange?: (c: CountryOption) => void;
  value: string;
  onChange: (v: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  inputRef: React.MutableRefObject<HTMLInputElement | HTMLTextAreaElement | null>;
}) {
  const isTextarea = inputType === "textarea";
  return (
    <div>
      <QuestionTitle title={title} subtitle={subtitle} />
      <div className="flex items-end gap-3 border-b border-white/30 pb-2 focus-within:border-white">
        {prefix && (
          <span className="shrink-0 pb-1 text-[16px] text-white/80">
            {prefix}
          </span>
        )}
        {countrySelector && selectedCountry && onCountryChange && (
          <CountrySelect
            options={countrySelector}
            selected={selectedCountry}
            onChange={onCountryChange}
          />
        )}
        {isTextarea ? (
          <textarea
            ref={(el) => {
              inputRef.current = el;
            }}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            rows={1}
            className="w-full resize-none bg-transparent text-[18px] text-white placeholder-white/35 outline-none"
            maxLength={2000}
          />
        ) : (
          <input
            ref={(el) => {
              inputRef.current = el;
            }}
            type={inputType ?? "text"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className="w-full bg-transparent text-[18px] text-white placeholder-white/35 outline-none"
            maxLength={255}
          />
        )}
      </div>
      {isTextarea && (
        <p className="mt-3 text-[13px] text-white/40">
          Shift ⇧ + Enter ↵ para fazer uma quebra de linha.
        </p>
      )}
    </div>
  );
}

function Thanks({ answer }: { answer?: string }) {
  if (answer === "NÃO") return <NetworkMasterOffer />;
  return <PerfilQualificado />;
}

function PerfilQualificado() {
  return (
    <div className="flex min-h-[80dvh] flex-col items-center justify-center text-center px-4">
      <h1 className="text-[32px] leading-[1.1] font-black tracking-tight sm:text-5xl uppercase">
        Obrigado por preencher o formulário!
      </h1>
      <p className="mx-auto mt-8 max-w-md text-[18px] leading-[1.6] text-white/80 sm:text-[20px]">
        A minha equipe irá analisar suas respostas e caso você seja selecionado, estaremos entrando em contato no Whatsapp para Agendar sua call Gratuita.
      </p>
    </div>
  );
}

function NetworkMasterOffer() {
  return (
    <div className="pt-10 text-center">
      <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-[#3b82f6]/40 bg-[#3b82f6]/10 px-4 py-1.5 text-[12px] font-medium uppercase tracking-wider text-[#3b82f6]">
        Recomendação para você
      </div>
      <h1 className="text-[32px] leading-[1.1] font-black tracking-tight sm:text-5xl">
        Comece com o <span className="text-[#3b82f6]">Network Master</span>
      </h1>
      <div className="mx-auto mt-8 max-w-xl space-y-4 text-[17px] leading-[1.6] text-white/80 sm:text-[18px]">
        <p>
          A Mentoria Individual exige um investimento maior — mas isso{" "}
          <strong className="text-white">não significa o fim da sua jornada</strong>.
        </p>
        <p>
          O <strong className="text-white">Network Master</strong> é o ponto de
          partida ideal: você acessa o método completo por uma fração do valor,
          gera seus primeiros resultados e constrói o caixa necessário.
        </p>
        <p>
          Assim que tiver os seus primeiros resultados, você avança para a
          <strong className="text-white"> Mentoria Individual</strong> e{" "}
          <strong className="text-white">triplica os seus ganhos</strong>.
        </p>
      </div>
      <div className="mt-10 flex items-center justify-center">
        <a
          href="https://networkmaster.site"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 rounded-full bg-white px-7 py-4 text-[16px] font-semibold text-black transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Quero o Network Master
          <span aria-hidden>→</span>
        </a>
      </div>
      <p className="mt-6 text-[13px] text-white/40">
        Acesso imediato · Suporte da comunidade · Upgrade para Mentoria quando estiver pronto
      </p>
    </div>
  );
}
