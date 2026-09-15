-- =============================================================================
-- Realtime também para `objectives`
-- =============================================================================
-- A publicação já tinha key_results e okr_checkins, mas não objectives: criar,
-- arquivar ou renomear um objetivo não chegava a quem estava com a lista
-- aberta. Agora que as telas de lista assinam as duas tabelas
-- (useRealtimeOkrList), a publicação precisa entregar as duas.
--
-- REPLICA IDENTITY FULL para que o payload de UPDATE/DELETE traga a linha
-- inteira — sem isso, uma exclusão lógica (deleted_at) chega sem contexto.
--
-- A RLS continua valendo no Realtime: cada pessoa só recebe evento de linha
-- que ela já poderia ler.
-- =============================================================================

ALTER TABLE public.objectives REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime' AND tablename = 'objectives'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.objectives;
  END IF;
END $$;
