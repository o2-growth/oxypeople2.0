# Source Tree — oxypeople

> Mapa da árvore de código atual + onde novas features vão.

## Top-level

```
oxypeople/
├── docs/                    ← documentos de produto e arquitetura
│   ├── prd.md
│   ├── architecture-review.md
│   ├── database-audit.md
│   ├── brownfield-assessment.md
│   ├── po-validation-report.md
│   ├── epics/
│   ├── stories/
│   ├── architecture/        ← este arquivo + tech-stack.md + coding-standards.md
│   └── migrations-draft/    ← rascunhos SQL para revisão
├── public/                  ← assets estáticos
├── src/                     ← código React
├── supabase/
│   ├── config.toml
│   ├── functions/           ← edge functions Deno
│   └── migrations/          ← SQL aplicado (após aprovação)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vite.config.ts
└── vitest.config.ts
```

## src/

```
src/
├── App.tsx                  ← rotas + providers globais
├── main.tsx                 ← entrada (Sentry/PostHog init aqui)
├── index.css                ← Tailwind directives
│
├── pages/                   ← uma por rota
│   ├── Auth.tsx
│   ├── Index.tsx            ← dashboard
│   ├── Feed.tsx
│   ├── Recognition.tsx
│   ├── Objectives.tsx
│   ├── ObjectiveDetail.tsx
│   ├── Surveys.tsx
│   ├── Company.tsx
│   ├── Teams.tsx
│   ├── Performance.tsx
│   ├── HR.tsx
│   ├── Gamification.tsx
│   ├── Settings.tsx
│   ├── Automation.tsx
│   ├── NotFound.tsx
│   │
│   ├── admin/               ← telas admin-only (todas protegidas por ProtectedRoute)
│   │   ├── Periods.tsx              [story 1.1 — /admin/periods]
│   │   ├── OkrEscalation.tsx        [story 1.5 — /admin/okr-escalation]
│   │   ├── Invitations.tsx          [F.x — /admin/invitations]
│   │   ├── Managers.tsx             [story 2.1 — /admin/managers]
│   │   ├── OkrAccess.tsx            [epic 1 — /admin/okr-access]
│   │   ├── PulseSurveys.tsx         [story 3.1 — /admin/pulse-surveys]
│   │   ├── PulseAnalytics.tsx       [story 3.3 — /admin/pulse-surveys/:id/analytics]
│   │   ├── NineBox.tsx              [story 4.1 — /admin/nine-box]
│   │   ├── NineBoxEditor.tsx        [story 4.2 — /admin/nine-box/:id]
│   │   ├── OneOnOnesDashboard.tsx   [story 6.7 — /admin/one-on-ones-dashboard]
│   │   ├── PDIDashboard.tsx         [story 7.8 — /admin/pdi-dashboard]
│   │   └── FeedbackAnalytics.tsx    [story 5.6 — /admin/feedback/analytics]
│
├── components/
│   ├── ui/                  ← shadcn primitives — NÃO MODIFICAR
│   ├── layout/              ← AppLayout, AppSidebar, PageHeader
│   ├── ProtectedRoute.tsx
│   │
│   ├── dashboard/
│   ├── feed/
│   ├── mural/
│   ├── recognition/
│   ├── objectives/          ← OKRs (40+ componentes)
│   │   ├── (existing)
│   │   ├── ObjectiveCommentsTab.tsx [story 1.2 NEW]
│   │   ├── CommentItem.tsx          [story 1.2 NEW]
│   │   └── CollaboratorsTab.tsx     [story 1.6 NEW]
│   │
│   ├── surveys/
│   ├── company/
│   ├── teams/
│   ├── performance/
│   ├── hr/
│   ├── people/
│   │   ├── (existing)
│   │   └── OrganizationChartV2.tsx  [story 2.2 NEW — usa reactflow]
│   ├── gamification/
│   ├── automation/
│   ├── settings/
│   ├── actions/
│   │
│   ├── admin/               ← NOVO
│   │   ├── periods/                 [story 1.1]
│   │   └── pulse/                   [story 3.1]
│   │
│   ├── feedback/            ← NOVO [epic 5]
│   ├── one-on-ones/         ← NOVO [epic 6]
│   ├── pdi/                 ← NOVO [epic 7]
│   └── nine-box/            ← NOVO [epic 4]
│
├── hooks/                   ← React Query hooks (1 por domínio)
│   ├── (existing 47 hooks)
│   │
│   ├── usePeriodsAdmin.ts           [story 1.1 NEW]
│   ├── useObjectiveComments.ts      [story 1.2 NEW]
│   ├── useOkrCronStatus.ts          [story 1.5 NEW]
│   ├── useObjectiveCollaborators.ts [story 1.6 NEW]
│   ├── useOrgHierarchyV2.ts         [story 2.1 NEW]
│   ├── usePulseSurveys.ts           [epic 3 NEW]
│   ├── usePulseResponses.ts         [epic 3 NEW]
│   ├── useNineBox.ts                [epic 4 NEW]
│   ├── useFeedbackRequests.ts       [epic 5 NEW]
│   ├── useOneOnOnes.ts              [epic 6 NEW]
│   ├── useOneOnOneNotes.ts          [epic 6 NEW]
│   └── usePdiPlans.ts               [epic 7 NEW]
│
├── contexts/
│   └── AuthContext.tsx
│
├── integrations/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── types.ts         ← gerado por `supabase gen types typescript`
│   └── ~~lovable/~~         ← REMOVER [story 0.2]
│
├── lib/
│   ├── utils.ts
│   ├── analytics.ts                 [story 0.4 NEW — wrapper PostHog]
│   ├── objective-types.ts           [story 1.7 NEW — labels PT-BR]
│   └── pdf-export.ts                [stories 2.5, 4.5 NEW — react-pdf]
│
└── test/
    ├── setup.ts
    ├── example.test.ts      ← stub atual
    │
    ├── hooks/               ← NOVO [Sprint 4 testes mínimos]
    │   ├── useObjectives.test.ts
    │   └── useFeedbackRequests.test.ts
    │
    └── rls/                 ← NOVO [Sprint 4 — RLS críticos]
        ├── one-on-one-notes.rls.test.ts  [crítico]
        └── feedback-visibility.rls.test.ts
```

## supabase/

```
supabase/
├── config.toml
├── functions/
│   ├── pipefy-sync/         (existente)
│   ├── pipefy-tables/       (existente)
│   ├── send-slack-message/  (existente)
│   ├── run-automations/     (existente)
│   ├── okr-escalation/      (existente)
│   │
│   ├── pulse-dispatch/             ← NOVO [story 3.5]
│   ├── one-on-one-recurrence/      ← NOVO [story 6.6]
│   └── one-on-one-ics/             ← NOVO [story 6.5]
│
└── migrations/
    └── (timestamps existentes)
    └── (timestamps novos serão renomeados de docs/migrations-draft/)
```

## Convenções

### Nome de arquivo
- **Componente**: `PascalCase.tsx` (`ObjectiveCard.tsx`)
- **Hook**: `useCamelCase.ts` (`useObjectiveComments.ts`)
- **Lib/Util**: `kebab-case.ts` (`pdf-export.ts`, `objective-types.ts`)
- **Página**: `PascalCase.tsx` em `pages/`
- **Test**: `Algo.test.ts` (vitest)

### Onde colocar uma feature nova
1. **Página nova** → `src/pages/` (ou `src/pages/admin/` se for admin-only, `src/pages/modules/` se for módulo MVP)
2. **Componentes do módulo** → `src/components/<modulo>/`
3. **Hook de data fetching** → `src/hooks/`
4. **Lib pura (sem React)** → `src/lib/`
5. **Edge function** → `supabase/functions/<nome>/index.ts`
6. **Migration** → primeiro `docs/migrations-draft/`, depois `supabase/migrations/`

### Imports
- Path absoluto: `@/components/...`, `@/hooks/...` (config em `tsconfig.json`)
- Evitar import relativo profundo (`../../..`)

### Não criar
- Pasta nova "lá fora" do que existe (sempre dentro de `src/`)
- Componente fora de uma das pastas listadas
- Hook em outro lugar que não `src/hooks/`
