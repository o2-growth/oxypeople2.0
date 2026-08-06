-- =============================================================================
-- Reconhecer 'lead' como papel de líder de time
-- =============================================================================
-- `team_members.role` foi criada com o comentário `-- leader, member`, mas a
-- interface só insere 'member' (o default) e todo o cadastro de líderes foi
-- feito por script gravando 'lead'. Hoje são 9 linhas 'lead' e zero 'leader'.
--
-- Estas três funções comparam com 'leader' e por isso nunca casam. Como
-- `is_team_leader` é usada na RLS de `objectives` e `key_results`, o efeito
-- prático é que quem lidera um time não consegue editar os objetivos dele —
-- falha silenciosa, que aparece como "não tenho permissão" sem explicação.
--
-- Aceitar as duas grafias em vez de reescrever os dados: 'leader' pode voltar a
-- entrar por qualquer chamada antiga que passe role explícito, e uma função que
-- entende as duas nunca mais erra por isso.
--
-- Risco: 🟢 Baixo — só amplia o que já casava. Ninguém perde acesso.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_team_leader(p_user_id uuid, p_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = p_user_id
    AND team_id = p_team_id
    AND role IN ('lead', 'leader')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_any_team_leader(p_user_id uuid, p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.teams t ON tm.team_id = t.id
    WHERE tm.user_id = p_user_id
    AND tm.role IN ('lead', 'leader')
    AND t.company_id = p_company_id
  )
$$;

CREATE OR REPLACE FUNCTION public.get_led_teams(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM public.team_members
  WHERE user_id = p_user_id
  AND role IN ('lead', 'leader')
$$;

COMMENT ON COLUMN public.team_members.role IS
  'lead (aceita o histórico "leader") | member. A mesma pessoa pode ter linhas '
  'em times diferentes: quem lidera uma frente e atende como CFO ocupa duas '
  'cadeiras de verdade. O UNIQUE(team_id, user_id) impede repetir no mesmo time.';
