import { query } from './_generated/server';
import { v } from 'convex/values';

// ── Shared node/link validators ───────────────────────────────────────────────

const graphNodeValidator = v.object({
  id: v.string(),
  name: v.string(),
  type: v.string(),
  depth: v.number(),
  readme: v.optional(v.string()),
  parentId: v.optional(v.string()),
  order: v.optional(v.number()),
  status: v.optional(v.string()),
  fileType: v.optional(v.string()),
  processingStatus: v.optional(v.string()),
});

const graphLinkValidator = v.object({
  source: v.string(),
  target: v.string(),
  relationship: v.string(),
});

const graphDataValidator = v.object({
  nodes: v.array(graphNodeValidator),
  links: v.array(graphLinkValidator),
});

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Get knowledge tree visualization for a client.
 * Adapts the knowledge_tree table to a force-directed graph format.
 * Nodes are typed by domain/skill/entry_group and linked via parentId.
 */
export const getKnowledgeTree = query({
  args: { clientId: v.id('clients') },
  returns: graphDataValidator,
  handler: async (ctx, args) => {
    const nodes = await ctx.db
      .query('knowledge_tree')
      .withIndex('by_clientId', (q) => q.eq('clientId', args.clientId))
      .collect();

    // Transform to react-force-graph format
    const graphNodes = nodes.map((node) => ({
      id: node._id as string,
      name: node.name,
      type: node.type,
      readme: node.readme,
      parentId: node.parentId as string | undefined,
      order: node.order,
      depth: 0, // calculated below
    }));

    // Calculate depth by walking up the parent chain
    const nodeMap = new Map(graphNodes.map((n) => [n.id, n]));
    for (const node of graphNodes) {
      let depth = 0;
      let current = node;
      while (current.parentId) {
        const parent = nodeMap.get(current.parentId);
        if (!parent) break;
        depth++;
        current = parent;
      }
      node.depth = depth;
    }

    // Links from parentId (hierarchy)
    const links: Array<{ source: string; target: string; relationship: string }> = graphNodes
      .filter((node) => node.parentId)
      .map((node) => ({
        source: node.parentId!,
        target: node.id,
        relationship: 'parent_of',
      }));

    // Cross-links from knowledge_entries that share a sourceRef with another entry
    // This surfaces files that are referenced from multiple parts of the tree
    const entries = await ctx.db
      .query('knowledge_entries')
      .withIndex('by_clientId', (q) => q.eq('clientId', args.clientId))
      .collect();

    // Group entries by sourceRef — if same file appears under >1 node, draw a relates_to edge
    const refToNodes = new Map<string, string[]>();
    for (const entry of entries) {
      if (!entry.sourceRef) continue;
      const existing = refToNodes.get(entry.sourceRef) ?? [];
      existing.push(entry.treeNodeId as string);
      refToNodes.set(entry.sourceRef, existing);
    }
    for (const [, nodeIds] of refToNodes) {
      // Connect each pair of nodes that share this file
      for (let i = 0; i < nodeIds.length - 1; i++) {
        for (let j = i + 1; j < nodeIds.length; j++) {
          links.push({ source: nodeIds[i], target: nodeIds[j], relationship: 'relates_to' });
        }
      }
    }

    return { nodes: graphNodes, links };
  },
});

/**
 * Get detailed info about a single knowledge tree node.
 * Returns the node, its direct children, and its knowledge entries.
 */
export const getTreeNodeDetails = query({
  args: { nodeId: v.id('knowledge_tree') },
  returns: v.union(
    v.null(),
    v.object({
      node: v.object({
        _id: v.id('knowledge_tree'),
        _creationTime: v.number(),
        clientId: v.id('clients'),
        parentId: v.optional(v.id('knowledge_tree')),
        name: v.string(),
        type: v.union(v.literal('domain'), v.literal('skill'), v.literal('entry_group')),
        readme: v.optional(v.string()),
        order: v.number(),
      }),
      children: v.array(v.object({
        _id: v.id('knowledge_tree'),
        _creationTime: v.number(),
        clientId: v.id('clients'),
        parentId: v.optional(v.id('knowledge_tree')),
        name: v.string(),
        type: v.union(v.literal('domain'), v.literal('skill'), v.literal('entry_group')),
        readme: v.optional(v.string()),
        order: v.number(),
      })),
      entries: v.array(v.object({
        _id: v.id('knowledge_entries'),
        _creationTime: v.number(),
        clientId: v.id('clients'),
        treeNodeId: v.id('knowledge_tree'),
        title: v.string(),
        content: v.string(),
        sourceRef: v.optional(v.string()),
        confidence: v.number(),
        verified: v.boolean(),
      })),
    }),
  ),
  handler: async (ctx, args) => {
    const node = await ctx.db.get(args.nodeId);
    if (!node) return null;

    const children = await ctx.db
      .query('knowledge_tree')
      .withIndex('by_clientId_and_parentId', (q) =>
        q.eq('clientId', node.clientId).eq('parentId', args.nodeId),
      )
      .collect();

    const entries = await ctx.db
      .query('knowledge_entries')
      .withIndex('by_treeNodeId', (q) => q.eq('treeNodeId', args.nodeId))
      .collect();

    return { node, children, entries };
  },
});

/**
 * Get data sources as a graph — the exploration view.
 * Each data source is a node; completed explorations add edges.
 */
export const getExplorationGraph = query({
  args: { clientId: v.id('clients') },
  returns: graphDataValidator,
  handler: async (ctx, args) => {
    const dataSources = await ctx.db
      .query('data_sources')
      .withIndex('by_clientId', (q) => q.eq('clientId', args.clientId))
      .collect();

    const explorations = await ctx.db
      .query('explorations')
      .withIndex('by_clientId', (q) => q.eq('clientId', args.clientId))
      .collect();

    const nodes = dataSources.map((source) => ({
      id: source._id as string,
      name: source.label,
      type: source.type,
      status: source.connectionStatus,
      fileType: source.type,
      depth: 0,
    }));

    // Only show links for completed explorations
    const links = explorations
      .filter((exp) => exp.status === 'completed')
      .map((exp) => ({
        source: exp.dataSourceId as string,
        target: exp.dataSourceId as string,
        relationship: 'explored',
      }));

    return { nodes, links };
  },
});

/**
 * Get contradictions overlaid on the full knowledge tree.
 *
 * Returns the complete folder/file hierarchy (blue parent_of + green relates_to edges)
 * PLUS red "contradicts" edges between files that conflict with each other.
 * This shows WHERE in the messy folder structure the conflicts actually live.
 */
export const getContradictionsGraph = query({
  args: { clientId: v.id('clients') },
  returns: graphDataValidator,
  handler: async (ctx, args) => {
    // ── 1. Full knowledge tree ─────────────────────────────────────
    const treeNodes = await ctx.db
      .query('knowledge_tree')
      .withIndex('by_clientId', (q) => q.eq('clientId', args.clientId))
      .collect();

    const graphNodes = treeNodes.map((node) => ({
      id: node._id as string,
      name: node.name,
      type: node.type,
      readme: node.readme,
      parentId: node.parentId as string | undefined,
      order: node.order,
      depth: 0,
    }));

    // Calculate depth by walking up parent chain
    const nodeMap = new Map(graphNodes.map((n) => [n.id, n]));
    for (const node of graphNodes) {
      let depth = 0;
      let current = node;
      while (current.parentId) {
        const parent = nodeMap.get(current.parentId);
        if (!parent) break;
        depth++;
        current = parent;
      }
      node.depth = depth;
    }

    // ── 2. Hierarchy links (blue) ──────────────────────────────────
    const links: Array<{ source: string; target: string; relationship: string }> = graphNodes
      .filter((n) => n.parentId)
      .map((n) => ({ source: n.parentId!, target: n.id, relationship: 'parent_of' }));

    // ── 3. Cross-reference links (green) ──────────────────────────
    const entries = await ctx.db
      .query('knowledge_entries')
      .withIndex('by_clientId', (q) => q.eq('clientId', args.clientId))
      .collect();

    const refToNodes = new Map<string, string[]>();
    for (const entry of entries) {
      if (!entry.sourceRef) continue;
      const existing = refToNodes.get(entry.sourceRef) ?? [];
      existing.push(entry.treeNodeId as string);
      refToNodes.set(entry.sourceRef, existing);
    }
    for (const [, nodeIds] of refToNodes) {
      for (let i = 0; i < nodeIds.length - 1; i++) {
        for (let j = i + 1; j < nodeIds.length; j++) {
          links.push({ source: nodeIds[i], target: nodeIds[j], relationship: 'relates_to' });
        }
      }
    }

    // ── 4. Contradiction links (red) — match by filename ──────────
    // Match contradiction sourceA/sourceB filenames to entry_group node names,
    // then draw red edges between those nodes in the tree.
    const contradictions = await ctx.db
      .query('contradictions')
      .withIndex('by_clientId_and_status', (q) =>
        q.eq('clientId', args.clientId).eq('status', 'open'),
      )
      .collect();

    const nameToId = new Map<string, string>();
    for (const node of graphNodes) {
      if (node.type === 'entry_group') {
        nameToId.set(node.name, node.id);
      }
    }

    for (const c of contradictions) {
      const idA = nameToId.get(c.sourceA);
      const idB = nameToId.get(c.sourceB);
      if (idA && idB) {
        links.push({ source: idA, target: idB, relationship: 'contradicts' });
      }
    }

    return { nodes: graphNodes, links };
  },
});
