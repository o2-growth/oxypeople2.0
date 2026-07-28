import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ShieldCheck, Users } from "lucide-react";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { PageHeader } from "@/components/layout/PageHeader";
import { ListPageSkeleton } from "@/components/ui/page-skeleton";
import { QueryError } from "@/components/QueryError";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useOkrAccessLevels,
  useUpdateOkrAccessLevel,
  type OkrAccessLevel,
} from "@/hooks/useOkrAccessLevels";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const LEVEL_LABEL: Record<OkrAccessLevel, string> = {
  manager: "Gestor",
  contributor: "Contribuidor",
  restricted: "Restrito",
};

const LEVEL_VARIANT: Record<OkrAccessLevel, "default" | "secondary" | "outline"> = {
  manager: "default",
  contributor: "secondary",
  restricted: "outline",
};

const LEVEL_ORDER: OkrAccessLevel[] = ["manager", "contributor", "restricted"];

export default function OkrAccessAdminPage() {
  const queryClient = useQueryClient();
  const { isAdmin, isLoading: permsLoading } = useRequireAdmin({
    message: "Sem permissão para gerenciar acesso a OKR.",
  });
  const { rows, isLoading, error } = useOkrAccessLevels();
  const updateLevel = useUpdateOkrAccessLevel();

  const [search, setSearch] = useState("");

  const [cardsRef] = useAutoAnimate<HTMLDivElement>();
  const [tbodyRef] = useAutoAnimate<HTMLTableSectionElement>();

  const counts = useMemo(() => {
    const c = { manager: 0, contributor: 0, restricted: 0 };
    rows.forEach((r) => {
      c[r.okr_access_level] += 1;
    });
    return c;
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const haystack = [r.full_name, r.email, r.position]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, search]);

  const handleChange = (membershipId: string, level: OkrAccessLevel) => {
    updateLevel.mutate({ membershipId, level });
  };

  if (permsLoading || !isAdmin) {
    return (
      <AppLayout>
        <ListPageSkeleton />
      </AppLayout>
    );
  }

  const levelSelect = (r: (typeof filteredRows)[number], fullWidth = false) => (
    <Select
      value={r.okr_access_level}
      onValueChange={(v) => handleChange(r.id, v as OkrAccessLevel)}
      disabled={updateLevel.isPending}
    >
      <SelectTrigger
        className={fullWidth ? "h-9 w-full" : "h-9 w-40"}
        aria-label={`Nível de acesso de ${r.full_name}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LEVEL_ORDER.map((level) => (
          <SelectItem key={level} value={level}>
            {LEVEL_LABEL[level]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <AppLayout>
      <PageHeader
        icon={ShieldCheck}
        title="Acesso a OKR"
        description="Defina quem pode criar OKRs (Gestor), contribuir (Contribuidor) ou apenas visualizar quando marcado (Restrito)."
      />

      <div className="space-y-6">
        <div className="grid gap-3 md:grid-cols-3">
          {LEVEL_ORDER.map((level) => (
            <Card key={level}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {LEVEL_LABEL[level]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{counts[level]}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pessoas da empresa</CardTitle>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <div className="relative min-w-[200px] flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, e-mail, cargo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : error ? (
              <QueryError
                message="Não foi possível carregar as pessoas da empresa."
                onRetry={() => queryClient.invalidateQueries({ queryKey: ["okr-access-levels"] })}
              />
            ) : rows.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Nenhuma pessoa na empresa"
                description="Convide colaboradores para poder definir o nível de acesso a OKR de cada um."
              />
            ) : filteredRows.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Nenhuma pessoa encontrada para "{search}".
              </p>
            ) : (
              <>
                {/* Mobile: cards (colapso da tabela) */}
                <div ref={cardsRef} className="space-y-3 md:hidden">
                  {filteredRows.map((r) => (
                    <div key={r.id} className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={r.avatar_url ?? undefined} alt={r.full_name} />
                          <AvatarFallback className="text-[10px]">
                            {getInitials(r.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{r.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                        </div>
                        <Badge variant={LEVEL_VARIANT[r.okr_access_level]}>
                          {LEVEL_LABEL[r.okr_access_level]}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Cargo: {r.position || "—"}</span>
                        <span>Área: {r.department || "—"}</span>
                      </div>
                      {levelSelect(r, true)}
                    </div>
                  ))}
                </div>

                {/* Desktop: tabela completa */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pessoa</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Área</TableHead>
                        <TableHead className="w-56">Nível</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody ref={tbodyRef}>
                      {filteredRows.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={r.avatar_url ?? undefined} alt={r.full_name} />
                                <AvatarFallback className="text-[10px]">
                                  {getInitials(r.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{r.full_name}</p>
                                <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{r.position || "—"}</TableCell>
                          <TableCell className="text-sm">{r.department || "—"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {levelSelect(r)}
                              <Badge variant={LEVEL_VARIANT[r.okr_access_level]}>
                                {LEVEL_LABEL[r.okr_access_level]}
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
