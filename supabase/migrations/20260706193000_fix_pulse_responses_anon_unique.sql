-- Fix: permitir múltiplas respostas ANÔNIMAS por período em pulse_responses.
--
-- A constraint original (migration 20260504050438_pulse_survey) usava
-- `UNIQUE NULLS NOT DISTINCT (pulse_survey_id, user_id, period_start)`.
-- Em pulses anônimos o user_id é NULL, e NULLS NOT DISTINCT trata todos os
-- NULLs como iguais → apenas a 1ª resposta anônima do período era aceita;
-- da 2ª em diante o INSERT falhava com unique_violation (23505). O front
-- exibia "Você já respondeu este Pulse" e a resposta se perdia.
--
-- Com NULLS DISTINCT (padrão do Postgres) cada NULL é independente:
--   - respostas ANÔNIMAS (user_id NULL): múltiplas por período (1 por pessoa,
--     controlado client-side via ack local em localStorage);
--   - respostas IDENTIFICADAS (user_id preenchido): unicidade 1-por-usuário
--     por período permanece intacta.

ALTER TABLE public.pulse_responses
  DROP CONSTRAINT IF EXISTS pulse_responses_unique_user_period;

ALTER TABLE public.pulse_responses
  ADD CONSTRAINT pulse_responses_unique_user_period
  UNIQUE NULLS DISTINCT (pulse_survey_id, user_id, period_start);
