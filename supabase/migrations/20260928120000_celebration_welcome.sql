-- Admissão do dia entra na rotina de celebrações.
--
-- O Feedz publicava as boas-vindas de quem começava; na migração isso ficou de
-- fora e o RH passou a avisar à mão. O celebrations-dispatch agora gera o kind
-- 'welcome' quando hire_date é hoje, e o registro diário precisa aceitá-lo
-- para a trava de "já enviado hoje" valer também para ele.

ALTER TABLE public.celebration_dispatches
  DROP CONSTRAINT IF EXISTS celebration_dispatches_kind_check;

ALTER TABLE public.celebration_dispatches
  ADD CONSTRAINT celebration_dispatches_kind_check
  CHECK (kind IN ('birthday', 'work_anniversary', 'welcome'));
