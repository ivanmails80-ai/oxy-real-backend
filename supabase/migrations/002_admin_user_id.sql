-- Supporto per admin bypass: user_id può essere 'admin-ivan' (testo)
-- Esegui nel SQL Editor Supabase: https://supabase.com/dashboard/project/vplvkhbjngbeuileszcg/sql

-- Rimuovi FK e cambia user_id in text (conserva uuid esistenti come stringa)
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_user_id_fkey;
ALTER TABLE public.messages ALTER COLUMN user_id TYPE text USING user_id::text;

-- Aggiorna indice (user_id ora è text)
DROP INDEX IF EXISTS idx_messages_user_created;
CREATE INDEX idx_messages_user_created ON public.messages(user_id, created_at ASC);

-- RLS: utenti auth vedono i propri messaggi; chiunque può accedere a user_id = 'admin-ivan'
DROP POLICY IF EXISTS "Users can manage own messages" ON public.messages;
CREATE POLICY "Users can manage own messages"
  ON public.messages FOR ALL
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
    OR user_id = 'admin-ivan'
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
    OR user_id = 'admin-ivan'
  );
