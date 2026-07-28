# Onda 2 — Correções P0/P1 por página

**Pré-requisito:** Onda 1 mergeada (usa PageHeader/EmptyState/QueryError/skeletons/helpers).
**Fonte de detalhes:** `audit/inventory.md` Seção 2 (file:line de cada problema).

Toda página desta onda, além do fix listado, DEVE: adotar PageHeader + padrão de estados (1.3) + remover cores fora de token. DoD do README se aplica integralmente.

## P0 (vergonha em produção — primeiro)

### Company `/company`
- REMOVER o card institucional mockado "People Hub Corp / peoplehub.com / Plano Pro" (linha ~259). Substituir por dados reais da company (tabela `companies`) ou remover a seção se não houver dado.
- Estados + tokens + PageHeader.

### Surveys `/surveys`
- `window.location.href` → `useNavigate` (SPA, sem reload total).
- Unificar `ENPSTab`/`GPTWTab` duplicadas num componente parametrizado.
- Estados completos (hoje: nenhum).

## P1 — bugs de comportamento

| Página | Fix obrigatório |
|---|---|
| Settings | Ligar botão "Sair" (usar `signOut` do AuthContext); REMOVER switches/botões inertes (UI que promete e não faz) ou implementá-los |
| Auth | `navigate()` fora do render (useEffect); remover prova social fabricada ("+1000 empresas" — é app interno!); usar `AuthBrandingPanel` compartilhado |
| Performance | `window.confirm` → `AlertDialog` shadcn; skeleton responsivo |
| ResetPassword | `setTimeout(1500)` → reagir a evento do SDK Supabase (onAuthStateChange) |
| PDITeam | Corrigir pluralização bugada ("aprovaçãoões") |
| NotFound | Traduzir pra pt-BR, `<a>` → `<Link>`, branding O2 |
| Teams | Corrigir N+1 (count por time em loop → uma query agregada) |
| Pulse | Corrigir empty falso enquanto perfil carrega (`enabled` + isLoading combinado) |
| Index | Adotar QueryError nas 3 queries críticas; migrar KPIs para `<NumberFlow>` |
| Objectives | Substituir os 10 hex inline (`GROUP_COLORS`) por tokens/palette derivada de CSS vars; estado de erro |
| OkrOverview | Idem hex; alinhar cálculo de progresso com o backend (usar `objectives.progress` quando presente) |
| feedback/Inbox, Sent, AboutMe | Adotar padrão de estados (erro ≠ empty); dedup truncamento |
| PDIDetail, OneOnOneDetail | Erro real ≠ "não encontrado"; query inline → hook |
| admin/PDIDashboard, OneOnOnesDashboard, FeedbackAnalytics | Matar `isLoading \|\| !data`; traduzir inglês da UI; fetch inline → hook |
| admin/PulseSurveys | Estado de erro; colapso mobile da tabela de 9 colunas (padrão card como HR/TimeOff) |

## P1 — God components (refatoração estrutural)

### HR `/hr` (982 linhas)
- Quebrar em: `HRStats`, `HRFilters`, `HRTable`, `HRMemberDrawer` (+ hooks). Página final < 200 linhas.
- Reativar ou deletar `EditMemberDialog` inalcançável; emojis → ícones lucide; error handling completo.

### ObjectiveDetail `/objectives/:id` (749 linhas)
- Extrair seções em componentes; deletar código morto; eliminar `as any`; distinguir erro de rede vs 404 real.

## Ordem de ataque sugerida (para paralelizar sem conflito)

- **Lote A (independentes):** Company, Surveys, Settings, Auth+ResetPassword+NotFound (mesmo domínio auth)
- **Lote B:** Index, Objectives, OkrOverview, Teams, Performance
- **Lote C:** feedback/* + Pulse + admin/analytics-dashboards
- **Lote D (grandes, um agente cada):** HR · ObjectiveDetail
