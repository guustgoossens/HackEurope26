import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

const reportDoc = v.object({
  _id: v.id("performanceReports"),
  _creationTime: v.number(),
  guideId: v.id("forumGuides"),
  jobId: v.id("agentJobs"),
  orgId: v.id("organizations"),
  outcome: v.union(
    v.literal("success"),
    v.literal("partial"),
    v.literal("failure"),
  ),
  durationMs: v.number(),
  itemsProcessed: v.number(),
  itemsErrored: v.number(),
  errorRate: v.number(),
  qualityScore: v.optional(v.number()),
  notes: v.optional(v.string()),
  dataSourceProvider: v.optional(v.string()),
});

/**
 * File a performance report after a job completes.
 * This is the core feedback loop: agent finishes a job, reports how the guide
 * performed, and the guide's aggregated metrics get recomputed.
 */
export const fileReport = internalMutation({
  args: {
    guideId: v.id("forumGuides"),
    jobId: v.id("agentJobs"),
    orgId: v.id("organizations"),
    outcome: v.union(
      v.literal("success"),
      v.literal("partial"),
      v.literal("failure"),
    ),
    durationMs: v.number(),
    itemsProcessed: v.number(),
    itemsErrored: v.number(),
    qualityScore: v.optional(v.number()),
    notes: v.optional(v.string()),
    dataSourceProvider: v.optional(v.string()),
  },
  returns: v.id("performanceReports"),
  handler: async (ctx, args) => {
    const errorRate =
      args.itemsProcessed > 0 ? args.itemsErrored / args.itemsProcessed : 0;

    // 1. Insert the report
    const reportId = await ctx.db.insert("performanceReports", {
      ...args,
      errorRate,
    });

    // 2. Recompute the guide's aggregated metrics from all its reports
    const allReports = await ctx.db
      .query("performanceReports")
      .withIndex("by_guideId", (q) => q.eq("guideId", args.guideId))
      .collect();

    const totalUses = allReports.length;
    const successes = allReports.filter((r) => r.outcome === "success").length;

    const avgDurationMs =
      allReports.reduce((sum, r) => sum + r.durationMs, 0) / totalUses;
    const avgItemsProcessed =
      allReports.reduce((sum, r) => sum + r.itemsProcessed, 0) / totalUses;
    const avgErrorRate =
      allReports.reduce((sum, r) => sum + r.errorRate, 0) / totalUses;
    const successRate = successes / totalUses;

    // Quality score average (only from reports that have one)
    const reportsWithQuality = allReports.filter(
      (r) => r.qualityScore !== undefined,
    );
    const avgQualityScore =
      reportsWithQuality.length > 0
        ? reportsWithQuality.reduce((sum, r) => sum + r.qualityScore!, 0) /
          reportsWithQuality.length
        : undefined;

    // 3. Update the guide with fresh aggregated metrics
    await ctx.db.patch(args.guideId, {
      totalUses,
      avgDurationMs,
      avgItemsProcessed,
      avgErrorRate,
      avgQualityScore,
      successRate,
      lastUsedAt: Date.now(),
    });

    return reportId;
  },
});

/**
 * Get all performance reports for a specific guide.
 */
export const listByGuide = query({
  args: { guideId: v.id("forumGuides") },
  returns: v.array(reportDoc),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("performanceReports")
      .withIndex("by_guideId", (q) => q.eq("guideId", args.guideId))
      .collect();
  },
});

/**
 * Get the performance report for a specific job.
 */
export const getByJob = query({
  args: { jobId: v.id("agentJobs") },
  returns: v.union(reportDoc, v.null()),
  handler: async (ctx, args) => {
    const reports = await ctx.db
      .query("performanceReports")
      .withIndex("by_jobId", (q) => q.eq("jobId", args.jobId))
      .take(1);
    return reports[0] ?? null;
  },
});

/**
 * Get all reports for a guide filtered by job type.
 * jobType is looked up by joining through the linked agentJobs document,
 * since we don't store it redundantly on the report itself.
 */
export const listByGuideAndJobType = query({
  args: {
    guideId: v.id("forumGuides"),
    jobType: v.union(
      v.literal("explore"),
      v.literal("structure"),
      v.literal("verify"),
      v.literal("sync"),
    ),
  },
  returns: v.array(reportDoc),
  handler: async (ctx, args) => {
    const reports = await ctx.db
      .query("performanceReports")
      .withIndex("by_guideId", (q) => q.eq("guideId", args.guideId))
      .collect();

    // Join through agentJobs to filter by jobType without storing it redundantly
    const filtered = [];
    for (const report of reports) {
      const job = await ctx.db.get(report.jobId);
      if (job && job.jobType === args.jobType) {
        filtered.push(report);
      }
    }
    return filtered;
  },
});
