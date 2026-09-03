-- =============================================================================
-- Liderança: uma fonte só, lida do mesmo jeito em toda a ferramenta
-- =============================================================================
-- A empresa registra "quem lidera quem" em três lugares, e cada módulo escolhia
-- um deles:
--
--   company_memberships.manager_id   gestor da pessoa — 48 de 53 ativos
--   team_members.role = 'lead'       líder do time/squad — 16 de 31 times vazios
--   departments.leader_id            líder da área — 5 de 5
--
-- Nenhum dos três é completo sozinho, e quem lidera por um caminho não liderava
-- pelo outro. O efeito prático não era um aviso, era silêncio: Tiago Pisoni tem
-- 15 liderados e não lidera nenhum time, então para o OKR ele não liderava
-- ninguém; Vinicius lidera o Time de IA mas não é gestor de dois dos membros.
-- Sete gestores de gente ficaram no tier 'contributor' e não conseguiam criar
-- objetivo nem editar KR do próprio liderado.
--
-- A decisão (03/09/2026): a liderança é a UNIÃO dos três caminhos, e passa a
-- ser lida por uma função só. Continua entrando dado em um lugar — a ficha da
-- pessoa —, mas a leitura para de depender de qual módulo pergunta.
--
-- Risco: 🟡 Médio — amplia acesso de quem já lidera. Ninguém perde nada:
-- toda condição antiga continua no OR. Nenhum dado é alterado.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. leads_person — a pergunta canônica: "X lidera Y?"
-- -----------------------------------------------------------------------------
-- Sobe a cadeia de gestores a partir de Y em vez de descer a partir de X: uma
-- pessoa tem um gestor e pode ter muitos liderados, então subir visita menos
-- linhas. O teto de 50 saltos é o mesmo de prevent_manager_cycle — a cadeia
-- real tem 3 níveis, e o limite existe só para o caso de um ciclo escapar.
CREATE OR REPLACE FUNCTION public.leads_person(
  p_leader uuid,
  p_person uuid,
  p_company uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE cadeia AS (
    SELECT cm.user_id, cm.manager_id, 1 AS salto
      FROM public.company_memberships cm
     WHERE cm.user_id = p_person
       AND cm.company_id = p_company
       AND cm.status = 'active'
    UNION ALL
    SELECT cm.user_id, cm.manager_id, c.salto + 1
      FROM public.company_memberships cm
      JOIN cadeia c ON cm.user_id = c.manager_id
     WHERE cm.company_id = p_company
       AND cm.status = 'active'
       AND c.salto < 50
  )
  SELECT p_leader IS NOT NULL
     AND p_person IS NOT NULL
     AND p_leader <> p_person
     AND (
       -- (a) gestor direto ou em qualquer ponto acima na cadeia
       EXISTS (SELECT 1 FROM cadeia WHERE manager_id = p_leader)

       -- (b) líder do time onde a pessoa está. Quem lidera o time lidera
       --     também quem está nos squads pendurados nele.
       OR EXISTS (
         SELECT 1
           FROM public.team_members tl
           JOIN public.teams t_lider
             ON t_lider.id = tl.team_id
            AND t_lider.company_id = p_company
           JOIN public.teams t_alvo
             ON t_alvo.id = t_lider.id
             OR t_alvo.parent_team_id = t_lider.id
           JOIN public.team_members tp
             ON tp.team_id = t_alvo.id
            AND tp.user_id = p_person
          WHERE tl.user_id = p_leader
            AND lower(tl.role) IN ('lead', 'leader')
       )

       -- (c) líder da área da pessoa
       OR EXISTS (
         SELECT 1
           FROM public.company_memberships cm
           JOIN public.departments d ON d.id = cm.department_id
          WHERE cm.user_id = p_person
            AND cm.company_id = p_company
            AND cm.status = 'active'
            AND d.leader_id = p_leader
       )
     );
$$;

COMMENT ON FUNCTION public.leads_person(uuid, uuid, uuid) IS
  'Liderança efetiva: gestor (direto ou na cadeia) OU líder do time/squad OU '
  'líder da área. É a leitura única de "quem lidera quem" — qualquer módulo que '
  'precise da resposta pergunta aqui, nunca direto na tabela.';

-- -----------------------------------------------------------------------------
-- 2. led_user_ids — o outro lado: "quem eu lidero?"
-- -----------------------------------------------------------------------------
-- Mesma regra da leads_person, na direção contrária. Serve às telas (painel do
-- time, PDI do time, seletores) que precisam da lista, não do sim/não.
CREATE OR REPLACE FUNCTION public.led_user_ids(
  p_leader uuid,
  p_company uuid
)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE descendentes AS (
    SELECT cm.user_id, 1 AS salto
      FROM public.company_memberships cm
     WHERE cm.manager_id = p_leader
       AND cm.company_id = p_company
       AND cm.status = 'active'
    UNION
    SELECT cm.user_id, d.salto + 1
      FROM public.company_memberships cm
      JOIN descendentes d ON cm.manager_id = d.user_id
     WHERE cm.company_id = p_company
       AND cm.status = 'active'
       AND d.salto < 50
  ),
  uniao AS (
    SELECT user_id FROM descendentes

    UNION

    SELECT tp.user_id
      FROM public.team_members tl
      JOIN public.teams t_lider
        ON t_lider.id = tl.team_id
       AND t_lider.company_id = p_company
      JOIN public.teams t_alvo
        ON t_alvo.id = t_lider.id
        OR t_alvo.parent_team_id = t_lider.id
      JOIN public.team_members tp ON tp.team_id = t_alvo.id
     WHERE tl.user_id = p_leader
       AND lower(tl.role) IN ('lead', 'leader')

    UNION

    SELECT cm.user_id
      FROM public.company_memberships cm
      JOIN public.departments d ON d.id = cm.department_id
     WHERE cm.company_id = p_company
       AND cm.status = 'active'
       AND d.leader_id = p_leader
  )
  -- O vínculo de time não guarda status: alguém desligado continua na linha do
  -- time até alguém limpar. O filtro por membership ativa é o que impede um
  -- desligado de reaparecer como liderado.
  SELECT DISTINCT u.user_id
    FROM uniao u
    JOIN public.company_memberships cm
      ON cm.user_id = u.user_id
     AND cm.company_id = p_company
     AND cm.status = 'active'
   WHERE u.user_id <> p_leader;
$$;

COMMENT ON FUNCTION public.led_user_ids(uuid, uuid) IS
  'Todo mundo que p_leader lidera, pela mesma regra de leads_person. Só '
  'membros ativos — o vínculo de time sobrevive ao desligamento e traria '
  'desligado de volta.';

-- -----------------------------------------------------------------------------
-- 3. leads_anyone — "essa pessoa lidera alguém?"
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.leads_anyone(
  p_leader uuid,
  p_company uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.led_user_ids(p_leader, p_company));
$$;

COMMENT ON FUNCTION public.leads_anyone(uuid, uuid) IS
  'Atalho de leads_person para quando a pergunta é só "é líder de alguém?".';

-- -----------------------------------------------------------------------------
-- 4. is_direct_manager — a hierarquia formal, preservada
-- -----------------------------------------------------------------------------
-- Nem toda pergunta quer a união. Aprovar PDI e responder pelo desligamento são
-- atos do gestor formal, não de quem lidera o squad. A regra antiga continua
-- disponível com o nome que diz o que ela é.
CREATE OR REPLACE FUNCTION public.is_direct_manager(
  p_manager uuid,
  p_person uuid,
  p_company uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
     WHERE user_id = p_person
       AND manager_id = p_manager
       AND company_id = p_company
       AND status = 'active'
  );
$$;

COMMENT ON FUNCTION public.is_direct_manager(uuid, uuid, uuid) IS
  'Gestor formal e direto (company_memberships.manager_id), sem a união. Para '
  'atos que são do gestor e de mais ninguém.';

-- -----------------------------------------------------------------------------
-- 5. is_user_manager passa a responder pela regra única
-- -----------------------------------------------------------------------------
-- Mantém a assinatura porque as políticas de pdi_plans, pdi_actions,
-- pdi_competencies e feedback_requests já a chamam — mudar o corpo faz as seis
-- passarem a enxergar a hierarquia inteira sem tocar em nenhuma delas.
CREATE OR REPLACE FUNCTION public.is_user_manager(
  manager_uid uuid,
  subordinate_uid uuid,
  comp_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.leads_person(manager_uid, subordinate_uid, comp_id);
$$;

COMMENT ON FUNCTION public.is_user_manager(uuid, uuid, uuid) IS
  'Apelido histórico de leads_person. Era só o manager_id direto até 03/09/2026, '
  'quando a liderança passou a ser a união dos três caminhos. Use is_direct_manager '
  'quando a pergunta for mesmo sobre o gestor formal.';

-- -----------------------------------------------------------------------------
-- 6. OKR: quem lidera a pessoa passa a poder mexer no OKR dela
-- -----------------------------------------------------------------------------
-- Editar objetivo dependia de `okr_access_level = 'manager'`, um campo solto da
-- hierarquia. Sete gestores de gente ficaram em 'contributor' — Daniel Trindade
-- com 5 liderados entre eles — e não conseguiam tocar no objetivo do próprio
-- liderado. O tier continua valendo para quem não lidera ninguém; a liderança
-- agora entra como caminho próprio, e alcança só quem a pessoa lidera de fato.
CREATE OR REPLACE FUNCTION public.can_edit_objective(p_user uuid, p_obj_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.objectives o
     WHERE o.id = p_obj_id
       AND public.is_company_member(p_user, o.company_id)
       AND (
         o.owner_id = p_user
         OR o.assignee_id = p_user
         OR public.is_company_admin(p_user, o.company_id)
         OR public.has_okr_access(p_user, o.company_id, 'manager')
         OR EXISTS (
           SELECT 1 FROM public.objective_collaborators oc
            WHERE oc.objective_id = o.id
              AND oc.user_id = p_user
              AND oc.role IN ('editor', 'contributor')
         )
         -- Novo: o objetivo é de alguém que eu lidero.
         OR public.leads_person(p_user, o.owner_id, o.company_id)
         OR (o.assignee_id IS NOT NULL
             AND public.leads_person(p_user, o.assignee_id, o.company_id))
         -- Novo: o objetivo é do time que eu lidero.
         OR (o.team_id IS NOT NULL AND public.is_team_leader(p_user, o.team_id))
       )
  );
$$;

COMMENT ON FUNCTION public.can_edit_objective(uuid, uuid) IS
  'Dono, responsável, admin, tier manager, colaborador do objetivo — ou quem '
  'lidera o dono/responsável ou o time do objetivo (03/09/2026).';

-- Criar objetivo exigia tier manager ou admin. Quem lidera gente cria objetivo:
-- é metade do trabalho de liderar.
DROP POLICY IF EXISTS "okr_objectives_insert" ON public.objectives;

CREATE POLICY "okr_objectives_insert"
ON public.objectives FOR INSERT
WITH CHECK (
  is_company_member(auth.uid(), company_id)
  AND created_by = auth.uid()
  AND (
    has_okr_access(auth.uid(), company_id, 'manager')
    OR is_company_admin(auth.uid(), company_id)
    OR leads_anyone(auth.uid(), company_id)
  )
);

-- Os KRs seguem o objetivo: quem pode editar o objetivo mexe nos KRs dele. Sem
-- isso, o gestor recém-habilitado editaria o objetivo e travaria no primeiro KR.
DROP POLICY IF EXISTS "okr_key_results_insert" ON public.key_results;
CREATE POLICY "okr_key_results_insert"
ON public.key_results FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.objectives o
     WHERE o.id = key_results.objective_id
       AND (
         has_okr_access(auth.uid(), o.company_id, 'manager')
         OR is_company_admin(auth.uid(), o.company_id)
         OR can_edit_objective(auth.uid(), o.id)
       )
  )
);

DROP POLICY IF EXISTS "okr_key_results_update" ON public.key_results;
CREATE POLICY "okr_key_results_update"
ON public.key_results FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.objectives o
     WHERE o.id = key_results.objective_id
       AND (
         has_okr_access(auth.uid(), o.company_id, 'manager')
         OR is_company_admin(auth.uid(), o.company_id)
         OR can_edit_objective(auth.uid(), o.id)
       )
  )
);

DROP POLICY IF EXISTS "okr_key_results_delete" ON public.key_results;
CREATE POLICY "okr_key_results_delete"
ON public.key_results FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.objectives o
     WHERE o.id = key_results.objective_id
       AND (
         has_okr_access(auth.uid(), o.company_id, 'manager')
         OR is_company_admin(auth.uid(), o.company_id)
         OR can_edit_objective(auth.uid(), o.id)
       )
  )
);
