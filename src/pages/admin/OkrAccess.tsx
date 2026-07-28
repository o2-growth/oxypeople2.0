import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
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
  manager: "Manager",
  contributor: "Contributor",
  restricted: "Restricted",
};

const LEVEL_VARIANT: Record<OkrAccessLevel, "default" | "secondary" | "outline"> = {
  manager: "default",
  contributor: "secondary",
  restricted: "outline",
};

export default function OkrAccessAdminPage() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: permsLoading } = useRequireAdmin({
    message: "Sem permissão para gerenciar acesso a OKR.",
  });
  const { rows, isLoading } = useOkrAccessLevels();
  const updateLevel = useUpdateOkrAccessLevel();

  const [search, setSearch] = useState("");


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
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" />
            Acesso a OKR
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Defina quem pode criar OKRs (Manager), contribuir (Contributor) ou apenas ler
            quando marcado (Restricted).
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Manager
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{counts.manager}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Contributor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{counts.contributor}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Restricted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{counts.restricted}</p>
            </CardContent>
          </Card>
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
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                Nenhuma pessoa encontrada.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pessoa</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead className="w-56">Nível</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
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
                          <Select
                            value={r.okr_access_level}
                            onValueChange={(v) => handleChange(r.id, v as OkrAccessLevel)}
                            disabled={updateLevel.isPending}
                          >
                            <SelectTrigger
                              className="h-9 w-40"
                              aria-label={`Nível de acesso de ${r.full_name}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="contributor">Contributor</SelectItem>
                              <SelectItem value="restricted">Restricted</SelectItem>
                            </SelectContent>
                          </Select>
                          <Badge variant={LEVEL_VARIANT[r.okr_access_level]}>
                            {LEVEL_LABEL[r.okr_access_level]}
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
