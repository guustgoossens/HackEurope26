import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

const guideDoc = v.object({
  _id: v.id("forumGuides"),
  _creationTime: v.number(),
  title: v.string(),
  category: v.union(
    v.literal("connector"),
    v.literal("cleaning"),
    v.literal("structuring"),
    v.literal("format"),
    v.literal("other"),
  ),
  content: v.string(),
  tags: v.array(v.string()),
  sourceContext: v.optional(v.string()),
  usefulnessScore: v.optional(v.number()),
  // Aggregated performance metrics
  totalUses: v.optional(v.number()),
  avgDurationMs: v.optional(v.number()),
  avgItemsProcessed: v.optional(v.number()),
  avgErrorRate: v.optional(v.number()),
  avgQualityScore: v.optional(v.number()),
  successRate: v.optional(v.number()),
  lastUsedAt: v.optional(v.number()),
});

/**
 * List guides by category.
 */
export const listByCategory = query({
  args: {
    category: v.union(
      v.literal("connector"),
      v.literal("cleaning"),
      v.literal("structuring"),
      v.literal("format"),
      v.literal("other"),
    ),
  },
  returns: v.array(guideDoc),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("forumGuides")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();
  },
});

/**
 * Rank guides in a category by a chosen performance metric.
 * This is how agents pick the best approach: "give me the top exploration
 * guides sorted by quality score."
 */
export const rankByPerformance = query({
  args: {
    category: v.union(
      v.literal("connector"),
      v.literal("cleaning"),
      v.literal("structuring"),
      v.literal("format"),
      v.literal("other"),
    ),
    sortBy: v.union(
      v.literal("avgQualityScore"),
      v.literal("successRate"),
      v.literal("avgDurationMs"),
      v.literal("avgErrorRate"),
      v.literal("totalUses"),
    ),
    limit: v.number(),
  },
  returns: v.array(guideDoc),
  handler: async (ctx, args) => {
    const guides = await ctx.db
      .query("forumGuides")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();

    // Sort in-memory by the chosen metric
    const sorted = guides
      .filter((g) => g.totalUses !== undefined && g.totalUses > 0)
      .sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[args.sortBy] as
          | number
          | undefined;
        const bVal = (b as Record<string, unknown>)[args.sortBy] as
          | number
          | undefined;

        // For duration and error rate, lower is better
        if (
          args.sortBy === "avgDurationMs" ||
          args.sortBy === "avgErrorRate"
        ) {
          return (aVal ?? Infinity) - (bVal ?? Infinity);
        }
        // For quality, success rate, and total uses, higher is better
        return (bVal ?? 0) - (aVal ?? 0);
      });

    return sorted.slice(0, args.limit);
  },
});

/**
 * Compare two or more guides side-by-side by their aggregated metrics.
 * Useful for agents deciding which approach to try, or for the UI to
 * show a comparison card.
 */
export const compare = query({
  args: {
    guideIds: v.array(v.id("forumGuides")),
  },
  returns: v.array(
    v.object({
      _id: v.id("forumGuides"),
      title: v.string(),
      category: v.union(
        v.literal("connector"),
        v.literal("cleaning"),
        v.literal("structuring"),
        v.literal("format"),
        v.literal("other"),
      ),
      totalUses: v.optional(v.number()),
      avgDurationMs: v.optional(v.number()),
      avgItemsProcessed: v.optional(v.number()),
      avgErrorRate: v.optional(v.number()),
      avgQualityScore: v.optional(v.number()),
      successRate: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    const results = [];
    for (const guideId of args.guideIds) {
      const guide = await ctx.db.get(guideId);
      if (guide) {
        results.push({
          _id: guide._id,
          title: guide.title,
          category: guide.category,
          totalUses: guide.totalUses,
          avgDurationMs: guide.avgDurationMs,
          avgItemsProcessed: guide.avgItemsProcessed,
          avgErrorRate: guide.avgErrorRate,
          avgQualityScore: guide.avgQualityScore,
          successRate: guide.successRate,
        });
      }
    }
    return results;
  },
});

/**
 * Get the single best guide for a category + job type combination.
 * This is what an agent calls before starting work: "what's the best
 * guide for exploring Google Drive data?"
 *
 * Picks the guide with the highest quality score that has been used
 * at least `minUses` times (to avoid recommending untested guides).
 */
export const getBestGuide = query({
  args: {
    category: v.union(
      v.literal("connector"),
      v.literal("cleaning"),
      v.literal("structuring"),
      v.literal("format"),
      v.literal("other"),
    ),
    minUses: v.number(),
  },
  returns: v.union(guideDoc, v.null()),
  handler: async (ctx, args) => {
    const guides = await ctx.db
      .query("forumGuides")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();

    const eligible = guides.filter(
      (g) =>
        g.totalUses !== undefined &&
        g.totalUses >= args.minUses &&
        g.avgQualityScore !== undefined,
    );

    if (eligible.length === 0) {
      return null;
    }

    // Sort by quality score descending, break ties with success rate
    eligible.sort((a, b) => {
      const qualityDiff = (b.avgQualityScore ?? 0) - (a.avgQualityScore ?? 0);
      if (qualityDiff !== 0) return qualityDiff;
      return (b.successRate ?? 0) - (a.successRate ?? 0);
    });

    return eligible[0];
  },
});

/**
 * Full-text search guides by content.
 */
export const searchContent = query({
  args: {
    searchQuery: v.string(),
    category: v.optional(
      v.union(
        v.literal("connector"),
        v.literal("cleaning"),
        v.literal("structuring"),
        v.literal("format"),
        v.literal("other"),
      ),
    ),
  },
  returns: v.array(guideDoc),
  handler: async (ctx, args) => {
    const q = ctx.db
      .query("forumGuides")
      .withSearchIndex("search_content", (search) => {
        const s = search.search("content", args.searchQuery);
        if (args.category) {
          return s.eq("category", args.category);
        }
        return s;
      });
    return await q.take(20);
  },
});

/**
 * Full-text search guides by title.
 */
export const searchTitle = query({
  args: {
    searchQuery: v.string(),
    category: v.optional(
      v.union(
        v.literal("connector"),
        v.literal("cleaning"),
        v.literal("structuring"),
        v.literal("format"),
        v.literal("other"),
      ),
    ),
  },
  returns: v.array(guideDoc),
  handler: async (ctx, args) => {
    const q = ctx.db
      .query("forumGuides")
      .withSearchIndex("search_title", (search) => {
        const s = search.search("title", args.searchQuery);
        if (args.category) {
          return s.eq("category", args.category);
        }
        return s;
      });
    return await q.take(20);
  },
});

/**
 * Create a new forum guide (called by agents after learning something).
 */
export const create = internalMutation({
  args: {
    title: v.string(),
    category: v.union(
      v.literal("connector"),
      v.literal("cleaning"),
      v.literal("structuring"),
      v.literal("format"),
      v.literal("other"),
    ),
    content: v.string(),
    tags: v.array(v.string()),
    sourceContext: v.optional(v.string()),
  },
  returns: v.id("forumGuides"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("forumGuides", {
      ...args,
      usefulnessScore: 0,
      totalUses: 0,
      avgDurationMs: undefined,
      avgItemsProcessed: undefined,
      avgErrorRate: undefined,
      avgQualityScore: undefined,
      successRate: undefined,
      lastUsedAt: undefined,
    });
  },
});

/**
 * Increment the usefulness score of a guide (manual upvote, separate from performance).
 */
export const upvote = internalMutation({
  args: { guideId: v.id("forumGuides") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const guide = await ctx.db.get(args.guideId);
    if (!guide) {
      throw new Error("Guide not found");
    }
    await ctx.db.patch(args.guideId, {
      usefulnessScore: (guide.usefulnessScore ?? 0) + 1,
    });
    return null;
  },
});
