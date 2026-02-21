import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const dataSourceDoc = v.object({
  _id: v.id("dataSources"),
  _creationTime: v.number(),
  orgId: v.id("organizations"),
  provider: v.union(
    v.literal("google_drive"),
    v.literal("gmail"),
    v.literal("onedrive"),
    v.literal("outlook"),
    v.literal("sharepoint"),
    v.literal("dropbox"),
    v.literal("other"),
  ),
  label: v.string(),
  connectionStatus: v.union(
    v.literal("pending"),
    v.literal("connected"),
    v.literal("error"),
    v.literal("disconnected"),
  ),
  lastSyncedAt: v.optional(v.number()),
  config: v.optional(v.string()),
  errorMessage: v.optional(v.string()),
});

/**
 * List all data sources for an organization.
 */
export const listByOrg = query({
  args: { orgId: v.id("organizations") },
  returns: v.array(dataSourceDoc),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dataSources")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .collect();
  },
});

/**
 * Add a new data source connection to an organization.
 */
export const create = mutation({
  args: {
    orgId: v.id("organizations"),
    provider: v.union(
      v.literal("google_drive"),
      v.literal("gmail"),
      v.literal("onedrive"),
      v.literal("outlook"),
      v.literal("sharepoint"),
      v.literal("dropbox"),
      v.literal("other"),
    ),
    label: v.string(),
    config: v.optional(v.string()),
  },
  returns: v.id("dataSources"),
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId);
    if (!org) {
      throw new Error("Organization not found");
    }
    return await ctx.db.insert("dataSources", {
      orgId: args.orgId,
      provider: args.provider,
      label: args.label,
      connectionStatus: "pending",
      config: args.config,
    });
  },
});

/**
 * Update a data source's connection status or config.
 */
export const updateStatus = mutation({
  args: {
    dataSourceId: v.id("dataSources"),
    connectionStatus: v.union(
      v.literal("pending"),
      v.literal("connected"),
      v.literal("error"),
      v.literal("disconnected"),
    ),
    errorMessage: v.optional(v.string()),
    lastSyncedAt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.dataSourceId);
    if (!existing) {
      throw new Error("Data source not found");
    }
    const patch: Record<string, unknown> = {
      connectionStatus: args.connectionStatus,
    };
    if (args.errorMessage !== undefined) patch.errorMessage = args.errorMessage;
    if (args.lastSyncedAt !== undefined) patch.lastSyncedAt = args.lastSyncedAt;
    await ctx.db.patch(args.dataSourceId, patch);
    return null;
  },
});

/**
 * Remove a data source and all its data items.
 */
export const remove = mutation({
  args: { dataSourceId: v.id("dataSources") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Delete all data items associated with this source
    const items = await ctx.db
      .query("dataItems")
      .withIndex("by_dataSourceId", (q) =>
        q.eq("dataSourceId", args.dataSourceId),
      )
      .collect();
    for (const item of items) {
      await ctx.db.delete(item._id);
    }
    await ctx.db.delete(args.dataSourceId);
    return null;
  },
});
