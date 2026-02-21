import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

const jobDoc = v.object({
  _id: v.id("agentJobs"),
  _creationTime: v.number(),
  orgId: v.id("organizations"),
  jobType: v.union(
    v.literal("explore"),
    v.literal("structure"),
    v.literal("verify"),
    v.literal("sync"),
  ),
  status: v.union(
    v.literal("queued"),
    v.literal("running"),
    v.literal("completed"),
    v.literal("failed"),
  ),
  progressPercent: v.optional(v.number()),
  startedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  errorMessage: v.optional(v.string()),
  guideId: v.optional(v.id("forumGuides")),
});

const messageDoc = v.object({
  _id: v.id("agentMessages"),
  _creationTime: v.number(),
  orgId: v.id("organizations"),
  jobId: v.id("agentJobs"),
  messageType: v.union(
    v.literal("info"),
    v.literal("warning"),
    v.literal("discovery"),
    v.literal("question"),
    v.literal("error"),
  ),
  content: v.string(),
  relatedNodeId: v.optional(v.id("knowledgeBaseNodes")),
  relatedDataItemId: v.optional(v.id("dataItems")),
});

/**
 * List jobs for an organization, optionally filtered by status.
 */
export const listByOrg = query({
  args: {
    orgId: v.id("organizations"),
    status: v.optional(
      v.union(
        v.literal("queued"),
        v.literal("running"),
        v.literal("completed"),
        v.literal("failed"),
      ),
    ),
  },
  returns: v.array(jobDoc),
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("agentJobs")
        .withIndex("by_orgId_and_status", (q) =>
          q.eq("orgId", args.orgId).eq("status", args.status!),
        )
        .collect();
    }
    return await ctx.db
      .query("agentJobs")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .collect();
  },
});

/**
 * Get messages for a specific job (real-time activity feed).
 */
export const listMessages = query({
  args: { jobId: v.id("agentJobs") },
  returns: v.array(messageDoc),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agentMessages")
      .withIndex("by_jobId", (q) => q.eq("jobId", args.jobId))
      .collect();
  },
});

/**
 * Get the latest messages across all jobs for an org (live dashboard).
 */
export const listRecentMessages = query({
  args: { orgId: v.id("organizations"), count: v.number() },
  returns: v.array(messageDoc),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agentMessages")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(args.count);
  },
});

// ─── Internal mutations (called by agent actions) ──────────────

/**
 * Create a new agent job.
 */
export const createJob = internalMutation({
  args: {
    orgId: v.id("organizations"),
    jobType: v.union(
      v.literal("explore"),
      v.literal("structure"),
      v.literal("verify"),
      v.literal("sync"),
    ),
    guideId: v.optional(v.id("forumGuides")),
  },
  returns: v.id("agentJobs"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("agentJobs", {
      orgId: args.orgId,
      jobType: args.jobType,
      status: "queued",
      guideId: args.guideId,
    });
  },
});

/**
 * List all jobs that used a specific guide (for performance analysis).
 */
export const listByGuide = query({
  args: { guideId: v.id("forumGuides") },
  returns: v.array(jobDoc),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agentJobs")
      .withIndex("by_guideId", (q) => q.eq("guideId", args.guideId))
      .collect();
  },
});

/**
 * Update job status and progress.
 */
export const updateJob = internalMutation({
  args: {
    jobId: v.id("agentJobs"),
    status: v.optional(
      v.union(
        v.literal("queued"),
        v.literal("running"),
        v.literal("completed"),
        v.literal("failed"),
      ),
    ),
    progressPercent: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { jobId, ...patch } = args;
    // Remove undefined keys
    const cleanPatch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) {
        cleanPatch[key] = value;
      }
    }
    await ctx.db.patch(jobId, cleanPatch);
    return null;
  },
});

/**
 * Log an agent message (called by agent actions during processing).
 */
export const logMessage = internalMutation({
  args: {
    orgId: v.id("organizations"),
    jobId: v.id("agentJobs"),
    messageType: v.union(
      v.literal("info"),
      v.literal("warning"),
      v.literal("discovery"),
      v.literal("question"),
      v.literal("error"),
    ),
    content: v.string(),
    relatedNodeId: v.optional(v.id("knowledgeBaseNodes")),
    relatedDataItemId: v.optional(v.id("dataItems")),
  },
  returns: v.id("agentMessages"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("agentMessages", args);
  },
});
