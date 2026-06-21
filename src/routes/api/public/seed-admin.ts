import { createFileRoute } from "@tanstack/react-router";
import { seedAdmin } from "@/lib/seed-admin.functions";

export const Route = createFileRoute("/api/public/seed-admin")({
  server: {
    handlers: {
      GET: async () => {
        const r = await seedAdmin();
        return Response.json(r);
      },
    },
  },
});
