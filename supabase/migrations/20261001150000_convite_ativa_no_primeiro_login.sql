-- Convidado vira membro ativo no primeiro login.
--
-- O invite-user cria a membership com status 'invited' — é o que a tela de
-- Convites lista como pendente. Mas nada promovia esse status: a pessoa
-- entrava com a senha do e-mail e is_company_member (que exige 'active') a
-- deixava sem enxergar nada da empresa.
--
-- O Supabase Auth atualiza auth.users.last_sign_in_at a cada login; no
-- primeiro, todas as memberships 'invited' daquela pessoa passam a 'active'.
-- 'pending' e 'inactive' não são tocados — desligado continua desligado.

CREATE OR REPLACE FUNCTION public.ativar_convite_no_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.last_sign_in_at IS NOT NULL
     AND NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    UPDATE public.company_memberships
    SET status = 'active',
        joined_at = COALESCE(joined_at, now()),
        updated_at = now()
    WHERE user_id = NEW.id
      AND status = 'invited';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.ativar_convite_no_login() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS ativar_convite_no_login ON auth.users;
CREATE TRIGGER ativar_convite_no_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.ativar_convite_no_login();
