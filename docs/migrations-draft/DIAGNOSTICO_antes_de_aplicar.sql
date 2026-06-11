-- ============================================================
-- DIAGNÓSTICO READ-ONLY — rodar ANTES de aplicar APPLY_pdi_e_1on1.sql
-- Projeto: oxypeople (ixtsnaxhgyoeaotrched)
-- Não altera nada. Só confirma o terreno.
-- ============================================================

-- 1) As funções helper que as policies usam JÁ existem?
--    Esperado: todas como 'OK'. Se alguma vier 'FALTA', PARE e me avise.
SELECT
  'is_user_manager'  AS funcao, to_regprocedure('public.is_user_manager(uuid,uuid)') IS NOT NULL AS existe
UNION ALL SELECT 'is_company_admin',  to_regprocedure('public.is_company_admin(uuid)')  IS NOT NULL
UNION ALL SELECT 'is_company_member', to_regprocedure('public.is_company_member(uuid)') IS NOT NULL;

-- 2) As tabelas-alvo já existem? (se já existirem, o script é no-op seguro)
SELECT table_name,
       (to_regclass('public.' || table_name) IS NOT NULL) AS existe
FROM (VALUES
  ('one_on_ones'), ('one_on_one_topics'), ('one_on_one_notes'),
  ('pdi_plans'), ('pdi_competencies'), ('pdi_actions')
) AS t(table_name);

-- 3) Tabelas referenciadas por FK que precisam pré-existir.
--    Esperado: todas 'true'.
SELECT table_name,
       (to_regclass('public.' || table_name) IS NOT NULL) AS existe
FROM (VALUES
  ('users'), ('companies'), ('performance_evaluations'),
  ('performance_cycles'), ('feedback_requests')
) AS t(table_name);
