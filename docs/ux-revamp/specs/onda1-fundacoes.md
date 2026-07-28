# Onda 1 — Fundações transversais

**Objetivo:** criar os componentes/padrões que destravam TODAS as telas. Nada de página individual aqui — só infraestrutura de UI. Base: `audit/inventory.md` (problemas sistêmicos 1-6) + `libraries.md` (vereditos).

## 1.1 `<PageHeader>` (novo — `src/components/layout/PageHeader.tsx`)

Problema: 38 páginas com h1 divergente (`text-2xl`/`text-3xl`/`text-xl`, `font-heading` legado).

```tsx
interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;            // opcional, à esquerda do título
  actions?: React.ReactNode;    // botões à direita (ação primária da página)
  children?: React.ReactNode;   // linha extra (filtros/tabs) abaixo
}
```
- Título: `text-2xl font-display font-bold` (herda a fonte global O2 — NÃO `font-heading`).
- Layout: flex, título+descrição à esquerda, `actions` à direita; empilha no mobile.
- Margem padrão inferior única (`mb-6`), pra matar spacing ad-hoc.

## 1.2 `<EmptyState>` (novo — `src/components/ui/empty-state.tsx`)

Problema: zero componentes de empty no app (lacuna confirmada na pesquisa de libs).

```tsx
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;                // pt-BR, orienta ("Nenhum objetivo ainda")
  description?: string;         // o que fazer a respeito
  action?: { label: string; onClick: () => void };  // CTA opcional
  className?: string;
}
```
- Visual: ícone em círculo `bg-muted`, título `font-medium`, descrição `text-muted-foreground`, CTA `variant="outline"`.
- SEM lib de ilustração (decisão libraries.md §6).

## 1.3 Padrão de estados de query (obrigatório em TODA página)

Problema nº1 do app: ~39 páginas mascaram erro como empty falso ou spinner infinito.

Regra de implementação (ordem fixa):
```tsx
if (isLoading) return <PageSkeleton />;      // Skeleton, NUNCA Loader2 em página inteira
if (isError)   return <QueryError onRetry={refetch} />;  // componente existente!
if (!data?.length) return <EmptyState ... />;
```
- `QueryError` JÁ EXISTE no código (usado em só 3 páginas) — adotá-lo, não recriar.
- Proibido `isLoading || !data` (causa spinner infinito em falha).
- Proibido tratar `isError` como lista vazia.
- `Loader2` só permitido em botões/ações inline, nunca como estado de página.

## 1.4 Skeletons padrão (novo — `src/components/ui/page-skeleton.tsx`)

Exportar 3 presets reutilizáveis: `<ListPageSkeleton />` (header + 5 linhas), `<CardsPageSkeleton />` (header + grid 3 cards), `<DetailPageSkeleton />` (header + 2 blocos). Grids responsivos (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` — nunca `grid-cols-4` seco).

## 1.5 Helpers compartilhados (dedup)

| Novo | Substitui | Cópias hoje |
|---|---|---|
| `src/lib/formatters.ts` → `formatDate`, `formatDateTime`, `formatRelative` | 3 cópias no feedback | ×3 |
| `src/components/shared/StatusBadge.tsx` (mapa status→cor via tokens) | `STATUS_BADGE` local | ×4 (PDI/1:1) |
| `src/components/shared/TabCountBadge.tsx` | badges de contagem em tabs | ×3 |
| `src/hooks/useRequireAdmin.ts` (redireciona não-admin + toast) | gate copiado | ×4 (admin/*) |
| `src/lib/export-csv.ts` | export duplicado | ×2 |
| `src/components/auth/AuthBrandingPanel.tsx` | painel de branding | ×3 (Auth/Forgot/Reset) |

Regra: criar o compartilhado E migrar os call-sites na mesma entrega (não deixar as cópias vivas).

## 1.6 Higiene de tokens e código morto

- `font-heading` → remover o alias das classes usadas em páginas/componentes (46 arquivos); títulos passam a herdar `font-display` global (via PageHeader onde possível).
- Cores fora de token (`emerald-*`, `amber-*`, `blue-*`, `green-*`, `red-*`, `slate-*`, hex em `style=`): substituir por tokens semânticos existentes (`primary`, `destructive`, `muted`, `--o2-*`). Onde faltar token semântico (ex: warning), usar a variável CSS já definida — NÃO criar paleta nova.
- Deletar: `.objectives-page-bg` (CSS órfão em index.css) e `src/components/dashboard/StatCard.tsx` (0 imports reais — as 2 referências são comentários do sucessor `o2/StatCard`).

## 1.7 Libs novas (vereditos ADOTAR JÁ de libraries.md)

```bash
bun add @formkit/auto-animate @number-flow/react
```
- `useAutoAnimate` nos containers de lista (feed, convites, notificações, resultados de busca) — aplicação nas Ondas 2/3, aqui só instalar + 1 exemplo.
- `<NumberFlow>` nos KPIs (Index, OkrOverview) — idem.
- `driver.js` fica pra Onda 3 (tour), não instalar agora.

## DoD da Onda 1

- [ ] 6 componentes/helpers novos criados com as APIs acima
- [ ] Call-sites das duplicações migrados (0 cópias restantes: grep limpo)
- [ ] Código morto deletado
- [ ] Libs instaladas (bun + package-lock em sync via npm install --package-lock-only se CI usa npm ci)
- [ ] `npm run typecheck` + `lint` + `build` + `test` verdes
- [ ] NENHUMA página redesenhada aqui (isso é Onda 2/3) — só fundações + migrações mecânicas
