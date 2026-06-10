-- DIAGNÓSTICO READ-ONLY — antes de aplicar APPLY_time_off.sql
-- Projeto oxypeople (ixtsnaxhgyoeaotrched). Não altera nada.

-- 1) Tabelas-alvo já existem? (esperado: false antes de aplicar)
SELECT table_name, (to_regclass('public.'||table_name) IS NOT NULL) AS existe
FROM (VALUES ('time_off'),('time_off_settings')) AS t(table_name);

-- 2) A coluna pipefy_card_id já existe em company_memberships?
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema='public' AND table_name='company_memberships' AND column_name='pipefy_card_id'
) AS coluna_existe;

-- 3) Helper is_company_admin existe? (esperado: true — a RLS depende dele)
SELECT to_regprocedure('public.is_company_admin(uuid,uuid)') IS NOT NULL AS helper_ok;

-- 4) Função update_updated_at existe? (esperado: true — trigger depende dela)
SELECT to_regprocedure('public.update_updated_at()') IS NOT NULL AS trigger_fn_ok;
