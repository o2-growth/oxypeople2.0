-- handle_new_user tolerante a linha pré-existente em public.users.
--
-- Contexto: existem linhas em public.users sem conta correspondente em
-- auth.users (o FK users.id -> auth.users.id não existe mais no banco vivo).
-- Quando essa pessoa tenta entrar com Google, o GoTrue cria o auth user com um
-- id NOVO, este trigger tenta inserir o e-mail que já existe (unique
-- idx_users_email) e o signup inteiro falha com "Database error saving new
-- user". Caso real: karen.langhanz@o2inc.com.br.
--
-- O corpo abaixo espelha a versão que está VIVA no banco (que difere da
-- migração original: seta display_name em vez de avatar_url — o banco é
-- compartilhado com outro app que depende disso). A única mudança é o
-- ON CONFLICT sem alvo: cobre tanto a PK (id) quanto a unique de e-mail, então
-- linha já existente vira no-op em vez de derrubar o signup. A recuperação da
-- linha órfã é feita fora daqui, criando o auth user com o MESMO id da linha
-- existente (scripts/fix-karen-auth.mjs).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
