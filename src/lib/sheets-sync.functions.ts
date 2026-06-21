import { createServerFn } from "@tanstack/react-start";

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzYkc_GmzR81Al7xu70c4WGPzucZcoyFo4EuLPyoWS0djgXlT3VQTT4jfiYTXGr_-Fw/exec";

// Traduz os novos nomes de campos para os antigos (q1..q13) que o Apps Script já conhece
const KEY_MAP: Record<string, string> = {
  nome: "q1",
  whatsapp: "q2",
  instagram: "q3",
  conheceu: "q4",
  modelo: "q5",
  dificuldade: "q6",
  objetivo: "q7",
  autodidata: "q8",
  caixa: "q9",
  duvidas: "q10",
  flexivel: "q11",
  compromisso: "q12",
  investimento: "q13",
};

type Payload = {
  sessionId: string;
  answers: Record<string, string>;
  completed: boolean;
  qualified: boolean | null;
  startedAt?: string | null;
};

export const syncToSheet = createServerFn({ method: "POST" })
  .inputValidator((d: Payload) => d)
  .handler(async ({ data }) => {
    const status = data.completed ? "Completo" : "Em progresso";
    const answers = data.answers || {};

    const post = async (body: object) => {
      try {
        await fetch(APPS_SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(body),
        });
      } catch {}
    };

    // Envia cada campo no formato antigo { sessionId, key: "q1", value, status }
    for (const [namedKey, qKey] of Object.entries(KEY_MAP)) {
      const value = answers[namedKey];
      if (value) {
        await post({ sessionId: data.sessionId, key: qKey, value, status });
      }
    }

    // Se ainda não há respostas, pelo menos cria a linha da sessão
    if (Object.keys(answers).length === 0) {
      await post({ sessionId: data.sessionId, status });
    }

    return { ok: true };
  });
