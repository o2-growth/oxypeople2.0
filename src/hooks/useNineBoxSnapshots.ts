import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/useUser";
import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";
import { performanceBucket } from "@/lib/nineBox/performanceBucket";
import type { NineBoxSnapshotFormValues } from "@/lib/validation/nineBoxSchema";

export interface NineBoxSnapshotRow {
  id: string;
  company_id: string;
  cycle_id: string | null;
  name: string;
  status: "draft" | "finalized" | "archived";
  created_by: string;
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
  placement_count: number;
  cycle_name: string | null;
  creator_name: string | null;
}

export const NINE_BOX_LIST_KEY = "nine-box-snapshots";

export function useNineBoxSnapshots() {
  const { profile } = useUser();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const companyId = profile?.primary_company_id;
  const userId = user?.id;

  const listQuery = useQuery({
    queryKey: [NINE_BOX_LIST_KEY, companyId],
    queryFn: async (): Promise<NineBoxSnapshotRow[]> => {
      if (!companyId) return [];
      const { data: snaps, error } = await supabase
        .from("nine_box_snapshots")
        .select(`
          id, company_id, cycle_id, name, status, created_by,
          finalized_at, created_at, updated_at,
          cycle:performance_cycles(id, name),
          creator:users!nine_box_snapshots_created_by_fkey(id, full_name)
        `)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!snaps || snaps.length === 0) return [];

      // Conta placements por snapshot
      const snapshotIds = snaps.map((s) => s.id);
      const { data: placementCounts } = await supabase
        .from("nine_box_placements")
        .select("snapshot_id")
        .in("snapshot_id", snapshotIds);
      const counts = new Map<string, number>();
      (placementCounts ?? []).forEach((p) => {
        counts.set(p.snapshot_id, (counts.get(p.snapshot_id) ?? 0) + 1);
      });

      return snaps.map((s) => {
        const cycleRel = s.cycle as { id: string; name: string } | { id: string; name: string }[] | null;
        const cycle = Array.isArray(cycleRel) ? cycleRel[0] : cycleRel;
        const creatorRel = s.creator as { id: string; full_name: string | null } | { id: string; full_name: string | null }[] | null;
        const creator = Array.isArray(creatorRel) ? creatorRel[0] : creatorRel;
        return {
          id: s.id,
          company_id: s.company_id,
          cycle_id: s.cycle_id,
          name: s.name,
          status: s.status as NineBoxSnapshotRow["status"],
          created_by: s.created_by,
          finalized_at: s.finalized_at,
          created_at: s.created_at,
          updated_at: s.updated_at,
          placement_count: counts.get(s.id) ?? 0,
          cycle_name: cycle?.name ?? null,
          creator_name: creator?.full_name ?? null,
        };
      });
    },
    enabled: !!companyId,
  });

  const createSnapshot = useMutation({
    mutationFn: async (
      input: NineBoxSnapshotFormValues,
    ): Promise<{ snapshotId: string; placementsCreated: number; usersWithoutScore: number }> => {
      if (!companyId || !userId) throw new Error("Usuário/empresa não identificado.");

      const { data: snap, error: snapErr } = await supabase
        .from("nine_box_snapshots")
        .insert({
          company_id: companyId,
          cycle_id: input.cycle_id,
          name: input.name,
          created_by: userId,
        })
        .select("id")
        .single();
      if (snapErr) throw snapErr;
      const snapshotId = snap.id;

      let placementsCreated = 0;
      let usersWithoutScore = 0;

      // Auto-popula performance se cycle definido
      if (input.cycle_id) {
        // Carrega memberships do escopo
        let membershipQuery = supabase
          .from("company_memberships")
          .select("user_id, department_id, team_id")
          .eq("company_id", companyId)
          .eq("status", "active");
        if (!input.target_all) {
          const orFilters: string[] = [];
          if (input.target_departments.length > 0) {
            orFilters.push(`department_id.in.(${input.target_departments.join(",")})`);
          }
          if (input.target_teams.length > 0) {
            orFilters.push(`team_id.in.(${input.target_teams.join(",")})`);
          }
          if (orFilters.length > 0) {
            membershipQuery = membershipQuery.or(orFilters.join(","));
          }
        }
        const { data: members } = await membershipQuery;
        const memberIds = (members ?? []).map((m) => m.user_id);

        if (memberIds.length > 0) {
          // Carrega últimas avaliações do ciclo desses membros
          const { data: evaluations } = await supabase
            .from("performance_evaluations")
            .select("evaluated_id, overall_score, status")
            .eq("cycle_id", input.cycle_id)
            .in("evaluated_id", memberIds)
            .eq("status", "completed");

          // Agrupa por evaluated_id e tira média
          const scoreByUser = new Map<string, number>();
          const countByUser = new Map<string, number>();
          (evaluations ?? []).forEach((e) => {
            if (e.overall_score == null) return;
            scoreByUser.set(
              e.evaluated_id,
              (scoreByUser.get(e.evaluated_id) ?? 0) + e.overall_score,
            );
            countByUser.set(e.evaluated_id, (countByUser.get(e.evaluated_id) ?? 0) + 1);
          });

          const placementsToInsert = memberIds
            .map((uid) => {
              const total = scoreByUser.get(uid);
              const count = countByUser.get(uid);
              if (total == null || !count) {
                usersWithoutScore += 1;
                return null;
              }
              const avg = total / count;
              return {
                snapshot_id: snapshotId,
                user_id: uid,
                performance_axis: performanceBucket(avg),
                potential_axis: 2,
                performance_source: "auto",
                raw_evaluation_score: Math.round(avg * 100) / 100,
                placed_by: userId,
              };
            })
            .filter((p): p is NonNullable<typeof p> => p !== null);

          if (placementsToInsert.length > 0) {
            const { error: insErr } = await supabase
              .from("nine_box_placements")
              .insert(placementsToInsert);
            if (insErr) throw insErr;
            placementsCreated = placementsToInsert.length;
          }
        }
      }

      return { snapshotId, placementsCreated, usersWithoutScore };
    },
    onSuccess: (res, vars) => {
      trackEvent("nine_box_snapshot_created", {
        cycle_id: vars.cycle_id,
        scope_type: vars.target_all ? "all" : "filtered",
      });
      if (res.placementsCreated > 0) {
        trackEvent("nine_box_auto_populated", { count: res.placementsCreated });
        toast.success(`Snapshot criado · ${res.placementsCreated} colaboradores calibrados automaticamente`);
      } else {
        toast.success("Snapshot criado");
      }
      if (res.usersWithoutScore > 0) {
        toast.warning(`${res.usersWithoutScore} sem avaliação no ciclo — adicione manualmente.`);
      }
      queryClient.invalidateQueries({ queryKey: [NINE_BOX_LIST_KEY] });
    },
    onError: (err: Error) => {
      const msg = err.message ?? "";
      if (msg.includes("violates row-level security")) {
        toast.error("Sem permissão para criar snapshot.");
      } else {
        toast.error("Não foi possível criar o snapshot.");
      }
    },
  });

  const finalizeSnapshot = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("nine_box_snapshots")
        .update({ status: "finalized", finalized_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      trackEvent("nine_box_snapshot_finalized");
      toast.success("Snapshot finalizado");
      queryClient.invalidateQueries({ queryKey: [NINE_BOX_LIST_KEY] });
    },
    onError: () => toast.error("Não foi possível finalizar."),
  });

  const archiveSnapshot = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("nine_box_snapshots")
        .update({ status: "archived" })
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      toast.success("Snapshot arquivado");
      queryClient.invalidateQueries({ queryKey: [NINE_BOX_LIST_KEY] });
    },
    onError: () => toast.error("Não foi possível arquivar."),
  });

  const unarchiveSnapshot = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("unarchive_nine_box_snapshot", {
        snapshot_id: id,
      });
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      toast.success("Snapshot reaberto como rascunho");
      queryClient.invalidateQueries({ queryKey: [NINE_BOX_LIST_KEY] });
    },
    onError: () => toast.error("Não foi possível reabrir."),
  });

  const deleteSnapshot = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("nine_box_snapshots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Snapshot removido");
      queryClient.invalidateQueries({ queryKey: [NINE_BOX_LIST_KEY] });
    },
    onError: (err: Error) => {
      const msg = err.message ?? "";
      if (msg.includes("violates row-level security")) {
        toast.error("Apenas snapshots em rascunho podem ser removidos.");
      } else {
        toast.error("Não foi possível remover.");
      }
    },
  });

  return {
    snapshots: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    error: listQuery.error as Error | null,
    refetch: listQuery.refetch,
    createSnapshot,
    finalizeSnapshot,
    archiveSnapshot,
    unarchiveSnapshot,
    deleteSnapshot,
  };
}
