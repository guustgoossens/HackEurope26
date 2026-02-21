import { query } from './_generated/server';
import { v } from 'convex/values';

export const getKnowledgeGraph = query({
  args: { orgId: v.id('organizations') },
  handler: async (ctx, args) => {
    const nodes = await ctx.db
      .query('knowledgeBaseNodes')
      .withIndex('by_orgId', (q) => q.eq('orgId', args.orgId))
      .collect();

    // Get all links for this organization
    const links = await ctx.db
      .query('knowledgeBaseLinks')
      .withIndex('by_orgId', (q) => q.eq('orgId', args.orgId))
      .collect();

    // Transform to react-force-graph format
    return {
      nodes: nodes.map((node) => ({
        id: node._id,
        name: node.name,
        depth: node.depth,
        status: node.status,
        readme: node.readme,
        parentId: node.parentId,
        orderIndex: node.orderIndex,
      })),
      links: links.map((link) => ({
        source: link.sourceNodeId,
        target: link.targetNodeId,
        relationship: link.relationship,
      })),
    };
  },
});

// Query to get detailed info about a specific node
export const getNodeDetails = query({
  args: { nodeId: v.id('knowledgeBaseNodes') },
  handler: async (ctx, args) => {
    const node = await ctx.db.get(args.nodeId);
    if (!node) return null;

    // Get related data items
    const nodeDataItems = await ctx.db
      .query('nodeDataItems')
      .withIndex('by_nodeId', (q) => q.eq('nodeId', args.nodeId))
      .collect();

    const dataItemIds = nodeDataItems.map((ndi) => ndi.dataItemId);
    const dataItems = await Promise.all(dataItemIds.map((id) => ctx.db.get(id)));

    // Get outgoing links
    const outgoingLinks = await ctx.db
      .query('knowledgeBaseLinks')
      .withIndex('by_sourceNodeId', (q) => q.eq('sourceNodeId', args.nodeId))
      .collect();

    // Get incoming links
    const incomingLinks = await ctx.db
      .query('knowledgeBaseLinks')
      .withIndex('by_targetNodeId', (q) => q.eq('targetNodeId', args.nodeId))
      .collect();

    return {
      node,
      dataItems: dataItems.filter((item) => item !== null),
      outgoingLinks,
      incomingLinks,
    };
  },
});
