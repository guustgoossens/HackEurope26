import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * List all organizations created by the current user.
 */
export const listMine = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("organizations"),
      _creationTime: v.number(),
      name: v.string(),
      industry: v.string(),
      description: v.optional(v.string()),
      phase: v.union(
        v.literal("onboard"),
        v.literal("explore"),
        v.literal("structure"),
        v.literal("verify"),
        v.literal("ready"),
      ),
      goals: v.optional(v.array(v.string())),
      createdBy: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    return await ctx.db
      .query("organizations")
      .withIndex("by_createdBy", (q) => q.eq("createdBy", identity.subject))
      .collect();
  },
});

/**
 * Get a single organization by ID.
 */
export const get = query({
  args: { orgId: v.id("organizations") },
  returns: v.union(
    v.object({
      _id: v.id("organizations"),
      _creationTime: v.number(),
      name: v.string(),
      industry: v.string(),
      description: v.optional(v.string()),
      phase: v.union(
        v.literal("onboard"),
        v.literal("explore"),
        v.literal("structure"),
        v.literal("verify"),
        v.literal("ready"),
      ),
      goals: v.optional(v.array(v.string())),
      createdBy: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.orgId);
  },
});

/**
 * Create a new organization and start the onboarding phase.
 */
export const create = mutation({
  args: {
    name: v.string(),
    industry: v.string(),
    description: v.optional(v.string()),
    goals: v.optional(v.array(v.string())),
  },
  returns: v.id("organizations"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    return await ctx.db.insert("organizations", {
      name: args.name,
      industry: args.industry,
      description: args.description,
      phase: "onboard",
      goals: args.goals,
      createdBy: identity?.subject ?? undefined,
    });
  },
});

/**
 * Update an organization's details or advance its phase.
 */
export const update = mutation({
  args: {
    orgId: v.id("organizations"),
    name: v.optional(v.string()),
    industry: v.optional(v.string()),
    description: v.optional(v.string()),
    phase: v.optional(
      v.union(
        v.literal("onboard"),
        v.literal("explore"),
        v.literal("structure"),
        v.literal("verify"),
        v.literal("ready"),
      ),
    ),
    goals: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { orgId, ...fields } = args;
    const existing = await ctx.db.get(orgId);
    if (!existing) {
      throw new Error("Organization not found");
    }
    // Build patch object with only provided fields
    const patch: Record<string, unknown> = {};
    if (fields.name !== undefined) patch.name = fields.name;
    if (fields.industry !== undefined) patch.industry = fields.industry;
    if (fields.description !== undefined) patch.description = fields.description;
    if (fields.phase !== undefined) patch.phase = fields.phase;
    if (fields.goals !== undefined) patch.goals = fields.goals;

    await ctx.db.patch(orgId, patch);
    return null;
  },
});
