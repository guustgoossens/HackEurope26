import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

const kbNodeDoc = v.object({
  _id: v.id("knowledgeBaseNodes"),
  _creationTime: v.number(),
  orgId: v.id("organizations"),
  parentId: v.optional(v.id("knowledgeBaseNodes")),
  name: v.string(),
  depth: v.number(),
  orderIndex: v.number(),
  readme: v.optional(v.string()),
  status: v.union(
    v.literal("draft"),
    v.literal("verified"),
    v.literal("archived"),
  ),
});

/**
 * Get the root-level KB nodes for an organization.
 */
export const listRoots = query({
  args: { orgId: v.id("organizations") },
  returns: v.array(kbNodeDoc),
  handler: async (ctx, args) => {
    // Root nodes have no parentId — query all org nodes and filter for roots.
    // We use the orgId+parentId index; roots have parentId === undefined.
    const allNodes = await ctx.db
      .query("knowledgeBaseNodes")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .collect();
    return allNodes.filter((n) => n.parentId === undefined);
  },
});

/**
 * Get children of a specific KB node.
 */
export const listChildren = query({
  args: {
    orgId: v.id("organizations"),
    parentId: v.id("knowledgeBaseNodes"),
  },
  returns: v.array(kbNodeDoc),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("knowledgeBaseNodes")
      .withIndex("by_orgId_and_parentId", (q) =>
        q.eq("orgId", args.orgId).eq("parentId", args.parentId),
      )
      .collect();
  },
});

/**
 * Get a single KB node by ID.
 */
export const get = query({
  args: { nodeId: v.id("knowledgeBaseNodes") },
  returns: v.union(kbNodeDoc, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.nodeId);
  },
});

/**
 * Create a KB node (used by the structuring agent).
 */
export const createNode = internalMutation({
  args: {
    orgId: v.id("organizations"),
    parentId: v.optional(v.id("knowledgeBaseNodes")),
    name: v.string(),
    depth: v.number(),
    orderIndex: v.number(),
    readme: v.optional(v.string()),
  },
  returns: v.id("knowledgeBaseNodes"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("knowledgeBaseNodes", {
      ...args,
      status: "draft",
    });
  },
});

/**
 * Update a KB node's README or status.
 */
export const updateNode = mutation({
  args: {
    nodeId: v.id("knowledgeBaseNodes"),
    name: v.optional(v.string()),
    readme: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("verified"),
        v.literal("archived"),
      ),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { nodeId, ...fields } = args;
    const existing = await ctx.db.get(nodeId);
    if (!existing) {
      throw new Error("KB node not found");
    }
    const patch: Record<string, unknown> = {};
    if (fields.name !== undefined) patch.name = fields.name;
    if (fields.readme !== undefined) patch.readme = fields.readme;
    if (fields.status !== undefined) patch.status = fields.status;
    await ctx.db.patch(nodeId, patch);
    return null;
  },
});

/**
 * Link a data item to a KB node (junction table).
 */
export const linkDataItem = internalMutation({
  args: {
    nodeId: v.id("knowledgeBaseNodes"),
    dataItemId: v.id("dataItems"),
    relevanceScore: v.optional(v.number()),
  },
  returns: v.id("nodeDataItems"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("nodeDataItems", {
      nodeId: args.nodeId,
      dataItemId: args.dataItemId,
      relevanceScore: args.relevanceScore,
    });
  },
});

/**
 * Get all data items linked to a KB node.
 */
export const getLinkedItems = query({
  args: { nodeId: v.id("knowledgeBaseNodes") },
  returns: v.array(
    v.object({
      _id: v.id("nodeDataItems"),
      _creationTime: v.number(),
      nodeId: v.id("knowledgeBaseNodes"),
      dataItemId: v.id("dataItems"),
      relevanceScore: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("nodeDataItems")
      .withIndex("by_nodeId", (q) => q.eq("nodeId", args.nodeId))
      .collect();
  },
});

/**
 * Create a cross-reference link between two KB nodes.
 */
export const createLink = internalMutation({
  args: {
    orgId: v.id("organizations"),
    sourceNodeId: v.id("knowledgeBaseNodes"),
    targetNodeId: v.id("knowledgeBaseNodes"),
    relationship: v.union(
      v.literal("depends_on"),
      v.literal("related_to"),
      v.literal("see_also"),
      v.literal("parent_of"),
    ),
  },
  returns: v.id("knowledgeBaseLinks"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("knowledgeBaseLinks", args);
  },
});

/**
 * Get all outgoing links from a KB node.
 */
export const getLinks = query({
  args: { nodeId: v.id("knowledgeBaseNodes") },
  returns: v.array(
    v.object({
      _id: v.id("knowledgeBaseLinks"),
      _creationTime: v.number(),
      orgId: v.id("organizations"),
      sourceNodeId: v.id("knowledgeBaseNodes"),
      targetNodeId: v.id("knowledgeBaseNodes"),
      relationship: v.union(
        v.literal("depends_on"),
        v.literal("related_to"),
        v.literal("see_also"),
        v.literal("parent_of"),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("knowledgeBaseLinks")
      .withIndex("by_sourceNodeId", (q) => q.eq("sourceNodeId", args.nodeId))
      .collect();
  },
});
