-- =============================================================================
-- Prazo de resposta separado do fim do ciclo
-- =============================================================================
-- Um ciclo de avaliação tem duas datas de fim que não são a mesma coisa:
-- quando as pessoas param de responder e quando o processo inteiro termina.
--
-- No Full 02/2026 as respostas vão até 13/08 e as devolutivas até 27/08. Com
-- uma coluna só, escolher `end_date = 27/08` faz a plataforma anunciar "faltam
-- 21 dias" para quem tem 7 — e a Etapa 1 fura. Escolher 13/08 esconde metade
-- do processo do card.
--
-- `response_deadline` passa a ser o prazo cobrado (contador, due_date das
-- avaliações, texto dos comunicados) e `end_date` continua sendo o fim do
-- processo. Nulo mantém o comportamento antigo: quem não separa as duas datas
-- continua sendo cobrado pelo `end_date`.
--
-- Risco: 🟢 Baixo — coluna aditiva e opcional. Ciclos existentes não mudam.
-- =============================================================================

ALTER TABLE public.performance_cycles
  ADD COLUMN IF NOT EXISTS response_deadline date;

-- Responder depois do processo ter terminado não faz sentido; antes do início,
-- também não.
ALTER TABLE public.performance_cycles
  DROP CONSTRAINT IF EXISTS performance_cycles_response_deadline_range;
ALTER TABLE public.performance_cycles
  ADD CONSTRAINT performance_cycles_response_deadline_range
  CHECK (
    response_deadline IS NULL
    OR (response_deadline >= start_date AND response_deadline <= end_date)
  );

COMMENT ON COLUMN public.performance_cycles.response_deadline IS
  'Até quando as avaliações podem ser respondidas. Nulo = usa end_date. '
  'Existe porque o fim do processo (calibragem, devolutivas) costuma ser bem '
  'depois do prazo de resposta, e é o prazo de resposta que a plataforma cobra.';
