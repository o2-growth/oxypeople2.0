-- Anúncios de entrada, aniversário e o2versário saem de manhã, no horário.
--
-- Até aqui quem disparava era o schedule do GitHub Actions, marcado para 07h
-- BRT. O GitHub não garante horário e vinha executando entre 10h e 15h — o
-- parabéns de 01/10 saiu às 13h55, e o sync do Pipefy atrasava junto, a ponto
-- de deixar fora da plataforma quem começava no dia (Marcello, 28/09).
--
-- O pg_cron roda dentro do banco, no minuto marcado, e chama as edge functions
-- pelo pg_net. A ordem importa: o sync traz quem foi cadastrado na véspera e
-- só depois as celebrações anunciam a admissão do dia.
--
--   06:00 BRT (09:00 UTC)  pipefy-sync
--   08:00 BRT (11:00 UTC)  celebrations-dispatch
--
-- O CRON_SECRET e a chave anon (exigida pelo verify_jwt do gateway) ficam no
-- Vault, não neste arquivo. Os workflows do GitHub continuam existindo para
-- disparo manual.
--
-- Pré-requisito, fora desta migration porque os valores são segredo:
--   select vault.create_secret('<CRON_SECRET>', 'cron_secret');
--   select vault.create_secret('<SUPABASE_ANON_KEY>', 'anon_key');

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Chama uma edge function com o segredo do cron. Assíncrono: o pg_net guarda a
-- resposta em net._http_response, onde dá para conferir cada disparo.
CREATE OR REPLACE FUNCTION public.disparar_edge_function_cron(p_funcao text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_segredo text;
  v_anon text;
  v_request_id bigint;
BEGIN
  SELECT decrypted_secret INTO v_segredo
  FROM vault.decrypted_secrets
  WHERE name = 'cron_secret';

  SELECT decrypted_secret INTO v_anon
  FROM vault.decrypted_secrets
  WHERE name = 'anon_key';

  IF v_segredo IS NULL OR v_anon IS NULL THEN
    RAISE EXCEPTION 'cron_secret ou anon_key ausente no Vault';
  END IF;

  SELECT net.http_post(
    url := 'https://ixtsnaxhgyoeaotrched.supabase.co/functions/v1/' || p_funcao,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon,
      'x-cron-secret', v_segredo
    ),
    body := '{}'::jsonb,
    -- O sync leva de 20s a 40s; o padrão do pg_net (5s) cortaria a resposta.
    timeout_milliseconds := 300000
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.disparar_edge_function_cron(text) FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule(jobname) FROM cron.job
WHERE jobname IN ('pipefy-sync-manha', 'celebracoes-manha');

SELECT cron.schedule(
  'pipefy-sync-manha',
  '0 9 * * *',
  $$ SELECT public.disparar_edge_function_cron('pipefy-sync'); $$
);

SELECT cron.schedule(
  'celebracoes-manha',
  '0 11 * * *',
  $$ SELECT public.disparar_edge_function_cron('celebrations-dispatch'); $$
);
