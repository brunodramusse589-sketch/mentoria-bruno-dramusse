import webpush from "web-push";
import { defineEventHandler, readBody, createError } from "h3";

webpush.setVapidDetails(
  "mailto:brunodramusse589@gmail.com",
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  // Supabase envia o payload do webhook aqui
  const record = body?.record ?? body;
  const nome = record?.nome ?? "Alguém";
  const tel = record?.whatsapp ?? "";
  const completed = record?.completed;
  const qualified = record?.qualified;
  const type = body?.type; // INSERT ou UPDATE

  let title = "";
  let msg = "";

  if (type === "INSERT" || (!completed && !qualified)) {
    title = "Novo lead no formulário";
    msg = `${nome} começou a preencher o formulário.`;
  } else if (completed && qualified === true) {
    title = "Novo lead qualificado! 🔥";
    msg = `${nome} (${tel}) disse SIM — Mentoria Individual.`;
  } else if (completed && qualified === false) {
    title = "Lead para Network Master";
    msg = `${nome} (${tel}) disse NÃO — candidato para o Network Master.`;
  } else {
    return { ok: true, sent: 0 };
  }

  // Buscar subscrições no Supabase
  const subsRes = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/push_subscriptions?select=subscription`,
    {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY!}`,
      },
    }
  );
  const subs: { subscription: string }[] = await subsRes.json();
  if (!Array.isArray(subs) || subs.length === 0) return { ok: true, sent: 0 };

  const results = await Promise.allSettled(
    subs.map((row) =>
      webpush.sendNotification(
        JSON.parse(row.subscription),
        JSON.stringify({ title, body: msg })
      )
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return { ok: true, sent };
});
