# Onda 3 — Arquitetura de informação + evoluções de produto

**Pré-requisito:** Ondas 1-2. Fonte: `benchmarks/plataformas.md` (síntese dos 10 padrões).

## 3.1 Navegação por papel (sidebar reorganizada)

Problema: menu atual mistura papéis; benchmark unânime em separar por contexto de uso.

```
INÍCIO        → Meu Dia (home por papel) · Mural
MEU ESPAÇO    → Meus Objetivos · Meu PDI · Minhas 1:1s · Feedback (inbox unificado) · Reconhecimentos
MEU TIME      (gestor/admin) → Painel do Time · OKRs do Time · PDIs · 1:1s · Pesquisas
EMPRESA       → Organograma · Times · Acompanhamento OKR (Vini) · RH
ADMIN         (admin) → tudo de /admin agrupado
```
- Renomear rótulos pra tarefa ("Meus Objetivos", não "Objetivos") — reduz ambiguidade colaborador vs gestor.
- Feedback: 3 itens do menu (Inbox/Pedir/Enviados) → 1 item "Feedback" com tabs internas.

## 3.2 Home por papel (evolução do Index) — padrão nº1 do benchmark

- **Colaborador:** meus KRs com check-in pendente · pulse ativo · 1:1 próxima · feedbacks não lidos · reconhecimentos recentes.
- **Gestor (adicional):** "Painel do Time" estilo Mural do Gestor (Feedz) / My Team Dashboard (15Five): progresso de OKR por liderado, check-ins atrasados, pulse do time, 1:1s da semana.
- Implementação: composição de widgets já existentes + `useUserPermissions` — SEM criar backend novo.

## 3.3 OKR no fluxo (padrão nº3) — pequeno e de alto impacto

- Na tela de 1:1 (`OneOnOneDetail`): seção "Objetivos deste liderado" (read-only, link pro detalhe).
- No check-in de KR: last_checkin_at visível + streak simples.

## 3.4 Rollup visual de progresso (padrão nº2)

- `OkrOverview` e `ObjectiveTreeNode`: progresso do pai = média ponderada dos filhos (consistente com backend `expected_progress`/`progress`), com barra dupla (real vs esperado) quando `expected_progress > 0`.

## 3.5 Jornada do Colaborador (padrão nº4) — se couber na onda

- No drawer de pessoa (`OrgMemberDrawer`/`CollaboratorDetailDrawer`): timeline unificada (feedbacks recebidos, PDIs, 1:1s, reconhecimentos) com dados já existentes.

## 3.6 Polimento P2 em massa

Aplicar o DoD nas ~22 páginas P2 (tabela da auditoria §4): PageHeader, estados, tokens, Skeleton, colapso mobile de tabelas, tradução de resíduos em inglês, `useAutoAnimate` nas listas.

## 3.7 Tour de primeiro acesso (driver.js — ADOTAR JÁ de libraries.md)

- `bun add driver.js` + wrapper `useDriverTour(steps)`.
- Tour 1: OKR Overview (pro Vini e gestores). Tour 2: primeiro login de colaborador (menu + check-in + pulse). Flag "já visto" em localStorage.

## Fora de escopo (registrar, não fazer)

- Command palette global ⌘K expandido (navegação + pessoas) — candidato à Onda 4.
- Migração reactflow → @xyflow/react (dívida técnica, PR dedicado).
- @tanstack/react-table em HR/Invitations (PoC separada).
- Action planning pós-pesquisa (Culture Amp) e PDI nascendo da review (Leapsome) — features de produto novas, precisam de spec própria + decisão do Andrey.
