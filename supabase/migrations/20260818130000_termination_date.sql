-- =============================================================================
-- Quando e por que a pessoa saiu — consolidado em last_working_day
-- =============================================================================
-- A plataforma marcava a membership como inactive sem exibir data nem motivo —
-- e o RH precisa exatamente disso ("quem saiu e o dia que saiu", caso Monthly
-- de agosto/2026). As colunas já existiam do import do Feedz
-- (20260803130000: last_working_day, termination_reason, termination_type);
-- esta migração só as oficializa como destino do pipefy-sync, que passa a
-- preenchê-las a partir da table Pessoas ("Data de desligamento" e "Motivo de
-- desligamento") junto com o status ativo/inativo.
--
-- Nota de percurso: uma coluna termination_date chegou a ser criada e foi
-- dropada em seguida ao descobrir a last_working_day — mesma coisa, nome novo.
--
-- Risco: 🟢 Baixo — só comentários; colunas já existiam.
-- =============================================================================

COMMENT ON COLUMN public.company_memberships.last_working_day IS
  'Data do desligamento. Fontes: import Feedz (histórico) e pipefy-sync '
  '(table Pessoas, campo "Data de desligamento").';

COMMENT ON COLUMN public.company_memberships.termination_reason IS
  'Motivo do desligamento como registrado no Pipefy ou no Feedz.';
