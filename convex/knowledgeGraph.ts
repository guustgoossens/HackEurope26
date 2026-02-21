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

/**
 * Get DATA LANDSCAPE graph — shows discovered files/emails as nodes
 * This is for the "EXPLORE" phase visualization
 * Nodes = dataItems (individual files, emails, spreadsheets)
 * Links = minimal (files in same folder path have weak links)
 */
export const getDataLandscape = query({
  args: { orgId: v.id('organizations') },
  handler: async (ctx, args) => {
    const dataItems = await ctx.db
      .query('dataItems')
      .withIndex('by_orgId', (q) => q.eq('orgId', args.orgId))
      .collect();

    // Group by path to create weak cluster links
    const pathGroups = new Map<string, typeof dataItems>();
    for (const item of dataItems) {
      const path = item.path || '/';
      if (!pathGroups.has(path)) pathGroups.set(path, []);
      pathGroups.get(path)!.push(item);
    }

    // Create weak links for files in same folder
    const links: Array<{ source: string; target: string; relationship: string }> = [];
    for (const items of pathGroups.values()) {
      // Connect first 3 items in each folder to show clusters
      for (let i = 0; i < Math.min(items.length, 3); i++) {
        for (let j = i + 1; j < Math.min(items.length, 3); j++) {
          links.push({
            source: items[i]._id,
            target: items[j]._id,
            relationship: 'same_folder',
          });
        }
      }
    }

    return {
      nodes: dataItems.map((item) => ({
        id: item._id,
        name: item.name,
        fileType: item.fileType,
        path: item.path,
        processingStatus: item.processingStatus,
        dataSourceId: item.dataSourceId,
      })),
      links,
    };
  },
});
