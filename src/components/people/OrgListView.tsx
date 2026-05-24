import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Building2, Users, Network, GripVertical } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { HierarchyNode } from "@/hooks/useOrganizationHierarchy";

interface OrgListViewProps {
  hierarchy: HierarchyNode | null;
  search: string;
  onSelectMember: (node: HierarchyNode) => void;
  myUserNodeId: string | null;
  canDrag?: boolean;
  onReassignManager?: (userId: string, managerId: string) => Promise<unknown>;
}

interface DragState {
  draggingId: string | null;
  dropTargetId: string | null;
  canDrag: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOver: (id: string) => void;
  onDrop: (targetId: string) => void;
}

const DragCtx = createContext<DragState>({
  draggingId: null,
  dropTargetId: null,
  canDrag: false,
  onDragStart: () => {},
  onDragEnd: () => {},
  onDragOver: () => {},
  onDrop: () => {},
});

function getInitials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function countMembers(node: HierarchyNode): number {
  let count = node.type === "member" ? 1 : 0;
  for (const c of node.children ?? []) count += countMembers(c);
  return count;
}

function nodeMatches(node: HierarchyNode, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const haystack = [node.name, node.role, node.position, node.email, node.department]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (haystack.includes(q)) return true;
  return (node.children ?? []).some((c) => nodeMatches(c, q));
}

function NodeIcon({ type }: { type: HierarchyNode["type"] }) {
  if (type === "company") return <Network className="h-4 w-4 text-primary shrink-0" />;
  if (type === "department") return <Building2 className="h-4 w-4 text-primary shrink-0" />;
  if (type === "team") return <Users className="h-4 w-4 text-muted-foreground shrink-0" />;
  return null;
}

function TreeRow({
  node,
  depth,
  search,
  onSelectMember,
  defaultExpanded,
  myUserNodeId,
}: {
  node: HierarchyNode;
  depth: number;
  search: string;
  onSelectMember: (node: HierarchyNode) => void;
  defaultExpanded: boolean;
  myUserNodeId: string | null;
}) {
  const [open, setOpen] = useState(defaultExpanded);
  const drag = useContext(DragCtx);

  const hasChildren = (node.children?.length ?? 0) > 0;
  const memberCount = node.type === "member" ? 0 : countMembers(node);
  const isMember = node.type === "member";
  const isMe = node.id === myUserNodeId;

  const isDragging = drag.draggingId === node.id;
  const isDropTarget = drag.dropTargetId === node.id && drag.draggingId !== node.id;
  const draggable = drag.canDrag && isMember;

  const matchesQuery = search ? nodeMatches(node, search) : true;
  if (!matchesQuery) return null;

  const effectiveOpen = search ? true : open;

  return (
    <>
      <div
        className={cn(
          "group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
          isMember && "cursor-pointer",
          !isDragging && !isDropTarget && "hover:bg-muted/60",
          isMe && "bg-primary/5 ring-1 ring-primary/20",
          isDragging && "opacity-40",
          isDropTarget &&
            "bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-500 ring-inset",
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        draggable={draggable}
        onDragStart={
          draggable
            ? (e) => {
                e.dataTransfer.effectAllowed = "move";
                drag.onDragStart(node.id);
              }
            : undefined
        }
        onDragOver={
          draggable
            ? (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (drag.draggingId && drag.draggingId !== node.id) {
                  drag.onDragOver(node.id);
                }
              }
            : undefined
        }
        onDrop={
          draggable
            ? (e) => {
                e.preventDefault();
                drag.onDrop(node.id);
              }
            : undefined
        }
        onDragEnd={draggable ? () => drag.onDragEnd() : undefined}
        onClick={() => {
          if (isMember) onSelectMember(node);
          else setOpen((v) => !v);
        }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="h-5 w-5 inline-flex items-center justify-center rounded hover:bg-muted shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
            aria-label={effectiveOpen ? "Recolher" : "Expandir"}
          >
            {effectiveOpen ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="h-5 w-5 inline-block shrink-0" />
        )}

        {draggable && (
          <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
        )}

        {isMember ? (
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarImage src={node.avatarUrl} alt={node.name} />
            <AvatarFallback className="text-[10px] bg-muted">
              {getInitials(node.name)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <NodeIcon type={node.type} />
        )}

        <div className="min-w-0 flex-1 flex items-center gap-2">
          <p
            className={cn(
              "truncate text-sm",
              !isMember && "font-semibold",
              isMember && "font-medium",
            )}
          >
            {node.name}
            {isMe && (
              <span className="ml-2 text-[10px] text-primary font-semibold">VOCÊ</span>
            )}
          </p>
          {(node.position || (node.role && node.role !== node.name)) && (
            <p className="truncate text-xs text-muted-foreground hidden sm:block">
              {node.position || node.role}
            </p>
          )}
        </div>

        {!isMember && memberCount > 0 && (
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 shrink-0">
            {memberCount}
          </Badge>
        )}
      </div>

      {hasChildren && effectiveOpen && (
        <>
          {node.children!.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              search={search}
              onSelectMember={onSelectMember}
              defaultExpanded={defaultExpanded && depth < 2}
              myUserNodeId={myUserNodeId}
            />
          ))}
        </>
      )}
    </>
  );
}

export function OrgListView({
  hierarchy,
  search,
  onSelectMember,
  myUserNodeId,
  canDrag = false,
  onReassignManager,
}: OrgListViewProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const totalPeople = useMemo(
    () => (hierarchy ? countMembers(hierarchy) : 0),
    [hierarchy],
  );

  const handleDrop = useCallback(
    (targetId: string) => {
      if (!draggingId || draggingId === targetId) return;
      const sourceUserId = draggingId.startsWith("member-") ? draggingId.slice(7) : null;
      const targetUserId = targetId.startsWith("member-") ? targetId.slice(7) : null;
      if (!sourceUserId || !targetUserId) return;
      onReassignManager?.(sourceUserId, targetUserId);
    },
    [draggingId, onReassignManager],
  );

  const dragCtx = useMemo<DragState>(
    () => ({
      draggingId,
      dropTargetId,
      canDrag,
      onDragStart: setDraggingId,
      onDragEnd: () => {
        setDraggingId(null);
        setDropTargetId(null);
      },
      onDragOver: setDropTargetId,
      onDrop: (targetId) => {
        handleDrop(targetId);
        setDraggingId(null);
        setDropTargetId(null);
      },
    }),
    [draggingId, dropTargetId, canDrag, handleDrop],
  );

  if (!hierarchy) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        Sem dados para exibir.
      </div>
    );
  }

  return (
    <DragCtx.Provider value={dragCtx}>
      <div className="space-y-0.5 py-1">
        <div className="px-2 pb-2 text-xs text-muted-foreground">
          {totalPeople} {totalPeople === 1 ? "pessoa" : "pessoas"}
          {search ? ` • filtrando "${search}"` : ""}
        </div>
        <TreeRow
          node={hierarchy}
          depth={0}
          search={search}
          onSelectMember={onSelectMember}
          defaultExpanded={true}
          myUserNodeId={myUserNodeId}
        />
      </div>
    </DragCtx.Provider>
  );
}
