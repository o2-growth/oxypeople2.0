# Runbook — Deploy & configuração pós-brownfield

**Última atualização:** 2026-07-24
**Audiência:** admin/owner do projeto oxypeople (você)
**Objetivo:** levar todo o trabalho dos últimos commits ao ar com segurança.

> ⚠️ **Correção de banco (2026-07-24).** Este runbook originalmente apontava para o projeto Supabase `pkwsbpxhwjewbiyiquad` (banco do deploy Lovable v1, hoje só servido em `oxy-people.o2inc.com.br` de forma congelada). O projeto de **produção atual é `ixtsnaxhgyoeaotrched`** (Vercel `oxypeople20.vercel.app`) — todas as referências abaixo foram atualizadas. Demais passos (paths `/Users/macos/...`, Resend, migrations `0001-0003`) permanecem como snapshot histórico e podem estar defasados; valide contra o código antes de executar.

Este documento lista, em ordem, **toda ação manual** que precisa acontecer fora do código para o sistema funcionar em produção. Marque conforme avança.

---

## 0. Pré-requisitos

- [ ] Acesso de owner ao projeto Supabase (`ixtsnaxhgyoeaotrched`)
- [ ] Acesso ao Google Cloud Console com permissão para criar OAuth Client
- [ ] Acesso ao DNS do domínio o2-growth (para SPF/DKIM/DMARC)
- [ ] Conta Resend criada (ou outro provedor de e-mail transacional)
- [ ] CLI Supabase instalada localmente: `npm i -g supabase` (ou `brew install supabase/tap/supabase`)
- [ ] Login: `supabase login` + `supabase link --project-ref ixtsnaxhgyoeaotrched`

---

## 1. Aplicar migrations (ordem obrigatória)

Migrations stagedas em `supabase/migrations/`:

| Arquivo | O que faz | Risco |
|---------|-----------|-------|
| `20260427075955_fix_fragilities.sql` | RLS hardening + helper `is_user_manager` + DELETE policies que faltavam + indices | 🟢 Aditiva |
| `20260501003200_add_manager_id.sql` | + `company_memberships.manager_id` + trigger anti-ciclo + helpers `get_org_subtree` / `get_org_ancestors` | 🟡 Aditiva (mas afeta organograma) |
| `20260501003201_okr_hardening.sql` | + `key_results.confidence` + `objectives.commitment_type` + nova tabela `objective_comments` + trigger `validate_period_no_overlap` | 🟡 Aditiva |

**Pré-check antes de aplicar `20260501003201`** (verifica se há períodos já sobrepostos no banco — o trigger novo bloqueará INSERT/UPDATE futuros):

```sql
-- Cole no SQL Editor do Supabase Dashboard
SELECT p1.id, p1.name, p2.id, p2.name
FROM periods p1
JOIN periods p2
  ON p1.company_id = p2.company_id
  AND p1.id <> p2.id
  AND (p1.start_date, p1.end_date) OVERLAPS (p2.start_date, p2.end_date);
```

Se retornar linhas → resolva os overlaps antes (renomear ou deletar) — dados antigos não são afetados pelo trigger novo, mas você quer tudo limpo.

**Aplicação:**

```bash
cd /Users/macos/oxypeople
supabase db push   # aplica todas as migrations não-aplicadas em ordem
```

Verifique no Supabase Dashboard → Database → Migrations que as 3 entradas aparecem.

**Após aplicar:**

```bash
supabase gen types typescript --project-id ixtsnaxhgyoeaotrched > src/integrations/supabase/types.ts
```

Isso regenera `types.ts` com a nova schema. Os `// NOTE:` comments que adicionei manualmente serão substituídos pelos tipos gerados — sem drift.

Confirme com:

```bash
npm run typecheck
```

Deve continuar limpo.

---

## 2. Configurar Google OAuth (Story 0.2 — Lovable Auth removido)

O commit `2b726ca` removeu o broker do Lovable Cloud. Agora o login Google passa pelo Supabase nativo. Você precisa recriar o OAuth Client no Google e ligar no Supabase.

### 2.1 Google Cloud Console

1. https://console.cloud.google.com → escolha (ou crie) o projeto do o2-growth
2. **APIs & Services → OAuth consent screen** (se ainda não configurado)
   - User Type: **Internal** (porque é só o2-growth — não precisa verificação Google)
   - App name: `oxypeople`
   - Logo, support email, links → preencha
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `oxypeople — Supabase`
   - Authorized JavaScript origins:
     - `https://ixtsnaxhgyoeaotrched.supabase.co`
     - `http://localhost:8080` (dev)
     - `https://<seu-domínio-prod>` (quando tiver)
   - Authorized redirect URIs:
     - `https://ixtsnaxhgyoeaotrched.supabase.co/auth/v1/callback`
4. Copie o **Client ID** e **Client Secret**

### 2.2 Supabase Dashboard

1. https://supabase.com/dashboard/project/ixtsnaxhgyoeaotrched → **Authentication → Providers**
2. Encontre **Google** → ative
3. Cole `Client ID` e `Client Secret` do passo 2.1
4. Salvar

### 2.3 Validação

Em `localhost:8080`, faça login com Google. Deve cair em `/` autenticado.

Se ver erro `redirect_uri_mismatch` → URL no Google Cloud Console está diferente do que o Supabase usa. Confirme que tem **exatamente** `https://ixtsnaxhgyoeaotrched.supabase.co/auth/v1/callback`.

---

## 3. Variáveis de ambiente (`.env`)

Edite `/Users/macos/oxypeople/.env`:

```env
# Já existentes (públicas — embed no bundle)
VITE_SUPABASE_PROJECT_ID="ixtsnaxhgyoeaotrched"
VITE_SUPABASE_PUBLISHABLE_KEY="..."
VITE_SUPABASE_URL="https://ixtsnaxhgyoeaotrched.supabase.co"

# Adicionar (públicas — Sentry/PostHog DSN são desenhadas para client-side)
VITE_SENTRY_DSN="https://<key>@<org>.ingest.sentry.io/<project>"
VITE_POSTHOG_KEY="phc_..."
VITE_POSTHOG_HOST="https://us.i.posthog.com"
```

**Como obter:**
- **Sentry**: sentry.io → criar projeto React → copiar DSN
- **PostHog**: posthog.com → criar projeto → Settings → Project API Keys → "Project API Key"

Sem essas, observability fica em modo no-op (não quebra nada).

---

## 4. E-mail transacional (Frente F.y — Resend)

A edge function `invite-user` (commit do Dex(F)) tenta usar Resend se a env var existir. Sem ela, cai no fluxo padrão do Supabase Auth (envia magic link via servidor SMTP padrão da Supabase, com domínio supabase).

Para usar domínio o2-growth no remetente:

### 4.1 Resend

1. https://resend.com → criar conta
2. **Domains → Add Domain** → `o2-growth.com.br` (ou o que for)
3. Resend dá 3 entradas DNS para adicionar:
   - **SPF** (TXT)
   - **DKIM** (CNAME ou TXT)
   - **DMARC** (TXT — opcional mas recomendado)
4. Adicione no painel DNS do domínio (CloudFlare / Registro.br / o que for)
5. Volte no Resend → **Verify domain** → aguarde validação (5-30 min)
6. Crie uma **API Key** (Full access)

### 4.2 Supabase Edge Function

```bash
# Salvar a chave como secret na Supabase
supabase secrets set RESEND_API_KEY=re_xxxxxxx

# Deploy a edge function
supabase functions deploy invite-user

# (Opcional) Deploy as outras edge functions já existentes
supabase functions deploy okr-escalation
```

### 4.3 Validação

`/admin/invitations` no app → criar convite com seu próprio e-mail → deve receber.

---

## 5. Cron OKR escalation (opcional — Story 1.5 cron)

**Requer Supabase plan Pro+** (pg_cron + pg_net). Se está no Free, pule esta seção e use o botão "Rodar agora" em `/admin/okr-escalation` manualmente, ou configure GitHub Actions schedule chamando a edge function.

Quando tiver Pro:

```bash
# Aplicar migration 0009 (ainda em docs/migrations-draft/)
cp docs/migrations-draft/0009_pg_cron_jobs.sql supabase/migrations/$(date -u +%Y%m%d%H%M%S)_pg_cron_jobs.sql
supabase db push
```

Verifica no Dashboard → Database → Cron jobs que `okr-escalation-daily` aparece.

---

## 6. Configuração de admin inicial

Por enquanto, criar a primeira conta admin é manual:

1. Faça signup pelo `/auth` (e-mail/senha ou Google)
2. SQL Editor:

```sql
-- Substitua <SEU_USER_ID> pelo seu ID em auth.users
-- (consulte com: SELECT id, email FROM auth.users)

-- Garante que existe company
INSERT INTO companies (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'o2-growth')
ON CONFLICT DO NOTHING;

-- Cria membership
INSERT INTO company_memberships (user_id, company_id, status)
VALUES ('<SEU_USER_ID>', '00000000-0000-0000-0000-000000000001', 'active')
ON CONFLICT DO NOTHING;

-- Atribui role admin
INSERT INTO user_roles (user_id, company_id, role)
VALUES ('<SEU_USER_ID>', '00000000-0000-0000-0000-000000000001', 'owner')
ON CONFLICT DO NOTHING;
```

A partir daí, `/admin/invitations`, `/admin/periods`, `/admin/managers`, `/admin/okr-escalation` ficam disponíveis para você convidar o resto do time.

---

## 7. LGPD — Política de Privacidade interna (Frente F.1)

Mesmo sendo ferramenta interna, o Brasil exige Política de Privacidade quando você processa dados pessoais de funcionários (CPF, e-mail, hierarquia, performance). Escopo light:

- [ ] Designar **DPO interno** (Data Protection Officer) — alguém da empresa, formal por e-mail
- [ ] Escrever **Política de Privacidade interna** explicando: dados coletados, finalidade (gestão de pessoas), retenção (até 5 anos pós-desligamento, padrão), direitos do titular (acesso, correção, eliminação)
- [ ] Manter **RAT (Registro de Atividades de Tratamento)** — planilha simples listando: tipo de dado, base legal, prazo de retenção. Modelo da ANPD: https://www.gov.br/anpd
- [ ] Página `/legal/privacidade` no app linkando o PDF/HTML interno
- [ ] Registro no setup de admin: data de aceite da política por usuário

**NÃO precisa de:** advogado externo, ToS para clientes pagantes, DPA público, contrato de processamento (você é o controlador único).

---

## 8. Push para origin

Quando tudo acima estiver feito e validado em staging:

```bash
git push origin main
```

Confira no GitHub:
- CI workflow (`.github/workflows/ci.yml`) deve rodar e passar (lint + typecheck + test + build).
- Se rodando em domínio próprio, fazer build de prod e deploy (Vercel/Netlify/etc — ainda não configurado neste repo).

---

## 9. Checklist consolidado

**Antes do primeiro deploy interno:**
- [ ] Migrations 0001-0003 aplicadas + types regenerados
- [ ] Google OAuth configurado em GCC + Supabase
- [ ] Sentry + PostHog DSN no `.env`
- [ ] Edge functions deployadas (`okr-escalation`, `invite-user`)
- [ ] Resend configurado + RESEND_API_KEY como Supabase secret
- [ ] DNS SPF/DKIM/DMARC validado no Resend
- [ ] Conta admin inicial criada via SQL
- [ ] Política de Privacidade redigida e DPO designado
- [ ] Smoke test: login Google + criar objetivo + check-in + convite + organograma

**Após primeiro rollout:**
- [ ] Convidar 5-10 pessoas como piloto interno
- [ ] Coletar feedback por 1-2 semanas
- [ ] Cutoff Feedz: data X (a definir com a liderança)

---

## 10. Suporte e troubleshooting

Erros comuns:

| Sintoma | Causa provável | Resolução |
|---------|----------------|-----------|
| `redirect_uri_mismatch` no Google login | Redirect URI faltando no GCC | Seção 2.1 |
| Convite não chega no e-mail | DNS não validado ou RESEND_API_KEY faltando | Seção 4 |
| `permission denied for table objectives` | Migration 0001 não aplicada (RLS sem policy) | Seção 1 |
| Login Google funciona mas usuário sem permissão | Conta admin não criada via SQL | Seção 6 |
| Cron escalation não dispara | Plano Free (pg_cron requer Pro) | Seção 5 — usar botão manual |
| Build falha após `supabase gen types` | Algum hook usa um campo que foi removido na regen | Comparar antes/depois e ajustar |

---

**Próxima atualização deste runbook:** após primeira semana de uso interno, com lições aprendidas + ajustes.
