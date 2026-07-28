# Auditoria Interna — Inventário Página a Página (OxyPeople)

> **Fase:** A — Discovery · **Escopo:** UI/UX detectável no código (sem rodar o app) · **Data:** 2026-07-28
> **Stack:** Vite + React 18 + TS + shadcn/ui + Tailwind + Supabase · **Base:** `src/App.tsx`
> **Método:** leitura integral das 42 páginas de `src/pages/**` (incluindo `admin/` e `feedback/`) + fundações (`tailwind.config.ts`, `src/index.css`, `src/components/ui/`, layout). Nenhum arquivo de código foi modificado.

**Total:** 42 páginas / 42 rotas. Distribuição de qualidade: **A/A-** ×3 · **B (B+/B/B-)** ×27 · **C** ×7 (as demais são A/B mistas). Prioridade: **P0** ×2 · **P1** ×18 · **P2** ×22.

---

## Sumário executivo (achados sistêmicos)

Estes padrões se repetem em quase todas as páginas e devem virar tarefas transversais na Fase C — resolvê-los uma vez conserta dezenas de telas:

1. **`QueryError` existe mas quase ninguém usa.** O componente padrão de erro (`src/components/QueryError.tsx`) só é consumido por `PDI.tsx`, `TimeOff.tsx` e `OneOnOnes.tsx`. As outras ~39 páginas **ignoram `isError`/`error`** das queries. Consequência grave: em falha de backend, listas caem no *empty state* ("Nenhum...") e detalhes caem em "não encontrado" — **a falha é mascarada como vazio**. Nos dashboards (PDIDashboard, OneOnOnesDashboard, FeedbackAnalytics) o erro vira **spinner infinito**. É o problema nº 1 de UX.
2. **Loading nunca usa `Skeleton`.** `Skeleton` existe (`src/components/ui/skeleton.tsx`) e é o padrão em 7 páginas do módulo OKR/core (Index, Objectives, OkrOverview, ObjectiveDetail, Recognition, Performance, Company). **Todos os outros módulos (feedback, PDI, 1:1s, pulse, ninebox, RH/admin) usam `Loader2` spinner** — velocidade percebida pior e inconsistência visual.
3. **Não existe `<PageHeader>` compartilhado.** 38 páginas reimplementam `<div><h1/><p/></div>` com tamanhos e classes divergentes: `text-2xl` (feedback, TimeOff, Settings, Managers, Invitations) vs `text-3xl` (HR, Teams, Automation, Performance) vs `text-xl` (páginas de detalhe). É a maior fonte de inconsistência estrutural.
4. **`font-heading` vs `font-display` (tipografia fora do padrão editorial O2).** O CSS global (`src/index.css:276-301`) estiliza `h1-h4` com `font-display` (Tusker/Anton, marca O2), uppercase, weight 400. Praticamente todas as páginas **sobrescrevem** com `font-heading font-bold text-2xl` — `font-heading` é um **alias legado** (Space Grotesk) marcado para consolidação na "Phase 2" (`tailwind.config.ts:18-21`). Resultado: os títulos não renderizam na tipografia editorial pretendida. *(Nota: hoje 36+ arquivos usam `font-heading` e 0 usam `font-display` — é o padrão de facto, embora divergente do alvo.)*
5. **Cores fora de token (paleta Tailwind crua).** Uso recorrente de `emerald-*`, `amber-*`, `blue-*`, `text-green-500`, `text-red-500` em vez de tokens semânticos (`success`, `warning`, `destructive`, `primary`). Concentrado em: Company, Settings, feedback/AboutMe, feedback/Detail, PDITeam, PDIDetail, Pulse, PulseAnalytics, NineBox. Viola o princípio "dark/light de verdade — nada hardcoded".
6. **Tabelas — nuance importante:** o primitivo `Table` (`src/components/ui/table.tsx:7`) **já embrulha em `<div class="relative w-full overflow-auto">`**, então o scroll horizontal funciona por herança em todas. O problema real é **densidade no mobile**: só HR/TimeOff oferecem fallback de cards; várias tabelas admin não usam `hidden md:table-cell` para colapsar colunas (ex.: `PulseSurveys` tem 9 colunas), ficando espremidas.
7. **UI não-funcional / dados mockados em produção** (bugs reais, não estéticos): card institucional "People Hub Corp" em `Company.tsx`, botão "Sair" sem handler em `Settings.tsx`, switches de privacidade inertes, botões "Conectar Slack/Teams/Google" no-op, `EditMemberDialog` inalcançável em `HR.tsx`, prova social fabricada em `Auth.tsx`.

---

## Seção 1 — Inventário completo de rotas

### 1.1 Públicas / fora do `AppLayout`

| Página | Rota | Propósito | Componentes principais | Hooks de dados | Linhas |
|---|---|---|---|---|---|
| `Auth.tsx` | `/auth` | Login/cadastro público com branding O2 split-screen | `O2Logo`, `O2Button`, `Card`, `Input`, `Label`, painel de branding custom | `useAuth`, `useToast`, `useNavigate`, `useLocation` | ~266 |
| `ForgotPassword.tsx` | `/auth/reset` | Solicitar link de recuperação de senha | `O2Logo`, `O2Button`, `Card`, `Input` | `useToast`, `supabase.auth.resetPasswordForEmail` | ~166 |
| `ResetPassword.tsx` | `/reset-password` | Definir nova senha (fluxos PKCE/implícito/erro) | `O2Logo`, `O2Button`, `Card`, `Input` | `supabase.auth` (múltiplos), `useToast`, `useNavigate` | ~281 |
| `NotFound.tsx` | `*` | Página 404 | `<div>`/`<a>` nativo (sem AppLayout, sem branding) | `useLocation`, `useEffect` | ~25 |
| `Pulse.tsx` | `/pulse/:id` | Responder um pulse survey individual (usa AppLayout) | `Card`, `Button`, `PulseQuestion` | `useQuery` (inline), `useAuth`, `useUser` | ~147 |

### 1.2 Início / Meu Espaço

| Página | Rota | Propósito | Componentes principais | Hooks de dados | Linhas |
|---|---|---|---|---|---|
| `Index.tsx` | `/` | Dashboard inicial (colaboradores, OKR, NPS, engajamento, widgets) | `StatCard` (o2), `QuickActions`, `EngagementChart`, `PulseWidget`, `OKRStatusSummary`, `RecentActivity`, 4× `*DetailDialog`, `Skeleton` | `useUser`, `useDashboardStats`, `useDashboardFullStats`, `useQuarterGoals` | ~304 |
| `Feed.tsx` | `/feed` | Mural — eventos, comunicados, mini-calendário, aniversários | `UpcomingEventsCarousel`, `PinnedAnnouncements`, `MiniCalendar`, `BirthdaysList`, `CreateEventDialog` | `useCompanyEvents`, `useHRCalendar`, `useUserPermissions` | ~70 |
| `Recognition.tsx` | `/recognition` | Reconhecimentos entre colegas (feed + ranking) | `RecognitionCard`, `SendRecognition`, `Leaderboard`, `Tabs`, `Skeleton` | `useRecognitions` | ~149 |
| `Objectives.tsx` | `/objectives` | Board de objetivos estilo Monday (árvore/mapa/ações) | `BoardHeader`, `ObjectiveTreeNode`, `ObjectivesMap`, `ActionsKanban`, dialogs, `Skeleton` | `useObjectivesFilters`, `useOkrTier` | ~279 |
| `Performance.tsx` | `/performance` | Avaliações de desempenho (admin + minhas avaliações) | `Tabs`, `PerformanceStats`, `CycleCard`, `EvaluationsList`, `MyEvaluations`, `Skeleton` | `usePerformanceCycles`, `useEvaluations`, `useUserPermissions` | ~225 |
| `Gamification.tsx` | `/gamification` | Pontos, ranking, histórico e níveis | `UserPointsSummary`, `GamificationLeaderboard`, `PointsHistory`, `LevelsProgress` | — (delegado aos filhos) | ~44 |
| `PDI.tsx` | `/pdi` | Lista dos PDIs do usuário, com criação | `PDICard` (local), `PDIForm`, `Progress`, `QueryError` | `usePDIList` | ~119 |
| `OneOnOnes.tsx` | `/one-on-ones` | Lista das 1:1s do usuário (abas Próximas/Hoje/Histórico) | `Tabs`, `OneOnOneForm`, `OneOnOneList`, `HistoryTab`, `QueryError` | `useOneOnOnes`, `useAuth` | ~144 |

### 1.3 Detalhe (OKR / PDI / 1:1)

| Página | Rota | Propósito | Componentes principais | Hooks de dados | Linhas |
|---|---|---|---|---|---|
| `ObjectiveDetail.tsx` | `/objectives/:id` | Detalhe do objetivo (donut, progresso, KRs, comentários) | recharts (`PieChart`), `ProgressChart`, `KeyResultItem`, `CommentsTab`, `AuditHistory` | `useObjectives`, `usePeriods`, `useCheckins`, `useObjectiveComments`, `useRealtimeObjective` +3 | ~749 |
| `PDIDetail.tsx` | `/pdi/:id` | Detalhe do PDI (competências, ações/kanban, radar) | `Tabs`, `CompetenciesList`, `ActionsKanban`, `CompetencyRadar`, `ApprovalActions` | `usePDIDetail`, `usePDICompetencies`, `usePDIActions` +3 | ~240 |
| `OneOnOneDetail.tsx` | `/one-on-ones/:id` | Detalhe de uma 1:1 (tópicos, notas, export .ics) | `TopicsPanel`, `NotesPanel`, `PreviousMeetings`, `DownloadIcsButton` | `useQuery` (inline supabase), `useAuth` | ~147 |

### 1.4 Gestão

| Página | Rota | Propósito | Componentes principais | Hooks de dados | Linhas |
|---|---|---|---|---|---|
| `OkrOverview.tsx` | `/okr-overview` | Acompanhamento de OKRs por área/time (cobrança) | `Card`, `Progress`, `Collapsible`, `Select`, `Skeleton`; `TeamRow`/`AreaCard` (local) | `useObjectives`, `usePeriods` | ~276 |
| `HR.tsx` | `/hr` | Hub de RH (turnover, colaboradores, organograma, NPS, calendário) | `Tabs`, `Table`, `CollaboratorCard`, `OrganizationChartFlow`, recharts ×3 | `usePeopleList`, `useHRTurnover`, `useHeadcountAnalytics` +mutations | ~982 |
| `Teams.tsx` | `/teams` | Listagem/CRUD de times | `TeamCard`, `CreateTeamDialog`, `TeamMembersDialog`, `Input` | `useTeams`, `useDeleteTeam`, `useUserPermissions` | ~184 |
| `Surveys.tsx` | `/surveys` | Pesquisas e-NPS e GPTW (criar/responder/listar) | `Tabs`, `NPSSurveyCard`, `NPSResponseDialog`, `GPTWSurveyCard` | `useNPSSurveys`, `useGPTWSurveys` +6 | ~236 |
| `PDITeam.tsx` | `/pdi/team` | PDIs dos liderados (visão gestor) | `ReportRow` (local), `Avatar`, `Progress`, `CreateForReportDialog` | `useIsManager`, `useTeamPDIs` | ~178 |

### 1.5 Administração

| Página | Rota | Propósito | Componentes principais | Hooks de dados | Linhas |
|---|---|---|---|---|---|
| `Company.tsx` | `/company` | Gestão da empresa (membros, áreas, convites) | `MembersList`, `MemberDetailSheet`, `InviteModal`, `DepartmentCard`, `AlertDialog`, `Skeleton` | `useDepartmentsWithDetails`, `usePeopleList`, `usePeopleStats` +4 | ~539 |
| `TimeOff.tsx` | `/time-off` | Gestão de férias/ausências (PJ) + sync Pipefy | `Tabs`, `Table`, `TimeOffForm`, `QueryError` | `useTimeOffList`, `useTimeOffSettings`, `useTimeOffMutations` | ~308 |
| `Settings.tsx` | `/settings` | Preferências da conta (perfil, notif., privacidade, aparência) | `Tabs`, `Switch`, `ProfileForm`, `NotificationSettings`, `OkrSettingsPanel` | `useAuth`, `useUser`, `useMyMembership`, `useTheme` | ~361 |
| `Automation.tsx` | `/automation` | Central de avisos/automações | `Tabs`, `AnnouncementsList`, `AutomationCard`, `AutomationLogs` | — (delegado aos filhos) | ~109 |
| `admin/Periods.tsx` | `/admin/periods` | CRUD de períodos (ciclos de OKR) | `Table`, `AlertDialog`, `PeriodFormDialog` | `usePeriodsAdmin`, `useUserPermissions` | ~207 |
| `admin/OkrEscalation.tsx` | `/admin/okr-escalation` | Disparar/monitorar escalação de OKRs em risco | `Table`, `Alert`, `Badge` | `useOkrEscalation`, `useUserPermissions` | ~253 |
| `admin/Invitations.tsx` | `/admin/invitations` | Enviar/gerenciar convites por e-mail | `Table`, `AlertDialog`, `Input`, `Select` | `useInvitations`, `useDepartmentsWithDetails` | ~289 |
| `admin/Managers.tsx` | `/admin/managers` | Definir hierarquia de gestão (com prevenção de ciclo) | `Table`, 2× `Dialog`, `MultiPersonSelector`, `Checkbox` | `useManagers`, `useUserPermissions` | ~470 |
| `admin/OkrAccess.tsx` | `/admin/okr-access` | Nível de acesso a OKR por pessoa | `Table`, `Input`, `Avatar`, `Select` | `useOkrAccessLevels`, `useUpdateOkrAccessLevel` | ~237 |
| `admin/PulseSurveys.tsx` | `/admin/pulse-surveys` | CRUD admin de pesquisas Pulse | `Table`, `AlertDialog`, `Switch`, `Tooltip`, `PulseSurveyForm` | `usePulseSurveysAdmin`, `useUserPermissions` | ~323 |
| `admin/PulseAnalytics.tsx` | `/admin/pulse-surveys/:id/analytics` | Resultados de um pulse (KPIs, gráfico, comentários) | `Table`, `PulseLineChart`, `PulseFilters`, `PulseCommentsDrawer` | `usePulseAnalytics`, `useUserPermissions` | ~338 |
| `admin/NineBox.tsx` | `/admin/nine-box` | Lista de snapshots Nine Box | `Table`, `AlertDialog`, `DropdownMenu`, `CreateSnapshotDialog` | `useNineBoxSnapshots`, `useUserPermissions` | ~285 |
| `admin/NineBoxEditor.tsx` | `/admin/nine-box/:id` | Editor drag-and-drop da matriz 3×3 | `DndContext`, `NineBoxGrid`, `NineBoxPool` | `useNineBoxSnapshot`, `usePlacementMutations` | ~212 |
| `admin/PDIDashboard.tsx` | `/admin/pdi-dashboard` | Dashboard admin de PDIs (KPIs, por área, em risco) | `KpiCard` (local), `DepartmentTable`, `AtRiskList` | `usePDIDashboard`, `useUserPermissions`, `useUser` | ~156 |
| `admin/OneOnOnesDashboard.tsx` | `/admin/one-on-ones-dashboard` | Dashboard de frequência de 1:1s por gestor | `KpiCard` (local), `FrequencyTable`, `TrendChart` | `useOneOnOnesDashboard`, `useUserPermissions` | ~236 |
| `admin/FeedbackAnalytics.tsx` | `/admin/feedback/analytics` | Métricas de feedback (KPIs, timeline, adoção, cron) | `Sheet`, `FeedbackKpiCards`, `FeedbackTimelineChart`, `AdoptionGauge` | `useFeedbackMetrics` + **supabase inline** | ~242 |

### 1.6 Feedback

| Página | Rota | Propósito | Componentes principais | Hooks de dados | Linhas |
|---|---|---|---|---|---|
| `feedback/NewFeedbackRequest.tsx` | `/feedback/new` | Wrapper com "Voltar" que renderiza o form de pedir feedback | `Button`, `FeedbackRequestForm` | — (delegado ao form) | ~28 |
| `feedback/Inbox.tsx` | `/feedback/inbox` | Pedidos de feedback recebidos (responder) | `Tabs`, `FeedbackInboxItem`, `RespondDialog`, `DeclineDialog` | `useFeedbackInbox` | ~88 |
| `feedback/Sent.tsx` | `/feedback/sent` | Tabela de pedidos enviados (cancelar) | `Table`, `AlertDialog`, `FeedbackStatusBadge`, `UserCell` | `useFeedbackSent`, `useDeleteFeedbackRequest` | ~201 |
| `feedback/AboutMe.tsx` | `/feedback/about-me` | Feedbacks sobre mim / meu time + stats de competência | `Tabs`, `Card`, `CompetencyStatsCard`, `UserCell` | `useFeedbackAboutMe`, `useFeedbackForTeam` | ~178 |
| `feedback/Detail.tsx` | `/feedback/:id` | Detalhe de um feedback (pergunta, resposta, CTA PDI) | `Card`, `UserCell`, `CreatePDIActionFromFeedback`, `DetailField` | `useFeedbackDetail`, `useAuth` | ~180 |

---

## Seção 2 — Problemas de UX/código por página

> Legenda de severidade herda da prioridade da Seção 4. Citações em `arquivo:linha`.

### 2.1 Core / Meu Espaço

**`Index.tsx`** — `useDashboardStats`/`useDashboardFullStats`/`useQuarterGoals` (`:32-34`) só usam `isLoading`; se `fullStats` falha, todos os widgets condicionados a `fullStats &&` (`:145-244`) somem **sem `QueryError`**. Header usa `hero-header` (gradiente legado DEPRECATED) com h1 `text-2xl lg:text-3xl font-heading font-bold text-white` (`:97`). `text-white`/`text-white/70` (`:97,100`) não tokenizados. `style={{ animationDelay }}` inline (`:128`). Empty só para metas (`:286`).

**`Feed.tsx`** — h1 `text-2xl font-heading font-bold` (`:31`). Sem loading/empty/erro no nível da página (tudo via props aos filhos); sem `QueryError`. Label de seção ad-hoc `text-sm font-semibold uppercase tracking-wider` (`:40`) repetido em Index (`:187`).

**`Recognition.tsx`** — h1 `text-2xl font-heading font-bold` (`:48`). `useRecognitions` (`:40`) sem tratamento de erro. `RecognitionSkeleton` (`:10-28`) e `EmptyState` (`:30-37`) definidos inline — reimplementados também em Performance e Company. **Positivo:** loading (Skeleton) + empty pt-BR cobertos nas 3 tabs.

**`Performance.tsx`** — **`window.confirm("Tem certeza...")` (`:53`)** — confirmação nativa do browser enquanto Company usa `AlertDialog`. Skeleton `grid grid-cols-4 gap-4` fixo (`:99`), sem breakpoint → 4 colunas espremidas no mobile. Placeholders "em breve" em produção (`:174,181`). 3 empty-states inline quase idênticos (`:119-129, 172-175, 178-182`). Sem erro. h1 `text-3xl font-bold` (`:65,205`).

**`Gamification.tsx`** — h1 `text-2xl font-bold font-heading` com ícone `Gamepad2 h-8 w-8` embutido (`:14-17`). Shell de layout puro: **sem loading/empty/erro**; se um filho não tratar, não há fallback.

**`Surveys.tsx`** — **[P0]** `ENPSTab`/`GPTWTab` desestruturam só `data`, nunca `isLoading` (`:33-35, 117-119`) → **zero Skeleton**. **Sem empty**: usuário não-admin sem pesquisas vê aba vazia. **`window.location.href = "/hr"` (`:81)`** → reload total do app (Company usa `useNavigate`). `response: any` (`:96,175`). `ENPSTab` (`:29-111`) e `GPTWTab` (`:113-190`) estruturalmente idênticas (~55 linhas cada). Sem erro.

**`Company.tsx`** — **[P0]** Card institucional 100% **mockado em produção**: `"PH"` (`:254`), `"People Hub Corp"` (`:259`), badge `"Plano Pro"` (`:262`), `"peoplehub.com"` (`:267`), `"admin@peoplehub.com"` (`:271`); botão "Editar" sem `onClick` (`:279`). Cores cruas `text-red-500` (`:159`), `text-blue-500` (`:160`), `text-yellow-500` (`:161`). Loading inconsistente: `Skeleton` (`:293`) + `Loader2` em 4 lugares (`:218,375,405,437`). Sem erro em 3 queries (`:99,105,106`). Concordância pt-BR: "Nenhuma área criado" (`:411`), "este área"/"área terão" (`:488-489`). 3 empty-states inline (`:377-392, 408-419, 440-451`).

### 2.2 OKR

**`Objectives.tsx`** — `GROUP_COLORS` com **10 hex** (`#579bfc, #00c875, #fdab3d, ...`) em `:30-33`, aplicados via `style` inline (`:135,138,165-166`). `bg-[#00c875] hover:bg-[#00b461] text-white` em classe arbitrária (`:110`). Sem estado de erro (só loading `:78-92` e empty `:95-116`). `(obj.team as any)` (`:124`). px soltos nos skeletons: `max-w-[200px]`, `w-[75px]`, `w-[80px]` (`:84-88`). Bloco `BoardColumnHeaders + lista + GroupFooter` duplicado (`:141-154` e `:171-182`).

**`ObjectiveDetail.tsx`** — **[749 linhas — monolito]**. **Código morto (confirmado):** imports `Tabs*` (`:8`), `ScrollArea` (`:11`), `ProgressBarStatus`/`StatusBadge`/`OverdueBadge` (`:50-52`) nunca usados; `type`/`TypeIcon` (`:155-156`), `autoStatus` (`:159`), `totalCheckins` reduce no-op (`:117-121`). `as any` difuso (`:159,176,179-183,388-389,490-491`). h1 `font-heading font-bold text-2xl lg:text-3xl` (`:234`). **Erro real cai em "Objetivo não encontrado"** (`:139-153`) — mascara falha de query. `Cell fill="hsl(var(--muted))"` / `progressColor` literais (`:206-210, 367-368`).

**`OkrOverview.tsx`** — `AREA_COLORS` hex (`#F97316, #3B82F6, #6B7280`) `:57-61` + fallback `#10B981` (`:64`), via `style` inline (`:134,160`). **`areaColor()` casa cor por substring do título** (`title.includes("Operações"/"Revenue"/"Tech")`, `:62-65`) — quebra se o texto mudar. h1/h2 `font-heading font-bold` (`:142,221`). Sem `QueryError` (loading `:260`, empty `:268`). **`krProgress`/`avgProgress` recalculam progresso no cliente (`:29-48`)** enquanto Objectives/ObjectiveDetail usam `objective.progress` do backend — fontes divergentes. `teamName`/`areaName` por regex sobre título (`:85,130`).

**`admin/OkrEscalation.tsx`** — `<Table>` (`:170,217`) sem `hidden md:table-cell` (colapso de colunas). h1 `font-heading font-bold` (`:90`). `key={idx}` (`:230`). **Positivo:** melhor cobertura de estados do lote — loading (`:76`), erro via `Alert` (`:148-154`), empty por tabela (`:167,212`).

**`admin/OkrAccess.tsx`** — **Inglês na UI:** `"Manager"/"Contributor"/"Restricted"` em `LEVEL_LABEL` (`:42-46`), `SelectItem` (`:217-219`) e badges. Tabela (`:175`) sem colapso de colunas. Loading `Loader2` (`:93-101, 166-169`), não Skeleton. Erro mascarado como empty (`useOkrAccessLevels` → `[]`). h1 `font-heading` (`:107`).

**`admin/Periods.tsx`** — Tabela (`:125`) sem colapso. Loading `Loader2` (`:57-65, 116-119`). Erro mascarado como empty (`:120-123`). h1 `font-heading` (`:97`). **Positivo:** `AlertDialog` de exclusão com aviso contextual sobre objetivos vinculados (`:188-192`).

### 2.3 Feedback

**`feedback/NewFeedbackRequest.tsx`** — Única página do módulo **sem `<h1>` próprio** (`:12-25`), quebra consistência com Inbox/Sent/AboutMe. `-ml-2`/`py-2` ad-hoc. Arquivo limpo no restante.

**`feedback/Inbox.tsx`** — Desestrutura só `{ data, isLoading }` (`:16`), ignora `error` → falha vira empty falso **"Nenhum feedback pendente. Bom trabalho!" (`:52`)**. Loading `Loader2` (`:44`). h1 `text-2xl font-heading font-bold` (`:25`). Empty em ternário aninhado de 5 níveis (`:51-59`). Um único `<TabsContent value={filter}>` reaproveitado (`:42`).

**`feedback/Sent.tsx`** — Ignora `error` de `useFeedbackSent` (`:54`) → empty mascara erro (`:96`). Loading `Loader2` (`:90`). **`max-w-[260px]`** px arbitrário (`:122`). Truncamento duplicado: `truncate` CSS **e** `.slice(0,100)+"..."` JS (`:122-127`). `formatDate` local (`:42`). Mobile esconde 3 colunas via `hidden md:table-cell` → densidade pobre em telas pequenas. h1 `font-heading` (`:63`).

**`feedback/AboutMe.tsx`** — Cores cruas `text-emerald-500` (`:63`), `border-emerald-500/30 bg-emerald-500/5` (`:125`), `text-emerald-600` (`:126`). Ignora `error` de **ambas** as queries (`:31-32, 42`) → empty mascara erro (`:91`). Loading `Loader2` (`:82`). **`md:grid-cols-[1fr_280px]`** px arbitrário (`:77`). `formatDate` local (`:19`). h1 `font-heading` (`:58`).

**`feedback/Detail.tsx`** — **Único que trata erro** (`error || !data` → card `ShieldOff`, `:52-66`), **mas não usa `QueryError`** (reimplementa à mão). **Inglês na UI:** "Pedidos privados ao **requester** não são visíveis..." (`:59`). Cores cruas `border-emerald-500/30 bg-emerald-500/5` (`:115`), `text-emerald-600` (`:117`). Loading `Loader2` (`:48`). `currentUserId={user?.id ?? ""}` (`:163`).

**`admin/FeedbackAnalytics.tsx`** — **Query Supabase inline na página** (`.from("feedback_requests")...`, `:82-104`) fora do padrão de hooks. `isLoading || !metrics` (`:164`) → se `useFeedbackMetrics` falhar, **spinner eterno**. `text-amber-600` (`:232`). `Loader2` ×3 (`:111,166,210`). Cast inseguro `as unknown as DrilldownRow[]` (`:104`). h1 `font-heading` (`:122`). Header próprio divergente (`flex justify-between`). Spacing ad-hoc `w-36`/`h-8`/`pb-0.5`/`ml-1` (`:137-158`).

### 2.4 Desenvolvimento (PDI / 1:1)

**`PDI.tsx`** — **A11y:** `<div onClick={navigate}>` sem `role="button"`/`tabIndex`/handler de teclado (`:26-29`). Loading `Loader2` (`:85-88`), não Skeleton. `STATUS_BADGE` (`:14-19`) duplicado (3 cópias no módulo). h1 `font-heading` (`:71`). **Positivo:** empty/loading/erro corretos com `QueryError` e CTA no empty (`:89-106`).

**`PDITeam.tsx`** — **Bug pt-BR:** `aprovação{n>1?"ões":""}` gera **"2 aprovaçãoões pendentes"** (`:140`). Sem `QueryError` (`:145-166`) → erro vira empty. Cores cruas `text-amber-700 border-amber-300 bg-amber-50` (`:59`), `bg-amber-100 text-amber-800` (`:138`). Loading `Loader2` (`:146`). `STATUS_BADGE` duplicado (`:17-22`). `ReportRow` sem `flex-wrap` → 2 botões apertam no mobile (`:44,87-106`). h1 `font-heading` (`:129`).

**`PDIDetail.tsx`** — **Import morto:** `useNavigate as useNav` (`:19`) nunca usado. Consome só `isLoading` (`:34-39`) → erro vira "PDI não encontrado" (`:55-72`). Badge de contagem `rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px]` repetido 3× (`:169-171,177-179,188-190`); `text-[10px]` arbitrário. Cor crua `border-amber-200 bg-amber-50 text-amber-800` (`:140-144`). Tradução de status inline (`:228-231`). `STATUS_BADGE` duplicado (`:21-26`). h1 `text-xl` (`:93`) vs `text-2xl` das listas.

**`OneOnOnes.tsx`** — `tabCount` com `text-[10px]` arbitrário (`:16-22`) — reproduz o badge de PDIDetail (componente compartilhado ausente). Loading `Loader2` (`:84-87`). Empty delegado ao filho `OneOnOneList` (`:105-125`). Container sem `max-w` (`:67`) vs `max-w-3xl` de PDI/PDITeam. h1 `font-heading` (`:70`). **Positivo:** loading + erro (`QueryError`, `:88-92`).

**`OneOnOneDetail.tsx`** — **Query inline** `useQuery(supabase.from("one_on_ones"))` (`:30-49`) fora do padrão de hooks; cast `as unknown as OneOnOneRow` (`:46`). Só `isLoading` (`:51`) → erro vira "1:1 não encontrada" (`:61-73`). Loading `Loader2` (`:51-59`). `STATUS_BADGE` local (`:17-22`). h1 `text-xl` (`:89`).

**`admin/PDIDashboard.tsx`** — `isLoading || !data` (`:101-106`) → **spinner infinito** em falha (sem `QueryError`). Loading `Loader2` (`:56-64,101-106`). `KpiCard` local (`:16-36`) diverge do de OneOnOnesDashboard (dois designs). Export CSV duplicado (`:66-85`). Admin-gate duplicado (`:45-50`). Header com em-dash "PDI — Dashboard" e ícone lateral (`:91-93`) diverge do padrão.

**`admin/OneOnOnesDashboard.tsx`** — **Inglês na UI:** label `"% Canceladas / No-show"` (`:214`), cabeçalho CSV `"% Completion, Ultima 1:1"` (`:49`, sem acento). Copy quebrada "nos últimos período custom" (`:207`). `isLoading || !data` (`:196-199`) → **spinner infinito**. Loading `Loader2`. `KpiCard` local com `pt-5 pb-4` ad-hoc (`:34-44`). Assinatura de `exportCsv` com `ReturnType<typeof import()...>` ilegível (`:48`) + CSV duplicado. Inputs de data `h-8 text-sm w-36` (`:170,176`). Admin-gate duplicado (`:97-102`). h1 `font-heading` (`:140`).

### 2.5 Gestão / RH / Admin

**`HR.tsx`** — **[982 linhas — God component].** Padding duplicado: `container mx-auto p-6` (`:521`) dentro do `<main>` que já tem `p-6 lg:p-8` → margens desalinhadas. Header único sem `font-heading`: h1 `text-3xl font-bold` com ícone em caixa `bg-primary/10` (`:525`). **Feature morta:** `EditMemberDialog` renderizado (`:922`) mas `setEditingMember` só recebe `null` (`:925`) → diálogo inalcançável. **Zero error handling** (nenhum `isError`/`QueryError`). Charts `return null` sem empty (`:92,179,260`). **Emojis como ícones** nos stat cards (👥/✅/🆕/🏢, `:607,623,636,651`). Loading `Loader2` (`:84,169,250,726`). 4 stat cards quase idênticos (`:597-656`).

**`TimeOff.tsx`** — **Melhor padrão de estados do app:** loading + `QueryError` com `onRetry` (`:161`) + empties dedicados (`:163,281`). `text-[10px]` (`:146,151`). Larguras `w-[240px]`/`w-[140px]` (`:252,262,267`). Loading `Loader2` (`:159`). h1 `text-2xl` vs `text-3xl` de Teams/Automation.

**`Teams.tsx`** — **N+1 query:** roda `count` do Supabase **por time** em `for...of` dentro de `useEffect` (`:37-56`); import dinâmico ad-hoc `await import(".../supabase/client")` (`:39`). Sem `QueryError` → falha vira grid vazio. Flicker: cards mostram `0` até o loop terminar (`:160`). Loading `Loader2` (`:93,129`). **Positivo:** responsividade ótima (grid de cards).

**`Settings.tsx`** — **Bug: botão "Sair" sem ação** — `handleSignOut` definido (`:63`) mas nunca ligado; botão (`:339`) sem `onClick`. **UI falsa:** switches de Privacidade `defaultChecked` sem persistência (`:168,177,186,206,215`); botões Conectar/Desconectar (`:285,298,311`) e "Excluir conta" (`:351`) sem handler. Hex de marca cru: `bg-[#4A154B]` (`:277`), `bg-[#0078D4]` (`:290`), `bg-[#4285F4]` (`:303`). `text-green-500` (`:308`), `bg-slate-800 text-white` (`:250,254`). Loading "Carregando perfil..." texto (`:118`).

**`Automation.tsx`** — Botão "Conectar Slack" sem `onClick` (`:98`). Loading/empty/erro delegados aos filhos (orquestração pura — aceitável). h1 `text-3xl font-heading`. **Positivo:** responsividade correta.

**`admin/Invitations.tsx`** — Sem error state na tabela (erros provavelmente via toast no hook). Loading `Loader2` (`:73,198`). **Positivo:** guard de permissão (`:63-78`), empty com CTA (`:201`), confirmação de cancelamento.

**`admin/Managers.tsx`** — **[470 linhas].** Dois `Dialog` picker quase idênticos (single `:377-422` / bulk `:425-467`) → extrair `ManagerPickerDialog`. Sem error state (falha vira "Nenhuma pessoa encontrada"). `text-[10px]` no `AvatarFallback` (`:336`). Loading `Loader2` (`:237,297`). **Positivo:** prevenção de ciclo (`collectSubtree`, `:56-74`).

### 2.6 Pulse / NineBox / Auth

**`Pulse.tsx`** — **Empty falso por `enabled`:** query depende de `profile?.primary_company_id` (`:78`); enquanto o perfil carrega, `isLoading` é falso e cai em "Esta pesquisa não existe ou não está mais ativa" (`:125-133`) **antes de haver dados**. Erro real e "inexistente" conflatados. Loading `Loader2` (`:121`). `text-emerald-500` (`:109,114`).

**`admin/PulseSurveys.tsx`** — Sem error state → array vazio vira empty falso (`:172-175`). Loading `Loader2` (`:168-171`). `text-amber-500` (`:230`). `nextDispatchUTC()` calculado no render (`:65-70`) não é reativo. Gate de permissão duplicado (`:98-113`). **Tabela de 9 colunas sem colapso** — só scroll horizontal.

**`admin/PulseAnalytics.tsx`** — Sem error dedicado → erro vira "Pulse não encontrado" (`:108-122`). Loading `Loader2` (`:108-113`). Cores cruas `text-emerald-500` (`:129`), `border-amber-500/40` (`:218,220`), mapa `ENPS_COLOR_CLASS` (`:57-61`). **Positivo:** empties bem tratados, tabela com `hidden md:table-cell` (`:263-295`), `max-w-6xl` responsivo.

**`admin/NineBox.tsx`** — Sem error state → erro vira "Nenhum snapshot ainda" (`:141-147`). Loading `Loader2` (`:137-140`). Mapa `STATUS_CLASS` hardcoded `border-blue-500/40 text-blue-600`, `text-emerald-600` (`:61-65`). Gate duplicado (`:92-107`). **Positivo:** empty com ícone, `hidden md:table-cell`, AlertDialog com contagem.

**`admin/NineBoxEditor.tsx`** — **DnD sem teclado:** só `PointerSensor` (`:49-51`), sem `KeyboardSensor` (@dnd-kit suporta) → mouse/touch-only, barreira de a11y. Sem error state → erro vira "Snapshot não encontrado" (`:153-161`). Loading `Loader2` (`:147-151`). `border-amber-500/40 text-amber-600` (`:184,186`). **Positivo:** bloqueio de edição em finalized/archived com toast + banner.

**`Auth.tsx`** — **`navigate()` no corpo do render** (`if (user) { navigate(); return null }`, `:30-33`) em vez de `useEffect` — anti-pattern React. **Imports mortos:** `Button` (`:3`), `Separator` (`:9`), `Sparkles` (`:10`). Inline `rgba(34,197,94,0.1)` (`:95-96`) + `backgroundSize: '50px 50px'` (`:98`). **Dados fake em produção:** avatares `api.dicebear.com` (`:126-134`) + "+1000 empresas já confiam em nós" (`:137`). Erro por string `=== "Invalid login credentials"` (`:45`). Senha `minLength={6}` (`:226`) vs 8 em ResetPassword. Painel de branding (~40 linhas, `:91-141`) duplicado em FP/RP.

**`ForgotPassword.tsx`** — Casts `(error as any).code/.status` (`:28-29`). Inline `rgba(...)` + `50px 50px` (`:62-64`). Painel de branding duplicado (`:58-89`). **Positivo:** trata rate limit; não revela se e-mail existe; estado `sent` com instruções.

**`ResetPassword.tsx`** — **`setTimeout(1500ms)` mágico no fluxo implícito** (`:75-86`): se o SDK demorar >1,5s para processar `#access_token`, marca link válido como inválido — race em fluxo crítico. Inline `rgba(...)` + `50px 50px` (`:157-161`). Painel duplicado (`:154-185`). Senha inconsistente (8 aqui vs 6 no signup). **Positivo:** distingue expirado vs inválido; `signOut` após redefinir.

**`NotFound.tsx`** — **Inglês na UI:** "Oops! Page not found" (`:15`), "Return to Home" (`:16`). **`<a href="/">` (`:16`) força full reload** (perde SPA). Sem branding O2 (`bg-muted` genérico). `console.error` em produção a cada 404 (`:8`).

---

## Seção 3 — Fundações

### 3.1 Estado da migração de design system

O DS está **em migração ativa (Fase 1)** — ref. `docs/design-system-migration.md` (Hybrid B, "APPROVED FOR IMPLEMENTATION") e `docs/design-system-visual-map.md`. Estratégia: **repintar as CSS vars do shadcn in-place** com a paleta O2 (Lima/Ink), mantendo os 90+ componentes intactos, + camada paralela de tokens O2 consumida por 5 primitivos reescritos à mão.

### 3.2 Tokens — `src/index.css`

- **Cores (shadcn HSL vars, light + `.dark`):** `--background`, `--foreground`, `--card`, `--primary` (Lima 500 `138 100% 42%` light / Lima 400 `119 84% 66%` dark), `--secondary`, `--muted`, `--accent` (superfície de hover, **não** marca), `--destructive`, `--success`/`--warning` (marcados **DEPRECATED v1.1**), `--border`, `--input`, `--ring`, sidebar tokens. **Regra crítica (ADR-DS-001):** os vars são triplets `H S% L%` sem `hsl()` — **nunca escrever hex** neles, senão quebra todo `bg-primary/10` etc.
- **Camada O2 (aditiva, fonte de verdade para código novo):** `--o2-bg`, `--o2-fg`, `--o2-accent`, `--o2-border` (rgba real p/ alpha spec-perfect), `--bg`/`--fg`/`--surface` (aliases kebab), paleta raw `--lima-400/500/600`, `--ink-900..150`.
- **Radius:** `--radius: 0.75rem` (shadcn) + `--radius-sm: 8px`, `--radius-lg: 20px`, `--radius-pill: 999px`.
- **Sombras:** `--shadow-sm..xl`, `--shadow-glow`, `--shadow-accent-glow` (neutralizadas p/ ink).
- **Gradientes:** `--gradient-primary/accent/hero/glass/page...` — **DEPRECATED v1.1**, remoção agendada.
- **Motion:** `--ease: cubic-bezier(0.2,0.8,0.2,1)`; `--container: 1320px`.
- **Globais que afetam todas as páginas:** `body` recebe `--gradient-page` fixo (`:239`); `h1-h4` recebem `font-display`, `uppercase`, `letter-spacing`, `weight 400` + escala (`h1: text-4xl lg:text-5xl`) — **é isso que as páginas sobrescrevem indevidamente**.
- **Utilitários legados DEPRECATED ainda em uso (8 páginas):** `.hero-header`, `.glass-card`, `.gradient-text`, `.stat-card`, `.feed-card`, `.objectives-page-bg`. ⚠️ **`.objectives-page-bg` (`:409-415`) é CSS órfão** — definido mas **sem nenhum uso em `src/`** (dead code, remover).

### 3.3 Tokens — `tailwind.config.ts`

- **Fontes:** `display` (Tusker Grotesk → Anton/Barlow Condensed fallback), `body` (Montserrat), `mono` (JetBrains Mono) + **aliases legados** `sans` (Inter) e `heading` (Space Grotesk) — comentário admite consolidação pendente `sans→body`, `heading→display` na "Phase 2".
- **Cores/radius/shadow/gradients:** mapeados 1:1 para as CSS vars (`hsl(var(--x))`).
- **Animações:** `fade-in`, `slide-up`, `scale-in`, `shimmer`, `accordion-*`.
- ⚠️ **Fonte display ainda não self-hosted:** `index.html` carrega Anton + Barlow Condensed (Google Fonts) como fallback; Tusker Grotesk `.woff2` pendente (TODO no HTML). Ou seja, mesmo os títulos "corretos" não renderizam na Tusker real ainda.

### 3.4 Inventário `src/components/ui/` (shadcn — 48 primitivos)

accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input-otp, input, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, **skeleton**, slider, sonner, switch, table, tabs, textarea, toast, toaster, toggle, toggle-group, tooltip. Cobertura de shadcn essencialmente completa. **`skeleton` e `table` existem e são subutilizados** (ver Seção 2).

### 3.5 Camada de marca `src/components/o2/` (primitivos reescritos)

- **`o2/Button.tsx`** — pill (`rounded-full`), padding `px-[22px] py-[14px]` (arbitrário por spec), Montserrat 14/600, drop-in do shadcn Button. **Só 3 importadores** (Auth, ForgotPassword, ResetPassword) vs **154 do `ui/button`** → adoção incipiente.
- **`o2/StatCard.tsx`** — KPI editorial (mono eyebrow + display number `clamp(40px,6vw,64px)`), usa arbitrary `text-[var(--...)]`. **Consumido só por Index.tsx.**
- **`o2/Logo.tsx`** — logo O2 (usado no sidebar e nas páginas de auth).
- ⚠️ **`src/components/dashboard/StatCard.tsx` está órfão (0 importadores)** — dead code substituído pelo `o2/StatCard`.

### 3.6 Padrão de layout

- **`AppLayout.tsx`** (`src/components/layout/`) — `SidebarProvider` + `AppSidebar` + header sticky (busca via `CommandPalette` ⌘K, `ThemeToggle`, `NotificationDropdown`) + `PendingFeedbackBanner` + `<main className="flex-1 overflow-auto p-6 lg:p-8">`. **Todas as páginas internas devem envolver conteúdo em `AppLayout`** (Auth/FP/RP/NotFound são exceções públicas). ⚠️ Só `HR.tsx` adiciona `container mx-auto p-6` interno → padding duplicado.
- **`AppSidebar.tsx`** — navegação em grupos colapsáveis com gate por papel: **Início**, **Meu Espaço**, **Feedback**, **Desenvolvimento** (todos), **Gestão** (manager/admin), **Administração** (admin). Rodapé com avatar/menu (perfil, tema, sair) e versão. Bem estruturado; usa tokens de sidebar corretamente.
- **Erro/loading globais:** `ErrorBoundary` + `RouteFallback` (Suspense) no `App.tsx`; `QueryError` para erros de query (subutilizado); `QueryClient` com política de retry que não retenta 4xx/PGRST (`App.tsx:59-77`).

---

## Seção 4 — Classificação por página

Qualidade: **A** boa · **B** ok · **C** fraca. Esforço: **S/M/L**. Prioridade: **P0** crítica p/ experiência · **P1** · **P2**.

| Página | Rota | Qualidade | Esforço | Prioridade | Justificativa (1 linha) |
|---|---|:---:|:---:|:---:|---|
| Company | `/company` | **C** | L | **P0** | Card institucional 100% mockado ("People Hub Corp") em tela admin de produção + cores cruas + loading inconsistente. |
| Surveys | `/surveys` | **C** | M | **P0** | Sem loading/empty/erro + `window.location.href` (reload total) + ENPSTab/GPTWTab duplicadas. |
| HR | `/hr` | **C** | L | **P1** | God component (982 linhas), padding duplicado, `EditMemberDialog` morto, zero error handling, emojis como ícones. |
| Settings | `/settings` | **C** | M | **P1** | Botão "Sair" quebrado + switches/botões inertes (UI que promete e não entrega) + hex/cores fora de token. |
| ObjectiveDetail | `/objectives/:id` | **C** | M | **P1** | 749 linhas com muito código morto + `as any` difuso + erro mascarado como "não encontrado". |
| Auth | `/auth` | **C** | M | **P1** | `navigate()` no render (anti-pattern) + prova social fabricada + imports mortos + branding duplicado. |
| FeedbackAnalytics | `/admin/feedback/analytics` | **C** | L | **P1** | Fetch Supabase inline + spinner eterno em erro + cast inseguro + token `amber`. |
| NotFound | `*` | **C** | S | **P1** | Texto em inglês visível + `<a>` com reload total + sem branding O2. |
| Index | `/` | **B** | M | **P1** | 3 queries críticas sem `QueryError` (widgets somem em falha); header/hero legado. |
| Performance | `/performance` | **B** | M | **P1** | `window.confirm` nativo + skeleton `grid-cols-4` não responsivo + sem erro. |
| Objectives | `/objectives` | **B** | M | **P1** | 10 hex hardcoded via `style` inline + sem estado de erro + lógica de grupo duplicada. |
| OkrOverview | `/okr-overview` | **B** | M | **P1** | Hex hardcoded + cor por substring do título + progresso recalculado divergente do backend. |
| Teams | `/teams` | **B-** | M | **P1** | N+1 query (count por time em loop) + flicker de contagem + sem erro. |
| feedback/Inbox | `/feedback/inbox` | **B** | S | **P1** | Erro ignorado vira empty falso ("Bom trabalho!"). |
| feedback/Sent | `/feedback/sent` | **B** | M | **P1** | Erro mascarado + truncamento duplicado (CSS+JS) + `max-w-[260px]`. |
| feedback/AboutMe | `/feedback/about-me` | **B** | M | **P1** | `emerald-*` fora de token + erro ignorado em ambas as queries. |
| PDITeam | `/pdi/team` | **B** | M | **P1** | Bug de pluralização ("aprovaçãoões") + sem erro + cores `amber` cruas. |
| PDIDetail | `/pdi/:id` | **B-** | M | **P1** | Import morto + erro vira "não encontrado" + badge de contagem triplicado. |
| OneOnOneDetail | `/one-on-ones/:id` | **B** | M | **P1** | Query inline (fora do padrão) + erro mascarado como "1:1 não encontrada". |
| admin/PDIDashboard | `/admin/pdi-dashboard` | **B** | M | **P1** | `isLoading \|\| !data` → spinner infinito em falha + KpiCard/CSV/gate duplicados. |
| admin/OneOnOnesDashboard | `/admin/one-on-ones-dashboard` | **B-** | M | **P1** | Inglês na UI ("No-show", "% Completion") + copy quebrada + spinner infinito. |
| Pulse | `/pulse/:id` | **B** | S | **P1** | `enabled` gera empty-state falso enquanto o perfil carrega + erro conflatado. |
| admin/PulseSurveys | `/admin/pulse-surveys` | **B** | S | **P1** | Sem error state → empty falso; tabela de 9 colunas sem colapso mobile. |
| ResetPassword | `/reset-password` | **B** | M | **P1** | `setTimeout(1500ms)` pode invalidar link válido em conexão lenta. |
| Feed | `/feed` | **B** | S | **P2** | Enxuta e organizada; faltam header no padrão e camada de erro. |
| Recognition | `/recognition` | **B** | S | **P2** | Boa cobertura de loading/empty; falta erro e alinhamento de header/fonte. |
| Gamification | `/gamification` | **B** | S | **P2** | Shell simples; não garante estados (sem loading/empty/erro próprios). |
| admin/OkrEscalation | `/admin/okr-escalation` | **A/B** | S | **P2** | Melhor cobertura de estados do OKR; só falta colapso de colunas + header. |
| admin/OkrAccess | `/admin/okr-access` | **B** | S | **P2** | Inglês nos rótulos de nível + erro mascarado + loading spinner. |
| admin/Periods | `/admin/periods` | **A/B** | S | **P2** | Limpa; faltam Skeleton, colapso de colunas e erro distinto do empty. |
| feedback/Detail | `/feedback/:id` | **B** | S | **P2** | Bom estado de erro; ajustar "requester" (inglês) e `emerald-*`. |
| feedback/NewFeedbackRequest | `/feedback/new` | **A** | S | **P2** | Wrapper correto; falta apenas `<h1>` consistente. |
| PDI | `/pdi` | **A-** | S | **P2** | Mais completa do módulo; falta a11y do card, Skeleton e dedup de status. |
| OneOnOnes | `/one-on-ones` | **B+** | S | **P2** | Limpa (loading+erro ok); Skeleton e badge de contagem duplicado. |
| TimeOff | `/time-off` | **B** | S | **P2** | Melhor padrão de estados do app; só polimento (Skeleton, tokens de largura). |
| Automation | `/automation` | **A-** | S | **P2** | Limpa e responsiva; só o botão "Conectar Slack" placeholder. |
| admin/Invitations | `/admin/invitations` | **B+** | S | **P2** | Bem estruturada; falta error state e Skeleton. |
| admin/Managers | `/admin/managers` | **B** | M | **P2** | Sólida; dívida é a duplicação dos dois dialogs e o tamanho. |
| admin/PulseAnalytics | `/admin/pulse-surveys/:id/analytics` | **B** | S | **P2** | Sólida e responsiva; lacuna é o estado de erro (empurraria p/ P1). |
| admin/NineBox | `/admin/nine-box` | **B** | S | **P2** | Boa; erro mascarado como empty + cores de status hardcoded. |
| admin/NineBoxEditor | `/admin/nine-box/:id` | **B** | M | **P2** | Funcional e bem guardada; gap principal é a11y do DnD (sem teclado). |
| ForgotPassword | `/auth/reset` | **B** | S | **P2** | Corretude boa; ganho é dedup do branding + tokens no fundo. |

---

## Recomendações de ataque (para a Fase B/C)

**Onda 1 — transversais (destravam dezenas de telas):**
1. Criar `<PageHeader título/descrição/ação>` único e migrar as 38 páginas (remove `font-heading font-bold text-2xl` → herda `font-display` global).
2. Adotar `QueryError` em todas as ~39 páginas que hoje mascaram erro como empty/spinner infinito.
3. Padronizar loading com `Skeleton` (hoje só metade das páginas usa; feedback/PDI/1:1/pulse/admin usam `Loader2`).
4. Extrair helpers compartilhados: `EmptyState`, `formatDate` (3 cópias no feedback), `STATUS_BADGE` (4 cópias no PDI/1:1), `TabCountBadge`, `useRequireAdmin` (gate duplicado ×4), export-CSV, `AuthBrandingPanel` (3 cópias).
5. Varredura de cores fora de token (`emerald/amber/blue/green/red/slate-*`, hex) → tokens semânticos; remover `.objectives-page-bg` órfão e `dashboard/StatCard` morto.

**Onda 2 — bugs P0/P1 pontuais:** remover mock "People Hub Corp" (Company); ligar botão "Sair" e remover UI inerte (Settings); `window.confirm`→`AlertDialog` (Performance) e `window.location.href`→`useNavigate` (Surveys); `navigate()`→`useEffect` (Auth); `setTimeout`→evento do SDK (ResetPassword); corrigir pluralização (PDITeam); traduzir NotFound + `<Link>`; corrigir N+1 (Teams); quebrar HR e ObjectiveDetail (God components) e limpar código morto.
