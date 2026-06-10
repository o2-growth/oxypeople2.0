# Guia de Handoff — oxypeople MVP

**Data:** 2026-04-30
**Contexto:** Este documento é o ponto de partida para uma nova IA dar continuidade ao desenvolvimento do oxypeople. Leia na íntegra antes de tocar em qualquer arquivo.

> ⚠️ **AVISO DE DEFASAGEM (revisado em 2026-06-09).** Este handoff é um **snapshot histórico de 2026-04-30** e várias seções estão desatualizadas:
> - As "migrations 0001–0003 staged/não-aplicadas" descritas aqui **nunca existiram com esse nome**. As migrations reais usam prefixo de timestamp (`supabase/migrations/2026...`) e somam **52 arquivos**, indo até `20260527120003_pdi_approval_guard.sql`.
> - Os Sprints 1–4 (OKR hardening, Organograma 2.0, Pulse, Nine Box, Feedback Contínuo, 1:1s, PDI, cron) **já têm migration e código no repo** — o projeto avançou ~1 mês além deste documento.
> - **Não trate as pendências/bloqueadores listados abaixo como estado atual.** Valide cada item contra o código, `supabase/migrations/` e o `git log` antes de agir.
>
> Seções ainda válidas: stack, convenções obrigatórias (§"Convenções"), regras de migration aditiva e RLS, e o contexto de produto (ferramenta interna, não-SaaS).

---

## 1. O que é este projeto

**oxypeople** é uma ferramenta interna de gestão de pessoas desenvolvida pela o2-growth para substituir o Feedz (TOTVS). **NÃO é um SaaS comercial.** Apenas os colaboradores da o2-growth usam. Não há billing, landing page, plano Free/Pro, nem onboarding de terceiros.

- **Empresa-alvo:** o2-growth (uma única empresa)
- **Usuários:** colaboradores convidados por e-mail pelo admin
- **Objetivo final:** substituir 100% das funcionalidades do Feedz usadas internamente

### Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Vite + React 18 + TypeScript |
| UI | shadcn/ui + Tailwind CSS |
| Estado assíncrono | @tanstack/react-query v5 |
| Formulários | react-hook-form + Zod |
| Toasts | sonner |
| Roteamento | react-router-dom v6 |
| Organograma | reactflow ^11.11.4 |
| Gráficos | recharts |
| Export | html-to-image (PNG), toPng |
| Backend | Supabase (Postgres + RLS + Auth + Edge Functions Deno + Realtime) |
| Observabilidade | Sentry @8.45.0 + PostHog ^1.205.0 |
| Testes | Vitest + @testing-library/react (79 testes passando) |
| CI | GitHub Actions (lint + typecheck + test + build) |

### Convenções obrigatórias

- **Idioma da UI:** sempre PT-BR
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`) + `Co-Authored-By: Claude`
- **Migrations:** APENAS aditivas — nunca DELETE/DROP/UPDATE em dados existentes
- **RLS:** toda tabela nova precisa de RLS + policies; helpers `is_company_member()` e `is_company_admin()` já existem
- **PostHog:** todo evento significativo rastreado com `trackEvent(event, props)` de `src/lib/analytics.ts`
- **Toast de erro:** sempre PT-BR, via sonner `toast.error()`
- **Padrão de hook:** `useXxx` em `src/hooks/`, sempre invalida queries com `queryClient.invalidateQueries` após mutações

---

## 2. Estado atual do código (o que está PRONTO)

### Sprints 0-2 — IMPLEMENTADOS (merged em main)

| Sprint | Story | O que entregou |
|--------|-------|----------------|
| 0.1 | RLS hardening | Migration `0001_fix_fragilities.sql` staged |
| 0.2 | Auth | Lovable Auth removido → Supabase native OAuth Google |
| 0.3 | Sentry | `src/lib/observability.ts` + ErrorBoundary + SentryRoutes |
| 0.4 | PostHog | `src/lib/analytics.ts` + identificação no sign-in/out |
| 1.1 | Períodos admin | `/admin/periods` (CRUD completo, dialog Zod) |
| 1.2 | Comments OKR | `objective_comments` — tab realtime em ObjectiveDetail |
| 1.3 | KR confidence | slider 0-100 com badge colorido + debounce 500ms |
| 1.4 | Commitment type | enum committed/aspirational + badge na UI |
| 1.5 | OKR escalation | edge fn `okr-escalation` + UI manual `/admin/okr-escalation` |
| 1.6 | Collaborators | aba editar colaboradores em objetivos |
| 1.7 | Enum sync | `objective_type` alinhado TS↔DB em `src/lib/objective-types.ts` |
| 2.1 | Manager admin | `/admin/managers` — tabela bulk assignment, hook `useManagers` |
| 2.2-2.5 | Organograma | reactflow visual com filtros, minimap, export PNG, drawer |
| 2.6 | Drag-drop org | drag de nó sobre nó → reatribuição de gestor com toast confirm |
| F.x | Convites | `/admin/invitations` + edge fn `invite-user` (Resend opcional) |

### Arquivos chave

```
src/
├── lib/
│   ├── observability.ts      # Sentry init + SentryRoutes export
│   ├── analytics.ts          # PostHog init + trackEvent + identify
│   └── objective-types.ts    # ObjectiveType enum (source of truth)
├── contexts/AuthContext.tsx   # setSentryUser/identifyUser on login
├── hooks/
│   ├── useManagers.ts         # manager_id CRUD + bulkSetManager
│   ├── useInvitations.ts      # inviteUser, resendInvite, cancelInvite
│   ├── useObjectiveComments.ts  # CRUD + realtime
│   ├── useObjectiveCollaborators.ts
│   ├── usePeriodsAdmin.ts     # CRUD períodos + count objetivos
│   └── useOkrEscalation.ts    # invoke edge fn manual
├── components/
│   ├── ErrorBoundary.tsx
│   ├── people/
│   │   ├── OrganizationChartFlow.tsx   # main component
│   │   ├── OrgFlowNodes.tsx            # custom nodes
│   │   ├── OrgMemberDrawer.tsx
│   │   ├── orgNodeTypes.ts
│   │   └── org-layout.ts               # layout recursivo + buildManagerHierarchy
│   └── objectives/
│       ├── CommentsTab.tsx
│       ├── CommitmentTypeBadge.tsx
│       └── KrConfidenceSlider.tsx
├── pages/
│   ├── admin/
│   │   ├── Periods.tsx
│   │   ├── OkrEscalation.tsx
│   │   ├── Managers.tsx
│   │   └── Invitations.tsx
│   └── Auth.tsx               # Supabase signInWithOAuth("google")
└── integrations/supabase/types.ts  # tipos augmented para migrations pendentes
```

### Testes (79 passando)

```
src/lib/objective-types.test.ts         (8 testes)
src/lib/observability.test.ts           (8)
src/lib/analytics.test.ts              (8)
src/components/ErrorBoundary.test.tsx   (5)
src/components/people/org-layout.test.ts (12)
src/hooks/usePeriodsAdmin.test.ts       (8)
src/hooks/useOkrEscalation.test.ts      (4)
src/hooks/useObjectiveCollaborators.test.ts (5)
src/hooks/useObjectiveComments.test.ts  (7)
src/hooks/useManagers.test.ts           (6)
src/hooks/useInvitations.test.ts        (7)
```

---

## 3. Migrations — estado e ordem de aplicação

### Staged (prontas para aplicar)

| Arquivo | Conteúdo | Status |
|---------|----------|--------|
| `supabase/migrations/20260427075955_fix_fragilities.sql` | RLS hardening + helper `is_user_manager` + índices | ⚠️ Não aplicada |
| `supabase/migrations/20260501003200_add_manager_id.sql` | `company_memberships.manager_id` + trigger anti-ciclo + `get_org_subtree` / `get_org_ancestors` | ⚠️ Não aplicada |
| `supabase/migrations/20260501003201_okr_hardening.sql` | `key_results.confidence` + `objectives.commitment_type` + `objective_comments` table | ⚠️ Não aplicada |

**Comando para aplicar:**
```bash
cd /Users/macos/oxypeople
supabase db push
supabase gen types typescript --project-id pkwsbpxhwjewbiyiquad > src/integrations/supabase/types.ts
npm run typecheck
```

### Drafts (em `docs/migrations-draft/` — precisam ser movidas e aplicadas antes de cada sprint)

| Draft | Precisa para | Dependências |
|-------|-------------|--------------|
| `0004_pulse_survey.sql` | Sprint 3 — Epics 3 (Pulse) | 0001-0003 aplicadas |
| `0005_nine_box.sql` | Sprint 3 — Epic 4 (Nine Box) | 0001-0003 aplicadas |
| `0006_feedback_continuo.sql` | Sprint 3 — Epic 5 (Feedback) | 0001-0003 aplicadas |
| `0007_one_on_ones.sql` | Sprint 4 — Epic 6 (1:1) | 0001-0006 aplicadas |
| `0008_pdi.sql` | Sprint 4 — Epic 7 (PDI) | 0001-0007 aplicadas |
| `0009_pg_cron_jobs.sql` | Opcional — crons automáticos (requer Supabase Pro) | — |

**Procedimento para cada draft:**
```bash
# Copiar com timestamp atual
cp docs/migrations-draft/0004_pulse_survey.sql \
   supabase/migrations/$(date -u +%Y%m%d%H%M%S)_pulse_survey.sql

supabase db push
supabase gen types typescript --project-id pkwsbpxhwjewbiyiquad > src/integrations/supabase/types.ts
npm run typecheck
```

---

## 4. Ações manuais pendentes (responsabilidade do usuário)

Antes de começar a implementar Sprint 3, estas ações precisam ter sido feitas:

| Ação | Instrução | Urgência |
|------|-----------|----------|
| Aplicar migrations 0001-0003 | `supabase db push` | 🔴 Crítico |
| Regenerar types.ts | `supabase gen types typescript ...` | 🔴 Crítico |
| Google OAuth no GCC | Criar OAuth Client + URIs no Google Cloud Console | 🔴 Crítico |
| Google OAuth no Supabase | Dashboard → Auth → Providers → Google | 🔴 Crítico |
| VITE_SENTRY_DSN no .env | sentry.io → criar projeto React | 🟡 Importante |
| VITE_POSTHOG_KEY no .env | posthog.com → Project API Keys | 🟡 Importante |
| Deploy edge functions | `supabase functions deploy invite-user` + `supabase functions deploy okr-escalation` | 🟡 Importante |
| Resend + SPF/DKIM | Conta Resend + `supabase secrets set RESEND_API_KEY=...` | 🟡 Para convites |
| Seed admin inicial | SQL no Supabase Dashboard (ver RUNBOOK.md §6) | 🟡 Para testar |
| Política de Privacidade interna | Documento interno + DPO designado (LGPD) | 🔵 P1 |

Ver detalhes completos em `docs/RUNBOOK.md`.

---

## 5. O que construir — Sprint 3

**Epic 3 — Pulse Survey** (`docs/epics/epic-03-pulse-survey.md`)
Migration necessária: `0004_pulse_survey.sql`

| Story | Arquivo | Estimate | Sequência |
|-------|---------|----------|-----------|
| 3.1 — Criar Pulse recorrente (admin) | `docs/stories/sprint-3/story-3.1-pulse-survey-admin.md` | M | 1º |
| 3.2 — Widget no dashboard (1-clique) | `docs/stories/sprint-3/story-3.2-pulse-widget-dashboard.md` | S | 2º |
| 3.3 — Gráfico de evolução + segmentação | `docs/stories/sprint-3/story-3.3-pulse-evolution-chart.md` | M | 3º (paralelo 3.4) |
| 3.4 — Export CSV/Excel | `docs/stories/sprint-3/story-3.4-pulse-export.md` | S | 3º (paralelo 3.3) |
| 3.5 — Edge fn pulse-dispatch + cron | `docs/stories/sprint-3/story-3.5-pulse-dispatch-cron.md` | S | Após 3.1 |

**Epic 4 — Nine Box** (`docs/epics/epic-04-nine-box.md`)
Migration necessária: `0005_nine_box.sql`

| Story | Arquivo | Estimate | Sequência |
|-------|---------|----------|-----------|
| 4.1 — Criar snapshot + matriz | `docs/stories/sprint-3/story-4.1-nine-box-snapshot-create.md` | L | 1º |
| 4.2 — Drag-drop na matriz | `docs/stories/sprint-3/story-4.2-nine-box-drag-drop.md` | M | Após 4.1 |
| 4.3 — Justificativa por célula | `docs/stories/sprint-3/story-4.3-nine-box-justification.md` | S | Após 4.2 |
| 4.4 — Status lifecycle | `docs/stories/sprint-3/story-4.4-nine-box-status-lifecycle.md` | S | Após 4.1 |
| 4.5 — PDF export | `docs/stories/sprint-3/story-4.5-nine-box-pdf-export.md` | S | Paralelo com 4.3/4.4 |
| 4.6 — Filtro "meu time" (subtree) | `docs/stories/sprint-3/story-4.6-nine-box-team-filter.md` | S | Após 4.1-4.2 |

**Epic 5 — Feedback Contínuo** (`docs/epics/epic-05-feedback-continuo.md`)
Migration necessária: `0006_feedback_continuo.sql`

| Story | Arquivo | Estimate | Sequência |
|-------|---------|----------|-----------|
| 5.1 — Pedir feedback sobre alguém | `docs/stories/sprint-3/story-5.1-feedback-request-create.md` | M | 1º |
| 5.2 — Responder feedbacks pendentes | `docs/stories/sprint-3/story-5.2-feedback-respond.md` | M | Após 5.1 |
| 5.3 — Ver feedbacks que pedi | `docs/stories/sprint-3/story-5.3-*.md` | S | Após 5.1 |
| 5.4 — Ver feedbacks sobre mim | `docs/stories/sprint-3/story-5.4-*.md` | S | Após 5.2 |
| 5.5 — Notificações automáticas | `docs/stories/sprint-3/story-5.5-*.md` | S | Via trigger SQL |
| 5.6 — Dashboard métricas (admin) | `docs/stories/sprint-3/story-5.6-*.md` | M | Após 5.1-5.4 |
| 5.7 — Cron expiração | `docs/stories/sprint-3/story-5.7-*.md` | XS | Junto com 0009 |

> **Nota:** Stories 5.3-5.7 ainda estão sendo criadas pelo agente River(A). Verifique `docs/stories/sprint-3/` quando for iniciar.

---

## 6. O que construir — Sprint 4

**Epic 6 — 1:1 Meetings** (`docs/epics/epic-06-one-on-ones.md`)
Migration necessária: `0007_one_on_ones.sql`

| Story | Arquivo | Estimate |
|-------|---------|----------|
| 6.1 — Agendar 1:1 com recorrência | `docs/stories/sprint-4/story-6.1-agendar-1on1-recorrencia.md` | M |
| 6.2 — Tópicos colaborativos | `docs/stories/sprint-4/story-6.2-topicos-colaborativos.md` | M |
| 6.3 — Notas com 3 visibilidades | `docs/stories/sprint-4/story-6.3-notas-3-visibilidades.md` | M |
| 6.4 — Histórico de 1:1s anteriores | `docs/stories/sprint-4/story-6.4-historico-anteriores.md` | S |
| 6.5 — Download .ics | `docs/stories/sprint-4/story-6.5-download-ics.md` | XS |
| 6.6 — Recorrência via cron | `docs/stories/sprint-4/story-6.6-recorrencia-cron.md` | S |
| 6.7 — Dashboard frequência (gestor) | `docs/stories/sprint-4/story-6.7-dashboard-frequencia-gestor.md` | S |

**Epic 7 — PDI (Plano de Desenvolvimento Individual)** (`docs/epics/epic-07-pdi.md`)
Migration necessária: `0008_pdi.sql`

| Story | Arquivo | Estimate |
|-------|---------|----------|
| 7.1 — Criar próprio PDI | `docs/stories/sprint-4/story-7.1-criar-proprio-pdi.md` | M |
| 7.2 — Manager cria PDI para liderado | `docs/stories/sprint-4/story-7.2-manager-cria-pdi-liderado.md` | M |
| 7.3 — Ações em Kanban | `docs/stories/sprint-4/story-7.3-acoes-kanban.md` | M |
| 7.4 — Anexar evidências | `docs/stories/sprint-4/story-7.4-anexar-evidencias.md` | S |
| 7.5 — Aprovação do gestor | `docs/stories/sprint-4/story-7.5-aprovacao-gestor.md` | S |
| 7.6 — Gráfico radar de competências | `docs/stories/sprint-4/story-7.6-grafico-radar-competencias.md` | M |
| 7.7 — Vincular ação a feedback | `docs/stories/sprint-4/story-7.7-vincular-acao-feedback.md` | S |
| 7.8 — Dashboard admin PDI | `docs/stories/sprint-4/story-7.8-dashboard-admin-pdi.md` | S |

---

## 7. Como ler uma story e implementar

Cada arquivo de story em `docs/stories/` segue este formato:

```
# Story X.Y — Título
Context: por que existe / pré-condições
Acceptance Criteria (AC1, AC2...): Given/When/Then exatos
Technical Notes: arquivos a criar/modificar, padrões a seguir
Test Plan: unit, integration, RLS
Dependencies: stories predecessoras + migrations
Definition of Done: checklist [ ] para marcar ao completar
```

**Fluxo de trabalho por story:**

1. Verificar que as migrations necessárias foram aplicadas (`supabase db push`)
2. Ler a story completa antes de tocar no código
3. Implementar exatamente os ACs — sem extras, sem menos
4. Escrever testes conforme o Test Plan da story
5. Verificar: `npm run lint && npm run typecheck && npm test`
6. Marcar todos os `[ ]` do Definition of Done como `[x]`
7. Commit convencional referenciando a story

---

## 8. Padrões de código para manter consistência

### Hook pattern
```typescript
// src/hooks/useXxx.ts
export function useXxx() {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["xxx", currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("table")
        .select("*")
        .eq("company_id", currentCompanyId);
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompanyId,
  });

  const create = useMutation({
    mutationFn: async (input: XxxInput) => {
      const { error } = await supabase.from("table").insert(input);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["xxx", currentCompanyId] });
      toast.success("Criado com sucesso!");
    },
    onError: (err) => {
      toast.error("Erro ao criar");
      console.error(err);
    },
  });

  return { data, isLoading, create };
}
```

### Rota nova
```typescript
// src/App.tsx — dentro de <TracedRoutes>
const NewPage = lazy(() => import("./pages/NewPage"));
<Route path="/new-path" element={<Suspense fallback={<RouteFallback />}><NewPage /></Suspense>} />
```

### PostHog tracking
```typescript
import { trackEvent } from "@/lib/analytics";
trackEvent("feature_action", { prop1: value1 });
```

### RLS pattern para tabela nova
```sql
ALTER TABLE public.nova_tabela ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read nova_tabela"
  ON public.nova_tabela FOR SELECT
  USING (is_company_member(company_id));

CREATE POLICY "Members create nova_tabela"
  ON public.nova_tabela FOR INSERT
  WITH CHECK (is_company_member(company_id) AND user_id = auth.uid());
```

---

## 9. Riscos de segurança críticos (documentados pelo River)

### Epic 3 — Pulse: Anonimato com UNIQUE constraint

A migration `0004_pulse_survey.sql` usa `UNIQUE NULLS NOT DISTINCT (pulse_survey_id, user_id, period_start)`, o que na prática permite **apenas UMA resposta anônima por pulse/período no banco inteiro** — não 1 por usuário. Se dois usuários responderem anonimamente no mesmo período, o segundo recebe erro de constraint.

**Solução documentada na Story 3.2:**
- MVP: `localStorage` para anti-duplicação client-side (impede re-envio no mesmo device)
- P1: tabela auxiliar `pulse_response_acks (user_id, pulse_survey_id, period_start)` sem expor o user_id na tabela de respostas — migration aditiva quando necessário

### Epic 4 — Nine Box: Dois gotchas críticos

**1. `get_org_subtree` pode não existir (Story 4.6):**
A função é esperada vinda da migration `0002_add_manager_id.sql`. Se não estiver lá, Story 4.6 inclui fallback com migration aditiva `0005b_org_subtree_rpc.sql` (CTE recursivo pronto).

**2. Lifecycle "archived → unarchive" bloqueado por policy (Story 4.4):**
A policy `Admins update nine box snapshots` exige `status <> 'archived'` — o que impede desarquivar via UPDATE direto. Sem solução, o admin fica preso.

**Solução obrigatória:** função `SECURITY DEFINER` em `0005a_nine_box_unarchive.sql` que bypassa a policy só para esta operação controlada.

### Epic 6 — 1:1: RLS de visibilidade de notas

A policy `Notes visibility by role` em `one_on_one_notes` é **a única barreira** protegendo notas privadas. O ponto de falha mais grave é a UI: se ela permitir que um líder envie `visibility='private_member'`, e a policy `WITH CHECK` do INSERT tiver brecha, a nota fica invisível para o liderado mas visível para o líder — **vazamento silencioso, sem erro detectável**.

**Mitigações obrigatórias na Story 6.3:**
- UI deve **inferir** `visibility` a partir do papel do usuário logado (não deixar escolha livre)
- `WITH CHECK` do INSERT deve ser defensivo em profundidade
- Gate de merge: 5 testes RLS obrigatórios (T1-T5) anexados ao PR
- Review explícito de arquitetura antes do merge
- Admin deliberadamente excluído da policy SELECT — é intencional

### Epic 7 — PDI: Attachments com signed URL

As policies do bucket `pdi-attachments` exigem que o **primeiro segmento do path seja `auth.uid()::text`**. Isso significa que gestores e admins **não conseguem ler nem gerar signed URL diretamente** — só o owner do arquivo.

**Solução obrigatória (Story 7.4):**
- Edge function `pdi-evidence-signed-url` que valida no DB se o requisitor é manager/admin do PDI, usando **service role** para emitir a URL
- Sem essa função, a feature funciona para o owner mas **quebra silenciosamente** para gestores
- Bucket `file_size_limit` precisa ser configurado em **10MB** no Supabase Dashboard (não só client-side)

---

## 10. Restrições importantes

- **NUNCA** fazer DELETE, DROP, TRUNCATE ou UPDATE em dados existentes nas migrations
- **NUNCA** committar `.env` ou credenciais
- **SEMPRE** manter lint 0 erros: `npm run lint` (warnings em `any` são OK)
- **SEMPRE** manter typecheck limpo: `npm run typecheck`
- **SEMPRE** manter testes passando: `npm test` (79 testes)
- **NÃO** criar features fora das stories — sem extras não planejados
- **NÃO** alterar as migrations já staged sem confirmar com o usuário
- `src/integrations/supabase/types.ts` foi augmented manualmente — após `supabase gen types`, revisar diffs

---

## 11. Referências rápidas

| Documento | Conteúdo |
|-----------|----------|
| `docs/prd.md` | Product Requirements Document completo |
| `docs/RUNBOOK.md` | Deploy manual: migrations, GCC OAuth, Resend, seed admin |
| `docs/brownfield-assessment.md` | Análise técnica do estado anterior |
| `docs/feedz-parity-audit.md` | 62 capacidades do Feedz mapeadas (75% parity atual) |
| `docs/next-fronts-gap-map.md` | Gap map com priorização RICE (algumas partes desatualizadas pós-Sprint 2) |
| `docs/SCOPE-CORRECTION-2026-04-30.md` | Registro do pivot SaaS → ferramenta interna |
| `docs/epics/epic-0N-*.md` | Detalhes de cada epic (N=01 a 07) |
| `docs/stories/sprint-3/` | Stories detalhadas do Sprint 3 |
| `docs/stories/sprint-4/` | Stories detalhadas do Sprint 4 |
| `docs/migrations-draft/` | SQL de migrations futuras (0004-0009) |

---

## 12. Sumário executivo para a próxima IA

**Você está em:** pós-Sprint 2. Base completa, pronta para features.

**Próxima ação imediata:**
1. Confirmar que o usuário rodou `supabase db push` (migrations 0001-0003)
2. Confirmar `supabase gen types typescript` foi rodado
3. Iniciar Sprint 3 pela Story 3.1 (Pulse Survey admin)

**Subset mínimo viável para valor imediato (sem Supabase Pro/cron):**
```
3.1 (admin Pulse) → 3.2 (widget) → 5.1 (pedir feedback)
```
Essas 3 stories funcionam em produção no Plano Free e cobrem as duas dores mais visíveis: clima organizacional contínuo + feedback ad-hoc.

**Ordem recomendada de implementação:**
```
Sprint 3:
  Epic 3 (Pulse): 3.1 → 3.2 → 3.5 → 3.3 + 3.4 (paralelo)
  Epic 4 (Nine Box): 4.1 → 4.2 → 4.3 + 4.4 (paralelo) → 4.5 + 4.6 (paralelo)
  Epic 5 (Feedback): 5.1 → 5.2 → 5.3 + 5.4 (paralelo) → 5.5 → 5.6 → 5.7

Sprint 4:
  Epic 6 (1:1): 6.1 → 6.2 → 6.3 → 6.4 + 6.5 (paralelo) → 6.6 → 6.7
  Epic 7 (PDI): 7.1 + 7.2 (paralelo) → 7.3 → 7.4 + 7.5 (paralelo) → 7.6 → 7.7
```

**Não há bloqueadores técnicos no código** — tudo está limpo (lint 0 erros, typecheck limpo, 79 testes passando). O único bloqueador são as migrations que o usuário precisa aplicar.
