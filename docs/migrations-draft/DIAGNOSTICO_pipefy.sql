-- ============================================================
-- DIAGNÓSTICO READ-ONLY — Integração Pipefy (people sync)
-- Projeto: oxypeople (ixtsnaxhgyoeaotrched). Não altera nada.
-- ============================================================

-- 1) Existe configuração de sync? (qual tabela do Pipefy, mapeamento, último sync)
SELECT company_id, table_id, sync_status, last_sync_at,
       field_mapping, created_at, updated_at
FROM public.pipefy_sync_config;
-- Esperado se NUNCA configurado: 0 linhas.

-- 2) Histórico de execuções da sync (últimas 10)
SELECT created_at, status, records_processed, records_updated, error_message
FROM public.pipefy_sync_logs
ORDER BY created_at DESC
LIMIT 10;
-- Esperado se nunca rodou (functions não deployadas): 0 linhas.

-- 3) De onde vieram os 48 colaboradores? (status + se têm auth user)
SELECT cm.status, COUNT(*) AS qtd
FROM public.company_memberships cm
GROUP BY cm.status
ORDER BY qtd DESC;

-- 4) Convites registrados pelo app (insert direto em invites funciona sem edge function)
SELECT status, COUNT(*) AS qtd
FROM public.invites
GROUP BY status;
