# Pesquisa de bibliotecas de UX — OxyPeople 2.0

> Contexto avaliado: Vite 5 + React 18 + TS + shadcn/ui (Radix) + Tailwind 3 + React Query v5 + RHF/Zod + Supabase + recharts 2 + reactflow 11 + dnd-kit 6/9 + sonner 1 + lucide + cmdk 1 (já em uso) + date-fns 3. App interno, ~55 usuários, code splitting por rota via Vite. Pesquisa realizada em 2026-07-28 (estado 2025/2026 das libs).

## Tabela-resumo

| Categoria | Lib recomendada | Veredito | Custo de bundle (gzip) | Observação rápida |
|---|---|---|---|---|
| Animação/micro-interações | **motion** (ex-framer-motion), com `LazyMotion`+`domAnimation` | **AVALIAR** | ~15 KB (lazy) / ~30 KB (full) | Só onde a transição *conta uma história* (drag do Kanban de OKR, modais de destaque). Não é "grátis". |
| Animação de listas | **@formkit/auto-animate** | **ADOTAR JÁ** | ~3,3 KB | Uma linha (`useAutoAnimate`) para listas/kanban/toasts sem reescrever nada. Custo/benefício imbatível. |
| tailwindcss-animate | (já instalado) | **NÃO PRECISA MUDAR** | 0 KB JS (CSS only) | Já cobre entradas/saídas dos componentes Radix/shadcn. Manter. |
| Tabelas de dados | **@tanstack/react-table v8** | **AVALIAR** | ~14,6 KB | Headless; só compensa nas telas com ordenação/filtro/paginação real (HR, Invitations, Managers). Não trocar tabelas simples. |
| Command palette / busca global | **cmdk** (shadcn `Command`) | **JÁ ADOTADO — manter** | ~0 (já pago) | Já implementado em `CommandPalette.tsx` e seletores de pessoa. Só evoluir o uso (ver detalhes). |
| Onboarding / tours | **driver.js** | **ADOTAR JÁ** | ~5 KB | Mais leve e mais visualmente polido que react-joyride (34 KB); ótimo para tour do OKR Overview e novos módulos. |
| Gráficos | **recharts** (manter) | **NÃO PRECISA TROCAR** | já pago (~136 KB total da lib, mas tree-shaken por componente) | Trocar por Nivo/Visx não se paga; o ganho está em **padronizar tema/tokens**, não na lib. |
| Empty states / ilustrações | **SVG próprio + lucide-react** (sem lib nova) | **NÃO PRECISA** | 0 KB extra | App interno em pt-BR não precisa de banco de ilustrações (undraw etc.); um kit de 6–8 SVGs simples resolve com consistência de marca. |
| Datas / tempo relativo | **date-fns** (manter v3, avaliar v4 futuramente) | **NÃO PRECISA (por ora)** | já pago, tree-shakable | v4 traz timezone de 1ª classe (`@date-fns/tz`), útil só se houver escala/plantão multi-fuso. Sem urgência. |
| Números animados (KPIs/OKR %) | **@number-flow/react** | **ADOTAR JÁ** | ~5–7 KB | Zero dependências, usa Intl.NumberFormat + WAAPI; ótimo para % de progresso de OKR, headcount, eNPS no dashboard. |
| Virtualização de listas | **react-virtuoso** | **NÃO PRECISA AGORA / AVALIAR** | ~19 KB | Com 55 usuários e tabelas atuais sem paginação real, o ganho é baixo hoje; revisitar se Feed/Inbox de feedback crescer sem paginação. |
| Fluxograma (org chart / OKR tree) | **@xyflow/react** (sucessor do `reactflow` v11 atual) | **AVALIAR (migração)** | equivalente ao atual | `reactflow` foi renomeado para `@xyflow/react` na v12; v11 seguirá funcionando mas sem novas features/patches. Migração é mecânica (import + CSS). |

Legenda de veredito: **ADOTAR JÁ** (baixo risco/custo, alto ganho, pode entrar no próximo sprint) · **AVALIAR** (vale prova de conceito em 1 tela antes de generalizar) · **NÃO PRECISA** (a stack atual já resolve bem).

---

## 1. Animação / micro-interações

### motion (ex-framer-motion)
- **Veredito: AVALIAR.**
- Em 2024 o pacote `framer-motion` foi consolidado dentro do pacote `motion` — imports antigos de `framer-motion` continuam funcionando via re-export automático, então não há pressa em migrar nomes ([Motion upgrade guide](https://motion.dev/docs/react-upgrade-guide)). Versão atual ativa (12.42.x, publicada há ~1 mês, 3,6M downloads/semana), ou seja, manutenção muito ativa.
- Custo: **~30 KB gzip completo**, mas com `LazyMotion` + preset `domAnimation` cai para **~15 KB**, reduzindo o footprint em ~50% ([Motion bundle size docs](https://motion.dev/docs/react-reduce-bundle-size); [Bundlephobia](https://bundlephobia.com/package/framer-motion)).
- Risco: baixo tecnicamente, mas **alto risco de "over-animation"** em um app de gestão de pessoas usado no trabalho — precisa de disciplina (usar `prefers-reduced-motion`, evitar animação decorativa sem propósito).
- Onde aplicaria no OxyPeople: transições de step no onboarding/tours, abertura de `ObjectiveDetail`/`PDIDetail` (layout animations com `layoutId` para "hero transition" do card → detalhe), reordenação do Kanban de objetivos (`dnd-kit` já cuida do drag, `motion`/`auto-animate` cuidam do *settle*).
- Como só há 1–3 telas que justificam animação rica hoje, recomendo **AVALIAR com PoC em uma tela** (ex.: transição de card→detalhe em Objectives) antes de espalhar a lib pela base.

### @formkit/auto-animate
- **Veredito: ADOTAR JÁ.**
- 3,28 KB gzip, zero dependências, zero config: basta um `ref` (`useAutoAnimate`) no container e ele anima adição/remoção/reordenação via FLIP automaticamente, funcionando até com markup de terceiros ([Bundlephobia](https://bundlephobia.com/package/@formkit/auto-animate); [auto-animate.formkit.com](https://auto-animate.formkit.com/)).
- Mantido ativamente: última versão (0.10.0) publicada ~17 dias atrás, PRs e issues recentes ao longo de 2026.
- Risco: muito baixo — é aditivo, não interfere em lógica de estado.
- Onde aplicaria: listas de notificações/feed, lista de convites (`admin/Invitations`), listas de tarefas/PDI, toasts empilhados, resultado de busca no Command Palette. É o "primeiro passo" barato antes de decidir se vale investir em `motion`.

### tailwindcss-animate
- Já está instalado e é a base das animações de entrada/saída dos componentes Radix (dialog, popover, accordion, dropdown). **Manter como está** — é puramente CSS (0 custo de JS runtime).

## 2. Tabelas de dados

- **@tanstack/react-table v8: AVALIAR** (não substituir tudo, aplicar seletivamente).
- Hoje o OxyPeople usa o `<Table>` do shadcn "cru" em **16 arquivos** (`HR.tsx`, `TimeOff.tsx`, `admin/Invitations.tsx`, `admin/Managers.tsx`, `admin/NineBox.tsx`, `admin/Periods.tsx`, `admin/OkrAccess.tsx`, `admin/OkrEscalation.tsx`, `feedback/Sent.tsx`, `PulseSurveys/Analytics`, `EvaluationsList`, `MembersList`, `DepartmentTable`, `FrequencyTable`, `NPSTab`) — nenhuma delas tem ordenação/filtro client-side hoje (não há `sortConfig`/`sortBy` no código), ou seja, são tabelas de exibição simples.
- TanStack Table é headless (não estiliza nada — você usa o `<Table>` do shadcn por baixo), tree-shakable, e pesa **56,6 KB min / 14,6 KB min+gzip** ([bundle size via busca web](https://tanstack.com/table/v8/docs/introduction)). v9 ainda está em beta com breaking changes — **usar v8 em produção**.
- Risco: o custo real não é o bundle, é o *esforço de reescrever* cada header/cell/paginação manualmente (é headless, não "batteries-included").
- Onde aplicaria: telas onde já existe (ou vai existir) necessidade real de ordenar/filtrar/paginar — candidatas fortes: **`HR.tsx`** (lista de colaboradores, provavelmente a maior tabela do app), **`admin/Invitations.tsx`** e **`admin/Managers.tsx`**. Para as tabelas pequenas e estáticas (ex. `DepartmentTable`, `FrequencyTable`), manter o `<Table>` simples — trocar ali seria over-engineering.

## 3. Command palette / busca global

- **Veredito: JÁ ADOTADO — evoluir o uso, não trocar a lib.**
- `cmdk` (v1.1.1) já está no `package.json` e já implementado em `src/components/CommandPalette.tsx`, além de ser reaproveitado em seletores (`PersonSelector`, `MultiPersonSelector`, `ParentObjectiveSelector`, `UserPicker` de feedback). É a mesma lib por trás do `Command` do shadcn/ui, continua sendo o padrão de facto para command palettes em React em 2025/2026.
- Não há motivo para trocar — o ganho de UX aqui é de **produto**, não de biblioteca: garantir atalho global (`⌘K`/`Ctrl+K`) visível/descobrível, unificar todos os "pickers" de pessoa num único componente de busca, e adicionar navegação por seções (Objetivos, Pessoas, Configurações) na paleta existente.
- Custo adicional: **0** (já pago).

## 4. Onboarding / tours guiados

- **Veredito: ADOTAR JÁ — driver.js.**
- Comparativo 2026: `driver.js` ≈ **5 KB** gzip, framework-agnostic, "spotlight" visualmente polido e fácil de disparar sob demanda; `react-joyride` ≈ **34 KB**, React-first mas com customização que "fica dolorosa" além do básico ([usertourkit.com benchmark 2026](https://usertourkit.com/blog/react-tour-library-benchmark-2026); [Medium — Top Libraries for Product Tours](https://medium.com/dogus-teknoloji/top-libraries-for-product-tours-highlights-5976077cb3bf)).
- Popularidade: react-joyride tem mais downloads semanais totais, mas driver.js tem mais estrelas no GitHub (25,6k vs 7,7k) e é ~7x mais leve — para um app interno onde bundle importa mais que "ecossistema React idiomático", driver.js vence.
- Risco: baixo; API imperativa (não é componente React declarativo), então precisa de um wrapper fino (`useDriverTour(steps)`) para se integrar bem com React Router/estado de "já visto" (guardar flag por usuário, ex. em `localStorage` ou tabela Supabase de preferências).
- Onde aplicaria: tour de primeiro acesso ao **OKR Overview** (feature nova), tour de "Como funciona o Pulse/1:1" para gestores novos, destaque de features nas páginas admin pouco usadas (`OkrEscalation`, `NineBoxEditor`).

## 5. Gráficos

- **Veredito: NÃO PRECISA TROCAR o recharts — padronizar tema.**
- Recharts continua a opção mais baixada (~1,8M/semana) e com melhor "health score" (79/100) entre as libs de chart React em 2025/2026, à frente de Nivo (450K/semana) e Visx (300K/semana) ([PkgPulse guia 2026](https://www.pkgpulse.com/guides/recharts-vs-chartjs-vs-nivo-vs-visx-react-charting-2026); [npm-compare](https://npm-compare.com/@nivo/line,@vx/shape,chart.js,recharts)).
- Visx (Airbnb) é mais customizável mas é *primitivos de baixo nível sobre D3* — exigiria reescrever tudo que já existe em 14 componentes de chart do OxyPeople (`ProgressChart`, `EngagementChart`, `HeadcountSparkline`, `TrendChart`, `PulseLineChart`, `CompetencyRadar`, `TopCompetencies`, `FeedbackTimelineChart`, `CompetencyRankingChart` etc.). Nivo é mais bonito "out of the box" mas mais pesado e menos flexível para o design system próprio do OxyPeople.
- Custo de trocar > benefício. O ganho real de UX está em **unificar tokens visuais** (cores por status/categoria, tooltip padrão, grid/eixos consistentes) reaproveitando o `chart.tsx` (wrapper shadcn) que já existe — ou seja, um esforço de *design system*, não de troca de lib.
- Risco de manter: nenhum — lib madura, estável, sem sinais de abandono.

## 6. Empty states / ilustrações

- **Veredito: NÃO PRECISA de lib — resolver com SVGs próprios + lucide-react.**
- Não existe hoje nenhum componente de "empty state" no código (`No files found` na busca). Isso é uma lacuna de produto mais do que de ferramenta.
- Para um app interno em pt-BR (não é um SaaS público que precisa "vender" com ilustrações fofinhas tipo unDraw/Humaaans), o caminho mais barato e consistente com a marca é: **1 componente `<EmptyState icon title description action />`** usando ícones `lucide-react` (já pago) + eventualmente 4–6 SVGs de linha simples desenhados no estilo do produto (ex. para "Sem objetivos ainda", "Nenhum feedback recebido", "Inbox vazia").
- Se no futuro quiserem ilustrações mais "editoriais", `unDraw` (SVG grátis, customizável por cor, sem dependência de runtime — só se copia o SVG) é a opção mais leve; não precisa de pacote npm.
- Custo: 0 KB de runtime extra (é composição de componentes + ícones já existentes).

## 7. Datas / tempo relativo

- **Veredito: NÃO PRECISA trocar — date-fns v3 atende bem.**
- Comparativo 2025/2026: date-fns ~13 KB, Day.js ~2 KB, Luxon ~23 KB; date-fns e Day.js são tree-shakable (você paga só pelas funções usadas), Luxon não é (CJS, tamanho fixo) ([reintech.io comparação 2026](https://reintech.io/blog/date-fns-vs-dayjs-vs-luxon-comparison-2026); [PkgPulse](https://www.pkgpulse.com/guides/date-fns-v4-vs-temporal-api-vs-dayjs-2026)).
- date-fns v4 adicionou timezone de 1ª classe via `@date-fns/tz` — só relevante se o OxyPeople precisar lidar com colaboradores em múltiplos fusos (hoje o app parece operar em fuso único, BRT). **Sem urgência**; reavaliar se houver expansão para equipes remotas fora do Brasil.
- Trocar para Day.js economizaria alguns KB, mas exigiria reescrever todos os usos de `date-fns` espalhados pelo código sem ganho de UX perceptível para o usuário final — não compensa o esforço/risco de regressão.

## 8. Outras libs de alto impacto

### @number-flow/react — ADOTAR JÁ
- Componente de número animado construído sobre `Intl.NumberFormat` + Web Animations API, **sem dependências externas**, ~6,8 KB gzip (build Svelte de referência; build React é equivalente) ([number-flow.barvian.me](https://number-flow.barvian.me/)).
- Onde aplicaria: cards de KPI no dashboard (headcount, % de progresso de OKR, eNPS/engajamento no `EngagementChart`/`HeadcountSparkline`), barra de progresso numérica em `ObjectiveDetail`/`OkrOverview` — dá aquele "polish" de contagem ao carregar/atualizar dado sem precisar de `motion` inteiro só para isso.
- Risco: baixíssimo, lib pequena e recente mas ativa; se preferir menos uma dependência nova, dá para simular com `useSpring`-like custom hook, mas o ganho de tempo de implementação compensa adotar a lib pronta.

### react-virtuoso — NÃO PRECISA AGORA / monitorar
- Virtualização de listas: `react-virtuoso` (~19 KB) é hoje a recomendação padrão 2026 por ter API rica (alturas dinâmicas, sticky headers, agrupamento) vs `react-window` (mais leve, mas só alturas fixas e sem desenvolvimento ativo) ([PkgPulse TanStack Virtual vs react-window vs react-virtuoso 2026](https://www.pkgpulse.com/guides/tanstack-virtual-vs-react-window-vs-react-virtuoso-2026)).
- Com 55 usuários e tabelas hoje sem paginação real, **não há dataset grande o suficiente para justificar** — mas o **Feed** e o **Inbox de feedback** são os candidatos naturais se o histórico crescer sem paginação no futuro. Recomendo revisitar quando (a) a lista de feed ultrapassar ~200 itens renderizados de uma vez, ou (b) surgir reclamação de scroll travando.

### @xyflow/react (sucessor do reactflow v11) — AVALIAR migração
- `reactflow` (usado em `OrganizationChartFlow.tsx`, `OrgFlowNodes.tsx`, `org-layout.ts` para o organograma com `dagre`) foi **renomeado para `@xyflow/react` na v12** (import muda de `from 'reactflow'` para `from '@xyflow/react'`, mais ajuste do CSS import) ([xyflow.com — React Flow 12 release](https://xyflow.com/blog/react-flow-12-release); [guia de migração v12](https://reactflow.dev/learn/troubleshooting/migrate-to-v12)).
- v11 continua funcional mas **não recebe mais features novas** — se o organograma (ou a futura árvore de OKR) precisar de recursos novos (melhor performance em grafos grandes, novos handles/edges), vale planejar a migração mecânica. Não é urgente para uso atual, mas é dívida técnica barata de resolver antes que o gap de versões aumente.
- Custo/risco: migração é majoritariamente find-and-replace de imports + testar layout do `dagre`; baixo risco, esforço pequeno (1 PR dedicado).

---

## Resumo de esforço sugerido (ordem de prioridade)

1. **ADOTAR JÁ, baixíssimo esforço:** `@formkit/auto-animate` (listas/kanban/toasts) + `driver.js` (tour do OKR Overview) + `@number-flow/react` (KPIs do dashboard).
2. **AVALIAR com PoC pontual:** `@tanstack/react-table` em `HR.tsx`/`Invitations.tsx`; `motion` (LazyMotion) numa transição card→detalhe.
3. **Dívida técnica de manutenção (sem pressa):** migrar `reactflow` → `@xyflow/react`.
4. **Não mexer:** recharts, date-fns, cmdk, tailwindcss-animate — já corretos para o estágio atual do produto.

## Metodologia

- Leitura de `package.json` e varredura do código-fonte (`grep`/`glob`) para mapear uso real de `cmdk`, tabelas, charts e `reactflow`.
- 11 buscas na web (2025/2026) cobrindo: motion/framer-motion, TanStack Table, driver.js vs react-joyride, recharts vs alternativas, auto-animate, react-window vs react-virtuoso, date-fns vs dayjs/luxon, number-flow/react-countup, manutenção do auto-animate, e reactflow → @xyflow/react.
- Fontes primárias priorizadas: docs oficiais (motion.dev, tanstack.com, xyflow.com, auto-animate.formkit.com, number-flow.barvian.me) e comparativos técnicos recentes (PkgPulse, Bundlephobia, npm-compare).

### Lacunas / limitações da pesquisa
- Não foi possível confirmar o volume real de linhas em `HR.tsx` (colaboradores) para quantificar com precisão o ganho de `react-table`/virtualização — recomendação é qualitativa, baseada na presença de padrões de filtro/busca no código.
- Bundle final real (impacto no build) não foi medido com `vite-bundle-visualizer` neste app — os números citados são de Bundlephobia/documentação oficial das libs, não do bundle do OxyPeople.
