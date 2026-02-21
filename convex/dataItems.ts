import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

const dataItemDoc = v.object({
  _id: v.id("dataItems"),
  _creationTime: v.number(),
  orgId: v.id("organizations"),
  dataSourceId: v.id("dataSources"),
  name: v.string(),
  fileType: v.union(
    v.literal("pdf"),
    v.literal("spreadsheet"),
    v.literal("document"),
    v.literal("email"),
    v.literal("image"),
    v.literal("presentation"),
    v.literal("other"),
  ),
  path: v.optional(v.string()),
  mimeType: v.optional(v.string()),
  sizeBytes: v.optional(v.number()),
  previewSnippet: v.optional(v.string()),
  externalId: v.optional(v.string()),
  externalUrl: v.optional(v.string()),
  metadata: v.optional(v.string()),
  processingStatus: v.union(
    v.literal("discovered"),
    v.literal("processing"),
    v.literal("processed"),
    v.literal("error"),
  ),
  storageId: v.optional(v.id("_storage")),
});

/**
 * List data items for an organization, optionally filtered by processing status.
 */
export const listByOrg = query({
  args: {
    orgId: v.id("organizations"),
    status: v.optional(
      v.union(
        v.literal("discovered"),
        v.literal("processing"),
        v.literal("processed"),
        v.literal("error"),
      ),
    ),
  },
  returns: v.array(dataItemDoc),
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("dataItems")
        .withIndex("by_orgId_and_processingStatus", (q) =>
          q.eq("orgId", args.orgId).eq("processingStatus", args.status!),
        )
        .collect();
    }
    return await ctx.db
      .query("dataItems")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .collect();
  },
});

/**
 * List data items for a specific data source.
 */
export const listBySource = query({
  args: { dataSourceId: v.id("dataSources") },
  returns: v.array(dataItemDoc),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dataItems")
      .withIndex("by_dataSourceId", (q) =>
        q.eq("dataSourceId", args.dataSourceId),
      )
      .collect();
  },
});

/**
 * Insert a newly discovered data item (called by agents during exploration).
 */
export const create = internalMutation({
  args: {
    orgId: v.id("organizations"),
    dataSourceId: v.id("dataSources"),
    name: v.string(),
    fileType: v.union(
      v.literal("pdf"),
      v.literal("spreadsheet"),
      v.literal("document"),
      v.literal("email"),
      v.literal("image"),
      v.literal("presentation"),
      v.literal("other"),
    ),
    path: v.optional(v.string()),
    mimeType: v.optional(v.string()),
    sizeBytes: v.optional(v.number()),
    previewSnippet: v.optional(v.string()),
    externalId: v.optional(v.string()),
    externalUrl: v.optional(v.string()),
    metadata: v.optional(v.string()),
  },
  returns: v.id("dataItems"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("dataItems", {
      ...args,
      processingStatus: "discovered",
    });
  },
});

/**
 * Update processing status of a data item (called by agents).
 */
export const updateProcessingStatus = internalMutation({
  args: {
    dataItemId: v.id("dataItems"),
    processingStatus: v.union(
      v.literal("discovered"),
      v.literal("processing"),
      v.literal("processed"),
      v.literal("error"),
    ),
    previewSnippet: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { dataItemId, ...patch } = args;
    await ctx.db.patch(dataItemId, patch);
    return null;
  },
});
