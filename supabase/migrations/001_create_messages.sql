-- Tabella messages per persistenza chat a lungo termine
-- Esegui questo script nel SQL Editor di Supabase: https://supabase.com/dashboard/project/_/sql

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indice per query per user_id ordinate per data
CREATE INDEX IF NOT EXISTS idx_messages_user_created 
  ON public.messages(user_id, created_at ASC);

-- RLS: ogni utente vede solo i propri messaggi
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own messages"
  ON public.messages
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
