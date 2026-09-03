-- =============================================================================
-- Celebrações: registro do que já foi comunicado
-- =============================================================================
-- Aniversário e o2versário voltam a ser comunicados (Slack + e-mail), como o
-- Feedz fazia até 25/07/2026 — a data está no cadastro desde sempre, o que
-- sumiu na migração foi o aviso.
--
-- Esta tabela existe por um motivo só: a rotina roda por agendador externo e
-- pode ser disparada de novo no mesmo dia (retry do GitHub Actions, execução
-- manual, duas instâncias). Sem um registro do que já saiu, a pessoa recebe o
-- parabéns duas vezes — e o segundo estraga o primeiro.
--
-- O mural NÃO passa por aqui: lá o card é derivado da data de nascimento e da
-- admissão em tempo de leitura (useHRCalendar), então não há o que duplicar.
--
-- Risco: 🟢 Baixo — tabela nova, nada existente é tocado.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.celebration_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  kind text NOT NULL CHECK (kind IN ('birthday', 'work_anniversary')),
  -- O dia comemorado, não o dia do envio: se a rotina atrasar e rodar depois
  -- da meia-noite, ainda é a celebração daquela data.
  ref_date date NOT NULL,
  -- Anos de casa no o2versário; NULL no aniversário.
  years integer,

  slack_ok boolean NOT NULL DEFAULT false,
  emails_sent integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (company_id, user_id, kind, ref_date)
);

CREATE INDEX IF NOT EXISTS idx_celebration_dispatches_dia
  ON public.celebration_dispatches(company_id, ref_date DESC);

ALTER TABLE public.celebration_dispatches ENABLE ROW LEVEL SECURITY;

-- Só leitura, e só para admin: é registro operacional, não conteúdo. Quem
-- escreve é a rotina, com service_role, que não passa por policy.
DROP POLICY IF EXISTS "Admin ve celebracoes enviadas" ON public.celebration_dispatches;
CREATE POLICY "Admin ve celebracoes enviadas"
ON public.celebration_dispatches FOR SELECT
USING (is_company_admin(auth.uid(), company_id));

COMMENT ON TABLE public.celebration_dispatches IS
  'O que a rotina de celebrações já comunicou. Existe para não parabenizar '
  'duas vezes quando a rotina roda mais de uma vez no mesmo dia.';
