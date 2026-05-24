import dagre from "dagre";
import type { Node, Edge } from "reactflow";
import type { HierarchyNode } from "@/hooks/useOrganizationHierarchy";

const NODE_WIDTH = 220;
const NODE_HEIGHT = 88;
// Gaps tuned for hierarchies with many siblings (eg. 18+ direct reports under
// a single C-level). Larger horizontal/vertical separation prevents the
// "wall of cards" feel when zoomed out.
const HORIZONTAL_GAP = 40;
const VERTICAL_GAP = 80;

export type OrgFlowNodeData = HierarchyNode & {
  isHighlighted: boolean;
  isDimmed: boolean;
  isDropTarget?: boolean;
  isEditMode?: boolean;
};

/**
 * Layout via dagre — handles arbitrary tree shapes (deep, wide, or mixed)
 * far more reliably than the hand-rolled centroid algorithm we had before.
 *
 * - `rankdir: "TB"` = top→bottom (CEO at top, ICs at bottom).
 * - `nodesep` separates siblings; `ranksep` separates depth levels.
 * - `tight-tree` ranker keeps subtrees compact horizontally so there's no
 *   200% horizontal stretch when one C-level has 18 direct reports.
 */
function runDagreLayout(root: HierarchyNode): Map<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: "TB",
    nodesep: HORIZONTAL_GAP,
    ranksep: VERTICAL_GAP,
    ranker: "tight-tree",
    marginx: 20,
    marginy: 20,
  });
  g.setDefaultEdgeLabel(() => ({}));

  walk(root, (node, parent) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    if (parent) g.setEdge(parent.id, node.id);
  });

  dagre.layout(g);

  const positions = new Map<string, { x: number; y: number }>();
  g.nodes().forEach((id) => {
    const n = g.node(id);
    // dagre returns center positions; reactflow uses top-left, so subtract half size.
    positions.set(id, { x: n.x - NODE_WIDTH / 2, y: n.y - NODE_HEIGHT / 2 });
  });
  return positions;
}

export function buildOrgGraph(
  root: HierarchyNode,
  filterMatch: (node: HierarchyNode) => boolean = () => true
): { nodes: Node<OrgFlowNodeData>[]; edges: Edge[] } {
  const positions = runDagreLayout(root);
  const matchingIds = collectMatches(root, filterMatch);
  const hasFilter = matchingIds.size > 0 && matchingIds.size < countAll(root);

  const nodes: Node<OrgFlowNodeData>[] = [];
  const edges: Edge[] = [];

  walk(root, (node, parent) => {
    const pos = positions.get(node.id);
    if (!pos) return;
    const matched = matchingIds.has(node.id);
    nodes.push({
      id: node.id,
      type: nodeKind(node.type),
      position: pos,
      data: {
        ...node,
        isHighlighted: hasFilter && matched,
        isDimmed: hasFilter && !matched,
      },
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });

    if (parent) {
      edges.push({
        id: `${parent.id}-${node.id}`,
        source: parent.id,
        target: node.id,
        type: "smoothstep",
        style: hasFilter && !(matched || matchingIds.has(parent.id))
          ? { stroke: "hsl(var(--muted))", strokeOpacity: 0.4 }
          : { stroke: "hsl(var(--border))" },
      });
    }
  });

  return { nodes, edges };
}

function nodeKind(type: HierarchyNode["type"]): string {
  return type === "company" ? "orgRoot" : type === "department" ? "orgDept" : type === "team" ? "orgTeam" : "orgMember";
}

function walk(
  node: HierarchyNode,
  visit: (node: HierarchyNode, parent: HierarchyNode | null) => void,
  parent: HierarchyNode | null = null,
) {
  visit(node, parent);
  for (const child of node.children ?? []) walk(child, visit, node);
}

function countAll(node: HierarchyNode): number {
  let count = 1;
  for (const child of node.children ?? []) count += countAll(child);
  return count;
}

function collectMatches(
  root: HierarchyNode,
  predicate: (node: HierarchyNode) => boolean,
): Set<string> {
  const matches = new Set<string>();
  const ancestors: HierarchyNode[] = [];

  function visit(node: HierarchyNode) {
    ancestors.push(node);
    if (predicate(node)) {
      ancestors.forEach((a) => matches.add(a.id));
      collectAllDescendants(node, matches);
    }
    for (const child of node.children ?? []) visit(child);
    ancestors.pop();
  }

  visit(root);
  return matches;
}

function collectAllDescendants(node: HierarchyNode, into: Set<string>) {
  for (const child of node.children ?? []) {
    into.add(child.id);
    collectAllDescendants(child, into);
  }
}

export function flattenHierarchy(root: HierarchyNode): HierarchyNode[] {
  const out: HierarchyNode[] = [];
  walk(root, (n) => out.push(n));
  return out;
}

// ---------------------------------------------------------------------------
// Manager-based hierarchy builder (Story 2.6)
// ---------------------------------------------------------------------------

export interface ManagerMembershipInput {
  user_id: string;
  manager_id: string | null;
  position?: string | null;
  department_name?: string | null;
}

export interface ManagerUserInput {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url?: string | null;
}

/**
 * Builds a hierarchy tree from `company_memberships.manager_id`.
 *
 * - Returns null when there are no memberships at all.
 * - Members with `manager_id = null` (or pointing to a non-member) are roots.
 * - When there are multiple roots, a synthetic "company" root groups them.
 * - Cycles are broken: any user reachable through its own ancestor chain is
 *   not visited twice (defensive — DB trigger already prevents direct cycles).
 */
export function buildManagerHierarchy(
  memberships: ManagerMembershipInput[],
  users: ManagerUserInput[],
): HierarchyNode | null {
  if (!memberships || memberships.length === 0) return null;

  const userById = new Map<string, ManagerUserInput>();
  users.forEach((u) => userById.set(u.id, u));

  const membershipByUserId = new Map<string, ManagerMembershipInput>();
  memberships.forEach((m) => membershipByUserId.set(m.user_id, m));

  const childrenByManager = new Map<string, ManagerMembershipInput[]>();
  const roots: ManagerMembershipInput[] = [];

  for (const m of memberships) {
    if (m.manager_id && membershipByUserId.has(m.manager_id)) {
      if (!childrenByManager.has(m.manager_id)) childrenByManager.set(m.manager_id, []);
      childrenByManager.get(m.manager_id)!.push(m);
    } else {
      roots.push(m);
    }
  }

  const buildNode = (
    membership: ManagerMembershipInput,
    visited: Set<string>,
  ): HierarchyNode => {
    const user = userById.get(membership.user_id);
    const name = user?.full_name || user?.email || "Sem nome";

    const childMemberships = childrenByManager.get(membership.user_id) ?? [];
    const nextVisited = new Set(visited);
    nextVisited.add(membership.user_id);

    const children: HierarchyNode[] = childMemberships
      .filter((c) => !nextVisited.has(c.user_id))
      .map((c) => buildNode(c, nextVisited));

    return {
      id: `member-${membership.user_id}`,
      type: "member",
      name,
      role: membership.position || "Membro",
      position: membership.position || "",
      department: membership.department_name || undefined,
      avatarUrl: user?.avatar_url || undefined,
      email: user?.email,
      children,
    };
  };

  if (roots.length === 1) {
    return buildNode(roots[0], new Set());
  }

  const rootNodes = roots.map((r) => buildNode(r, new Set()));
  return {
    id: "manager-root",
    type: "company",
    name: "Organização",
    role: "Hierarquia por gestor",
    position: "",
    children: rootNodes,
  };
}
