-- =============================================================================
-- Hierarquia Área → Time → Squad
-- =============================================================================
-- A estrutura da empresa tem três níveis, mas `teams` era plano: só uma lista
-- ligada a um departamento. Squad de Aquisição, Squad Inbound e as células de
-- CFO ficavam no mesmo nível dos times, sem dizer a quem pertencem.
--
-- Área continua sendo `departments`. Time e squad vivem os dois em `teams`,
-- distinguidos por `parent_team_id`: quem tem pai é squad, quem não tem é time.
-- Uma tabela separada para squads duplicaria membros, permissões e RLS sem
-- ganhar nada — a diferença entre os dois é a posição na árvore, não a natureza.
--
-- Risco: 🟢 Baixo — colunas aditivas. Nenhum dado alterado.
-- =============================================================================

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS parent_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  -- Time anunciado mas ainda sem operação (Eventos, Franchising): aparece na
  -- estrutura marcado, em vez de sumir ou parecer um time vazio por descuido.
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'building', 'archived')),
  ADD COLUMN IF NOT EXISTS order_index integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_teams_parent
  ON public.teams(parent_team_id) WHERE parent_team_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_teams_company_order
  ON public.teams(company_id, order_index);

-- Um squad não pode ser pai de outro: a estrutura tem três níveis e mais que
-- isso vira árvore que ninguém navega. Também impede ciclo (A pai de B, B pai
-- de A), que travaria qualquer leitura recursiva.
CREATE OR REPLACE FUNCTION public.check_team_depth()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_avo uuid;
BEGIN
  IF NEW.parent_team_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.parent_team_id = NEW.id THEN
    RAISE EXCEPTION 'Um time não pode ser pai de si mesmo';
  END IF;

  SELECT parent_team_id INTO v_avo FROM public.teams WHERE id = NEW.parent_team_id;
  IF v_avo IS NOT NULL THEN
    RAISE EXCEPTION 'Squad não pode conter outro squad: a estrutura tem três níveis (área → time → squad)';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_team_depth ON public.teams;
CREATE TRIGGER trg_check_team_depth
  BEFORE INSERT OR UPDATE OF parent_team_id ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.check_team_depth();

COMMENT ON COLUMN public.teams.parent_team_id IS
  'Time ao qual este squad pertence. NULL = é um time (segundo nível), preenchido = é um squad (terceiro nível).';
COMMENT ON COLUMN public.teams.status IS
  'active | building (anunciado, ainda sem operação) | archived';
