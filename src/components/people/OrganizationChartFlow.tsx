import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type NodeChange,
  type ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Network, Search, Download, RotateCcw, GripVertical } from "lucide-react";
import { toPng } from "html-to-image";
import { useOrganizationHierarchy, type HierarchyNode } from "@/hooks/useOrganizationHierarchy";
import { useManagers } from "@/hooks/useManagers";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import {
  buildOrgGraph,
  buildManagerHierarchy,
  flattenHierarchy,
  type OrgFlowNodeData,
} from "./org-layout";
import { orgNodeTypes } from "./orgNodeTypes";
import { OrgMemberDrawer } from "./OrgMemberDrawer";
import { OrgListView } from "./OrgListView";
import { trackEvent } from "@/lib/analytics";

type DepartmentOption = { id: string; name: string };
type OrgMode = "visual" | "list";

interface FlowInnerProps {
  hierarchy: HierarchyNode | null;
  search: string;
  departmentId: string;
  scope: "all" | "mine";
  myUserNodeId: string | null;
  departmentOptions: DepartmentOption[];
  setSelected: (node: HierarchyNode | null) => void;
  wrapperRef: React.RefObject<HTMLDivElement>;
  flowInstanceRef: React.MutableRefObject<ReactFlowInstance | null>;
}

function userIdFromNodeId(nodeId: string): string | null {
  if (!nodeId.startsWith("member-")) return null;
  return nodeId.slice("member-".length);
}

function FlowInner({
  hierarchy,
  search,
  departmentId,
  scope,
  myUserNodeId,
  departmentOptions,
  setSelected,
  wrapperRef,
  flowInstanceRef,
}: FlowInnerProps) {
  const reactFlow = useReactFlow();

  const filterMatch = useCallback(
    (node: HierarchyNode) => {
      if (search) {
        const q = search.toLowerCase();
        const haystack = [node.name, node.role, node.position, node.email]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (departmentId !== "all") {
        const deptName = departmentNameFromId(departmentOptions, departmentId);
        if (node.id !== departmentId && node.department !== deptName) return false;
      }
      if (scope === "mine" && myUserNodeId) {
        if (node.id !== myUserNodeId) return false;
      }
      return true;
    },
    [search, departmentId, scope, myUserNodeId, departmentOptions],
  );

  const baseGraph = useMemo(() => {
    if (!hierarchy) return { nodes: [] as Node<OrgFlowNodeData>[], edges: [] };
    const hasFilter = search.length > 0 || departmentId !== "all" || scope === "mine";
    return buildOrgGraph(hierarchy, hasFilter ? filterMatch : () => false);
  }, [hierarchy, search, departmentId, scope, filterMatch]);

  const [nodes, setNodes] = useState<Node<OrgFlowNodeData>[]>(baseGraph.nodes);
  useEffect(() => {
    setNodes(baseGraph.nodes);
  }, [baseGraph]);

  // When search/filter narrows results, zoom into the *direct* matches (not
  // ancestors/descendants which are also highlighted) so the user lands
  // exactly on what they typed.
  useEffect(() => {
    const hasFilter = search.length > 0 || departmentId !== "all" || scope === "mine";
    if (!hasFilter || baseGraph.nodes.length === 0) return;
    const directMatches = baseGraph.nodes.filter((n) => filterMatch(n.data));
    if (directMatches.length === 0) return;
    const id = window.setTimeout(() => {
      reactFlow.fitView({
        nodes: directMatches.map((n) => ({ id: n.id })),
        padding: 0.5,
        duration: 400,
        maxZoom: 1.2,
      });
    }, 80);
    return () => window.clearTimeout(id);
  }, [search, departmentId, scope, baseGraph.nodes, reactFlow, filterMatch]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => {
      const next = [...nds];
      for (const change of changes) {
        if (change.type === "position" && change.position) {
          const idx = next.findIndex((n) => n.id === change.id);
          if (idx >= 0) {
            next[idx] = { ...next[idx], position: change.position };
          }
        }
      }
      return next;
    });
  }, []);

  const handleNodeClick = useCallback(
    (_: unknown, node: Node<OrgFlowNodeData>) => {
      setSelected(node.data);
      trackEvent("orgchart_node_clicked", { type: node.data.type });
    },
    [setSelected],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={baseGraph.edges}
      nodeTypes={orgNodeTypes}
      onInit={(instance) => {
        flowInstanceRef.current = instance;
        instance.fitView({ padding: 0.35, duration: 300, maxZoom: 0.9 });
      }}
      onNodeClick={handleNodeClick}
      onNodesChange={onNodesChange}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable
      proOptions={{ hideAttribution: true }}
      minZoom={0.2}
      maxZoom={1.5}
      fitView
      fitViewOptions={{ padding: 0.35, maxZoom: 0.9 }}
    >
      <Background gap={24} size={1} />
      <Controls showInteractive={false} />
      <MiniMap
        pannable
        zoomable
        nodeColor={(n) => {
          const data = n.data as OrgFlowNodeData | undefined;
          if (!data) return "hsl(var(--muted))";
          if (data.isDimmed) return "hsl(var(--muted))";
          return data.color || "hsl(var(--primary))";
        }}
        maskColor="hsl(var(--muted) / 0.4)"
      />
    </ReactFlow>
  );
}

export function OrganizationChartFlow() {
  const { data: visualHierarchy, isLoading, error } = useOrganizationHierarchy();
  const { members, isLoading: managersLoading, setManager } = useManagers();
  const { user } = useAuth();
  const { isAdmin } = useUserPermissions();

  const canDrag = isAdmin && !managersLoading;

  // Default to "list" — much more legible for companies with many people
  // and works regardless of department/team configuration.
  const [mode, setMode] = useState<OrgMode>("list");
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("all");
  const [scope, setScope] = useState<"all" | "mine">("all");
  const [selected, setSelected] = useState<HierarchyNode | null>(null);
  const flowInstanceRef = useRef<ReactFlowInstance | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const managerHierarchy = useMemo(() => {
    if (!members || members.length === 0) return null;
    return buildManagerHierarchy(
      members.map((m) => ({
        user_id: m.user_id,
        manager_id: m.manager_id,
        position: m.position,
        department_name: m.department_name,
      })),
      members.map((m) => ({
        id: m.user_id,
        full_name: m.full_name,
        email: m.email,
        avatar_url: m.avatar_url,
      })),
    );
  }, [members]);

  const activeHierarchy: HierarchyNode | null = managerHierarchy ?? visualHierarchy ?? null;

  const departmentOptions = useMemo<DepartmentOption[]>(() => {
    if (!visualHierarchy) return [];
    return flattenHierarchy(visualHierarchy)
      .filter((n) => n.type === "department")
      .map((n) => ({ id: n.id, name: n.name }));
  }, [visualHierarchy]);

  const myUserNodeId = user ? `member-${user.id}` : null;

  const handleResetFilters = () => {
    setSearch("");
    setDepartmentId("all");
    setScope("all");
  };

  const handleExportPng = useCallback(async () => {
    if (!wrapperRef.current) return;
    try {
      const pane = wrapperRef.current.querySelector(".react-flow__viewport") as HTMLElement | null;
      const target = pane ?? wrapperRef.current;
      const dataUrl = await toPng(target, {
        backgroundColor: "white",
        pixelRatio: 2,
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = `organograma-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
      trackEvent("orgchart_exported", { format: "png", mode });
    } catch (err) {
      console.error("[orgchart] export failed", err);
    }
  }, [mode]);

  const showLoading = isLoading || managersLoading;

  if (showLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !activeHierarchy) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Network className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {error ? "Erro ao carregar organograma" : "Organograma vazio"}
          </h3>
          <p className="text-muted-foreground text-sm">
            {error
              ? "Não foi possível carregar a estrutura organizacional."
              : "Configure departamentos e equipes para visualizar o organograma."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasFilter = search.length > 0 || departmentId !== "all" || scope === "mine";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <Network className="h-5 w-5" />
            Organograma
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={mode} onValueChange={(v) => setMode(v as OrgMode)}>
              <SelectTrigger className="h-9 w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="list">Lista (árvore)</SelectItem>
                <SelectItem value="visual">Visual (organograma)</SelectItem>
              </SelectContent>
            </Select>
            {mode !== "list" && (
              <Button variant="outline" size="sm" onClick={handleExportPng} className="gap-1.5">
                <Download className="h-4 w-4" />
                PNG
              </Button>
            )}
          </div>
        </div>
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
          {mode === "visual" && (
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger className="h-9 w-44">
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os departamentos</SelectItem>
                {departmentOptions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {myUserNodeId && (
            <Select value={scope} onValueChange={(v) => setScope(v as "all" | "mine")}>
              <SelectTrigger className="h-9 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toda empresa</SelectItem>
                <SelectItem value="mine">Apenas eu</SelectItem>
              </SelectContent>
            </Select>
          )}
          {hasFilter && (
            <Button variant="ghost" size="sm" onClick={handleResetFilters} className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              Limpar
            </Button>
          )}
          {canDrag && mode === "list" && (
            <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
              <GripVertical className="h-3 w-3" />
              Arraste uma pessoa sobre outra para reorganizar
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {mode === "list" ? (
          <div className="max-h-[640px] overflow-auto rounded-md border bg-background">
            <OrgListView
              hierarchy={activeHierarchy}
              search={search}
              onSelectMember={setSelected}
              myUserNodeId={myUserNodeId}
              canDrag={canDrag}
              onReassignManager={setManager}
            />
          </div>
        ) : (
          <div ref={wrapperRef} className="h-[640px] w-full rounded-md border bg-background">
            <ReactFlowProvider>
              <FlowInner
                hierarchy={activeHierarchy}
                search={search}
                departmentId={departmentId}
                scope={scope}
                myUserNodeId={myUserNodeId}
                departmentOptions={departmentOptions}
                setSelected={setSelected}
                wrapperRef={wrapperRef}
                flowInstanceRef={flowInstanceRef}
              />
            </ReactFlowProvider>
          </div>
        )}
      </CardContent>
      <OrgMemberDrawer node={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </Card>
  );
}

function departmentNameFromId(options: DepartmentOption[], id: string): string | undefined {
  return options.find((o) => o.id === id)?.name;
}
