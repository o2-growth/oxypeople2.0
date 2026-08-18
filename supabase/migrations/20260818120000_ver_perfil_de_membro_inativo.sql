-- =============================================================================
-- Perfil de colega inativo volta a ser visível
-- =============================================================================
-- A tela de RH filtra "Inativos" e mostra "Sem nome" em todas as linhas: a
-- membership aparece, mas o join com public.users volta NULL. Causa: a policy
-- viva `users_select_company_members` (que divergiu das migrations, como no
-- caso handle_new_user) exige status 'active' dos DOIS lados — de quem vê
-- (cm1, correto) e de quem é visto (cm2, errado). Desativar alguém não pode
-- apagar o nome dele da empresa: o RH precisa saber quem saiu.
--
-- O ALTER mantém a policy única e só remove a condição sobre cm2.status.
-- Risco: 🟢 Baixo — só amplia SELECT para perfis de ex-colegas da MESMA
-- empresa, que era o comportamento original de 20260130173340.
-- =============================================================================

ALTER POLICY users_select_company_members ON public.users
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.company_memberships cm1
      JOIN public.company_memberships cm2 ON cm1.company_id = cm2.company_id
      WHERE cm1.user_id = auth.uid()
        AND cm2.user_id = users.id
        AND cm1.status = 'active'
    )
  );
