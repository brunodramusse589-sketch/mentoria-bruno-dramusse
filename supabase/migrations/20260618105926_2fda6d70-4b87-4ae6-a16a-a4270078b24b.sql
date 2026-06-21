
CREATE TABLE public.quiz_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  current_step int NOT NULL DEFAULT 0,
  last_step_key text,
  completed boolean NOT NULL DEFAULT false,
  qualified boolean,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  nome text,
  whatsapp text,
  instagram text,
  user_agent text,
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

GRANT SELECT, INSERT, UPDATE ON public.quiz_sessions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_sessions TO authenticated;
GRANT ALL ON public.quiz_sessions TO service_role;

ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone can create a session
CREATE POLICY "anon can insert sessions" ON public.quiz_sessions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Anyone can update (by id - id is uuid, used as obscure token)
CREATE POLICY "anon can update sessions" ON public.quiz_sessions
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Only authenticated users can read sessions (admin dashboard)
CREATE POLICY "authenticated can read sessions" ON public.quiz_sessions
  FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER quiz_sessions_updated_at
  BEFORE UPDATE ON public.quiz_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX quiz_sessions_started_at_idx ON public.quiz_sessions (started_at DESC);
CREATE INDEX quiz_sessions_completed_idx ON public.quiz_sessions (completed);
