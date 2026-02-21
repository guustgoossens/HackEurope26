import { query } from './_generated/server';
import { v } from 'convex/values';

/**
 * Get knowledge tree visualization for a client
 * Adapts the knowledge_tree table to a force-directed graph format
 */
export const getKnowledgeTree = query({
  args: { clientId: v.id('clients') },
  handler: async (ctx, args) => {
    const nodes = await ctx.db
      .query('knowledge_tree')
      .withIndex('by_clientId', (q) => q.eq('clientId', args.clientId))
      .collect();

    // Transform to react-force-graph format
    const graphNodes = nodes.map((node) => ({
      id: node._id,
      name: node.name,
      type: node.type,
      readme: node.readme,
      parentId: node.parentId,
      order: node.order,
      // Calculate depth based on parent chain
      depth: 0, // Will be calculated below
    }));

    // Calculate depths
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

    // Create links from parent relationships
    const links = graphNodes
      .filter((node) => node.parentId)
      .map((node) => ({
        source: node.parentId!,
        target: node.id,
        relationship: 'parent_of' as const,
      }));

    return { nodes: graphNodes, links };
  },
});

/**
 * Get detailed info about a knowledge tree node
 */
export const getTreeNodeDetails = query({
  args: { nodeId: v.id('knowledge_tree') },
  handler: async (ctx, args) => {
    const node = await ctx.db.get(args.nodeId);
    if (!node) return null;

    // Get child nodes
    const children = await ctx.db
      .query('knowledge_tree')
      .withIndex('by_clientId_and_parentId', (q) =>
        q.eq('clientId', node.clientId).eq('parentId', args.nodeId)
      )
      .collect();

    // Get knowledge entries for this node
    const entries = await ctx.db
      .query('knowledge_entries')
      .withIndex('by_treeNodeId', (q) => q.eq('treeNodeId', args.nodeId))
      .collect();

    return {
      node,
      children,
      entries,
    };
  },
});

/**
 * Get exploration metrics as a graph visualization
 * Shows data sources and exploration status
 */
export const getExplorationGraph = query({
  args: { clientId: v.id('clients') },
  handler: async (ctx, args) => {
    const dataSources = await ctx.db
      .query('data_sources')
      .withIndex('by_clientId', (q) => q.eq('clientId', args.clientId))
      .collect();

    const explorations = await ctx.db
      .query('explorations')
      .withIndex('by_clientId', (q) => q.eq('clientId', args.clientId))
      .collect();

    // Create nodes for data sources
    const nodes = dataSources.map((source) => ({
      id: source._id,
      name: source.label,
      type: source.type,
      status: source.connectionStatus,
      fileType: source.type, // Map to file type for icon rendering
    }));

    // Create links based on explorations
    const links = explorations
      .filter((exp) => exp.status === 'completed')
      .map((exp) => ({
        source: exp.dataSourceId,
        target: exp.dataSourceId, // Self-link to show completion
        relationship: 'explored' as const,
      }));

    return { nodes, links };
  },
});

/**
 * Get contradictions as a graph
 * Shows contradicting data points as connected nodes
 */
export const getContradictionsGraph = query({
  args: { clientId: v.id('clients') },
  handler: async (ctx, args) => {
    const contradictions = await ctx.db
      .query('contradictions')
      .withIndex('by_clientId_and_status', (q) =>
        q.eq('clientId', args.clientId).eq('status', 'open')
      )
      .collect();

    // Create nodes for each unique source
    const sourceSet = new Set<string>();
    contradictions.forEach((c) => {
      sourceSet.add(c.sourceA);
      sourceSet.add(c.sourceB);
    });

    const nodes = Array.from(sourceSet).map((source, idx) => ({
      id: `source_${idx}`,
      name: source,
      type: 'source' as const,
      fileType: 'other' as const,
      processingStatus: 'discovered' as const,
    }));

    // Create links for contradictions
    const sourceToId = new Map(Array.from(sourceSet).map((s, idx) => [s, `source_${idx}`]));
    const links = contradictions.map((c) => ({
      source: sourceToId.get(c.sourceA)!,
      target: sourceToId.get(c.sourceB)!,
      relationship: 'contradicts' as const,
    }));

    return { nodes, links };
  },
});
