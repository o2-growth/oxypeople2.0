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
