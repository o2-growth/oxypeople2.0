# UX Revamp — OxyPeople

**Objetivo:** tornar o OxyPeople a melhor ferramenta de gestão de pessoas que a O2 já usou — acima do Feedz — em usabilidade, clareza, estética e velocidade percebida. Toda página, sem exceção.

**Método:** spec-driven. Nada entra em código sem spec; nada é dado como pronto sem passar no DoD.

## Fases

| Fase | O quê | Quem |
|---|---|---|
| **A — Discovery** | Benchmark externo (`benchmarks/`), auditoria interna página a página (`audit/`), pesquisa de bibliotecas (`libraries.md`) | Subagents em paralelo |
| **B — Spec** | `specs/design-system.md`, `specs/ia-navigation.md`, specs por página com prioridade P0/P1/P2 | Orquestrador (estratégia) |
| **C — Execução** | Ondas: 1) shell + tokens + estados padrão · 2) páginas core (Dashboard, Objetivos, OKR Overview, RH, Times) · 3) demais páginas | Subagents com loop de verificação |
| **D — QA** | typecheck/lint/build/test + revisão contra spec + PR com preview | Orquestrador |

## Princípios de design (não negociáveis)

1. **Clareza > densidade.** Cada tela responde "o que eu preciso fazer aqui?" em 3 segundos.
2. **Consistência do shell.** Header de página, espaçamentos, cards e tipografia seguem um único padrão.
3. **Estados de primeira classe.** Toda tela tem loading (skeleton), empty (com CTA orientando) e erro (com recuperação). Nunca tela branca.
4. **PT-BR humano.** Sem anglicismos desnecessários, sem jargão técnico vazando pra UI.
5. **Dark/light de verdade.** Nenhuma cor hardcoded; tudo via tokens.
6. **Hierarquia por papel.** Colaborador, gestor e admin veem o que importa pro seu papel — sem ruído.
7. **Velocidade percebida.** Skeletons, transições curtas, otimismo em mutações onde seguro.

## DoD por página (checklist de aceite)

- [ ] Header padrão (título, descrição, ação primária)
- [ ] Estados loading/empty/erro implementados
- [ ] Responsivo (mobile-first nos grids)
- [ ] Dark/light sem regressão
- [ ] A11y básica: foco visível, labels, contraste
- [ ] Sem cor/tamanho hardcoded fora dos tokens
- [ ] `typecheck` + `lint` + `build` verdes

## Loop de verificação (Fase C)

```
implementador → entrega + relatório
     ↓
revisor (contra spec + DoD) → APROVADO ou lista de falhas
     ↓ (falhou)
implementador corrige → repete até APROVADO
```

## Restrições

- Branch de trabalho: `feat/ux-revamp` (base: `feat/okr-overview`). Nunca direto na main.
- Sem mudança de schema no banco nesta iniciativa (UI/UX only; dados já reorganizados).
- Migrations/backends fora de escopo salvo necessidade pontual aprovada.
- Trabalho não commitado de pipefy (branch `fix/pipefy-sync-active-headcount`) permanece intocado.

## Log de decisões

- 2026-07-28 — Kickoff. Orquestração direta (orquestrador + subagents com verify-loop), 4 fases, execução em 3 ondas.
- 2026-07-28 — Princípio de tokens de cor (Onda 2): cor com **significado de domínio → token nomeado no tema** (ex.: OkrOverview `--okr-area-*` espelhando `departments.color`); cor **decorativa de rotação → const local** (ex.: `GROUP_COLORS` do board Monday em Objectives).
- 2026-07-28 — Navegação por papel (Onda 3, §3.1): gate por papel é **só no menu** (show/hide de grupos), sem novos guards de rota — acesso por URL preservado (política de rota é decisão de produto à parte).
- 2026-07-28 — Nomenclatura do menu (Onda 3, §3.1): grupo **"Organização"** (antes "Empresa") com o item **"Empresa"** (→ `/company`), resolvendo o dessincronismo rótulo↔título sem tela nova; visão de organograma dedicada fica p/ onda futura. O dashboard de 1:1s (`/admin/one-on-ones-dashboard`) vive em **Meu Time** (não Admin) — intenção da spec (1:1s = Meu Time) vence a letra "tudo de /admin agrupado".
- 2026-07-28 — Item "Empresa" (→ `/company`) recebe gate por-item `adminOnly` no menu (some p/ gestor não-admin, já que a página tem gate de admin desde a Onda 2) — elimina item morto SEM relaxar o acesso da página. **Pergunta aberta p/ produto (Andrey):** abrir `/company` (dados institucionais) a gestor não-admin, ou manter admin-only?
- 2026-07-28 — Home por papel (Onda 3, §3.2): **admin = gestor** na Home (mesmo "Painel do Time"), sem 3ª variante — variante admin própria só se produto pedir depois. Colaborador recebe "Meu Dia" focado; o dashboard institucional pesado (CompanyOverview) fica só p/ gestor/admin. Widget "pulse do time" **diferido** (exige agregação por liderado sem backend novo) — não mockado.
- 2026-07-28 — Segurança de credenciais (processo): **credenciais de prod (ex.: `SUPABASE_SERVICE_ROLE_KEY`) NUNCA descem a subagents** — ficam só no orquestrador/lead. Quando um lote precisa de dados reais de prod (ex.: tabela antes→depois do painel do CTO no §3.4), o orquestrador extrai um **dataset read-only SEM credenciais** para fora do repo e entrega só os dados ao subagent.
- 2026-07-28 — Cálculo de domínio CTO-crítico nunca duplicado (Onda 3, §3.4): o rollup de progresso de OKR (`rollup`/`weightedMean`/`clampPct`) vive em fonte ÚNICA `src/lib/objective-rollup.ts`, importada por OkrOverview e ObjectiveTreeNode — se as cópias divergissem, o painel de acompanhamento e a árvore mostrariam números diferentes para o mesmo objetivo.
- 2026-07-28 — Integração da `main` atualizada (PRs #4–#8 de pulse/eNPS + RH, já em produção) na cadeia via **merge em 3 estágios** (`main → feat/okr-overview → feat/ux-revamp → feat/ux-revamp-onda3`), preservando os dois lados. Superfície de conflito real limitada a **AppSidebar** (todos os estágios) e **HR.tsx** (statusFilter); os fixes de pulse #5–#8, o count-fix de `usePeopleStats` e as 2 migrations entraram por merge limpo (arquivos intocados pela revamp).
- 2026-07-28 — Item **"Pesquisas Pulse"** (`/admin/pulse-surveys`, #4): a nav por papel (§3.1) já o incluía no grupo **Admin** — coincide com a intenção da main (que o pôs em "Administração", admin/owner). Placement mantido no **Admin** por coerência com o gate da rota. O "Empresa"/`/company` que a main tinha em `adminItems` NÃO é reintroduzido ali: a nav por papel moveu "Empresa" para o grupo **Organização** com gate `adminOnly` (decisão anterior) — evita item duplicado.
- 2026-07-28 — Fix de RH da main (#4) na estrutura nova: `statusFilter` default **"active"** preservado no container `HR.tsx` (relocado pela decomposição da Onda 2, mesmo bloco de estado → merge aplicou limpo); contagem "Total" que **exclui desligados** vem de `usePeopleStats` (`usePeopleList.ts`, intocado pela revamp), então flui automático para os cards do RH novo (HRStats/HRCollaboratorStats).
