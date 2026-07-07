-- Registro de PARTICIPAÇÃO em pulses (persistente, server-side).
--
-- Motivo: em pulse anônimo a resposta grava user_id NULL, então não havia como
-- saber, do lado do servidor, quem já respondeu. O "já respondeu" ficava só no
-- localStorage (por navegador, some ao limpar cache) → o widget reabria a cada
-- carregamento. Esta tabela guarda QUEM participou (sem a nota), preservando o
-- anonimato da resposta em pulse_responses, e serve de guarda anti-dupla e de
-- fonte de verdade para esconder o pulse de quem já respondeu.

CREATE TABLE IF NOT EXISTS public.pulse_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pulse_survey_id uuid NOT NULL REFERENCES public.pulse_surveys(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pulse_participants_unique UNIQUE (pulse_survey_id, user_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_pulse_participants_lookup
  ON public.pulse_participants(pulse_survey_id, user_id, period_start);

ALTER TABLE public.pulse_participants ENABLE ROW LEVEL SECURITY;

-- Cada pessoa registra e enxerga apenas a própria participação.
DROP POLICY IF EXISTS "own participation insert" ON public.pulse_participants;
CREATE POLICY "own participation insert"
  ON public.pulse_participants FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "own participation select" ON public.pulse_participants;
CREATE POLICY "own participation select"
  ON public.pulse_participants FOR SELECT
  USING (user_id = auth.uid());
