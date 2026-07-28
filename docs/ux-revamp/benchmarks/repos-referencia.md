# Repositórios de Referência (GitHub) — Revamp de UX do OxyPeople

> Pesquisa via WebSearch/WebFetch no GitHub. Estrelas verificadas diretamente na página do repositório sempre que possível (jul/2026); quando não verificado diretamente, está indicado.

---

## (a) Plataformas open-source de HR / OKR / People Management

### 1. [frappe/hrms](https://github.com/frappe/hrms) — ~8.6k ⭐
HRMS completo (payroll, recrutamento, onboarding/offboarding, presença, férias, folha) construído sobre o framework Frappe (Python/Django-like + UI própria). Tem um módulo de **Performance Management** com metas colaborativas estilo OKR/KRA, avaliação 360°, autoavaliação e ciclos de "appraisal" com tracking visual de progresso.
**O que aproveitar**: o *modelo de dados* do módulo de performance (metas vinculadas a KRAs, ciclo de avaliação, feedback 360 acoplado ao goal) é uma boa referência de domínio para a lógica de negócio do OxyPeople — mesmo não usando a stack de UI deles (não é React/shadcn).

### 2. [horilla/horilla-hr](https://github.com/horilla/horilla-hr) — ~1.3k ⭐
HR e CRM open-source (Python/Django + Bootstrap/HTMX) com recrutamento, onboarding, gestão de funcionários, presença, férias, ativos, folha, offboarding e helpdesk. **Não** possui módulos de OKR, PDI ou feedback contínuo.
**O que aproveitar**: organização de módulos de "HR core" (funcionários, ativos, offboarding, helpdesk) e permissionamento por papel — útil como checklist de funcionalidades adjacentes ao produto de performance, não como referência visual (stack de UI diferente da do OxyPeople).

### 3. [makeplane/plane](https://github.com/makeplane/plane) — ~55.2k ⭐ (AGPL-3.0)
Alternativa open-source a Jira/Linear/Monday, feita em React (não confirmado uso de shadcn/ui — parece ter design system próprio). Não é uma ferramenta de OKR/HR, mas é a referência de **qualidade de UX de ferramenta interna** mais bem avaliada da lista.
**O que aproveitar**: o conceito de **Cycles** (ciclos com burn-down chart) mapeia bem para "ciclos de OKR/review"; o editor de páginas rico com IA é referência para campos de feedback/PDI longos; command palette e views customizáveis por filtro são padrões de navegação fortes para qualquer ferramenta interna densa em dados.

### 4. [credifit-br/okr_os](https://github.com/credifit-br/okr_os) — ~27 ⭐
Sistema de gestão de OKR open-source, inspirado no Perdoo, construído em **Flutter** (web/desktop) com Firebase Auth. Projeto pequeno, poucos commits, atividade recente não confirmada.
**O que aproveitar**: modelo mínimo de domínio (Objetivo → Key Results → Iniciativas) como checklist de entidades, mas **não** como referência de stack (Flutter, não React).

### 5. [steedos/okr-management-app](https://github.com/steedos/okr-management-app) — ~15 ⭐
App de OKR construído sobre a plataforma low-code Steedos (Node.js/MongoDB), com alinhamento top-down/bottom-up, dashboards, módulo de "One on Ones" e "My Focus". Atividade moderada/baixa (51 commits, 17 issues abertas, 0 PRs ativos).
**O que aproveitar**: a combinação de OKR + 1:1 + "Meu Foco" em um único app é um conceito de IA de produto interessante (foco do indivíduo agregando OKR pessoal + 1:1 recente), mas a maturidade de código é baixa.

### 6. [seanrioux/strapi-okr-api](https://github.com/seanrioux/strapi-okr-api) — estrelas não verificadas
API de OKR "API-first" construída sobre o Strapi (headless CMS), MIT license. É apenas backend/API, sem UI.
**O que aproveitar**: referência de modelagem de API REST para OKR (endpoints de objetivos/key results) caso o time queira comparar contratos de API, não para UI.

**Observação geral**: não existe hoje um projeto open-source de "people management / performance" maduro (muitas estrelas, mantido ativamente) que já use a stack React + shadcn/ui + Tailwind do OxyPeople. Os projetos de OKR open-source encontrados são pequenos e pouco mantidos (dezenas de estrelas). Por isso, a Tarefa 2(b) abaixo é a fonte mais confiável de padrões visuais reaproveitáveis.

---

## (b) Templates/dashboards React + shadcn/ui + Tailwind (referência visual)

### 7. [satnaing/shadcn-admin](https://github.com/satnaing/shadcn-admin) — ~11k ⭐
O dashboard shadcn mais popular do GitHub. Stack: Vite + React + TypeScript + shadcn/ui (Tailwind + Radix) + React Router + Tabler Icons. Mais de 10 páginas prontas, **sidebar colapsável**, **command palette global (Cmd+K)**, light/dark mode, suporte a RTL, componentes acessíveis (WAI-ARIA).
**O que aproveitar**: referência nº1 para a **arquitetura de sidebar/menu** e para implementar um **command palette** de busca rápida (útil para navegar entre OKRs, pessoas e times no OxyPeople).

### 8. [Kiranism/next-shadcn-dashboard-starter](https://github.com/Kiranism/next-shadcn-dashboard-starter) — ~6.7k ⭐
Stack: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui (sobre Base UI) + Clerk (auth/organizations) + TanStack Table/Query + Zustand + TanStack Form/Zod + Recharts/Evil Charts. Inclui **Kanban board** (dnd-kit + Zustand), chat, central de notificações por abas, página de billing.
**O que aproveitar**: o padrão de **data table server-driven** (busca/filtro/paginação via URL state com `nuqs`) é diretamente aplicável a listagens de pessoas/OKRs; o **Kanban com drag-and-drop** é uma boa referência para uma futura visão de PDI ou de iniciativas de OKR em quadro.

### 9. [arhamkhnz/next-shadcn-admin-dashboard](https://github.com/arhamkhnz/next-shadcn-admin-dashboard) — ~2.8k ⭐
Stack: Next.js 16 + TypeScript + Tailwind CSS v4 + shadcn/ui + Zod + React Hook Form + Zustand + TanStack Table. Múltiplas variações de dashboard (Default, CRM, Finance, Analytics, Productivity, E-commerce, Academy, Logistics, Infrastructure), páginas de **Users/Roles Management**, 4 telas de autenticação, presets de tema (Tangerine, Brutalist etc.) e arquitetura "colocation-based".
**O que aproveitar**: referência forte para **telas diferenciadas por papel** (ex.: variações "Productivity"/"Analytics" poderiam inspirar dashboards distintos para colaborador vs. gestor vs. admin do OxyPeople) e para o sistema de **Users/Roles Management** (gestão de permissões).

### 10. [Qualiora/shadboard](https://github.com/Qualiora/shadboard) — ~701 ⭐
Stack: Next.js 15 + React 19 + Tailwind CSS 4 + Radix UI/shadcn/ui + NextAuth.js + Zod/React Hook Form + Recharts + TanStack Table + FullCalendar + Embla Carousel. Inclui apps de Email, Chat, **Calendar**, Kanban, Pricing/Payment, e uma seção robusta de **Settings** (Security, Plan & Billing, Notifications) e fluxos de auth (verify email, forgot/new password, unauthorized, maintenance).
**O que aproveitar**: a seção de **Settings** bem fatiada (segurança, notificações, plano) é um bom modelo para a área de configurações de conta/organização do OxyPeople; o **Calendar** (FullCalendar) é referência direta para agendamento de 1:1s e ciclos de review.

### 11. [shadcndashboard/shadcndashboard](https://github.com/shadcndashboard/shadcndashboard) — ~209 ⭐
Stack: React 19 + Vite + TypeScript + Tailwind CSS v4 + shadcn/ui + Base UI + Recharts + TipTap (editor de texto rico) + TanStack Table. Inclui apps de Blog, Notes e Tickets, páginas de perfil de usuário, autenticação completa (login, registro, recuperação de senha, OTP, 2FA).
**O que aproveitar**: o **editor de texto rico (TipTap)** é referência direta para campos longos de PDI/feedback qualitativo; o fluxo de autenticação com OTP/2FA é útil se o OxyPeople quiser reforçar segurança de login.

> Nota de precisão: durante a pesquisa, uma fonte secundária (blog agregador) afirmou que "Shadcn Dashboard" teria "6.000+ estrelas", mas a verificação direta na página do repositório `shadcndashboard/shadcndashboard` mostrou **209 estrelas**. Provavelmente houve confusão com o repositório `satnaing/shadcn-admin` (~11k) ou `Kiranism/next-shadcn-dashboard-starter` (~6.7k) em algum agregador. Mantive aqui o número verificado diretamente na fonte primária (GitHub).

---

## Resumo de recomendação de uso

| Necessidade do OxyPeople | Repo de referência |
|---|---|
| Sidebar + busca global (Cmd+K) | `satnaing/shadcn-admin` |
| Tabelas de dados server-driven (pessoas, OKRs) + Kanban | `Kiranism/next-shadcn-dashboard-starter` |
| Múltiplos dashboards por papel/perfil + gestão de usuários/roles | `arhamkhnz/next-shadcn-admin-dashboard` |
| Calendário (1:1s, ciclos) + tela de Settings fatiada | `Qualiora/shadboard` |
| Editor de texto rico (PDI/feedback) + fluxo de auth | `shadcndashboard/shadcndashboard` |
| Ciclos de review / burn-down / command palette de ferramenta interna densa | `makeplane/plane` (referência conceitual, não de stack) |
| Modelo de domínio de performance/OKR (não UI) | `frappe/hrms`, `credifit-br/okr_os`, `steedos/okr-management-app` |
