import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

const questionDoc = v.object({
  _id: v.id("verificationQuestions"),
  _creationTime: v.number(),
  orgId: v.id("organizations"),
  relatedNodeId: v.optional(v.id("knowledgeBaseNodes")),
  relatedDataItemIds: v.optional(v.array(v.id("dataItems"))),
  questionText: v.string(),
  questionType: v.union(
    v.literal("disambiguation"),
    v.literal("conflict"),
    v.literal("classification"),
    v.literal("missing_info"),
  ),
  options: v.array(
    v.object({
      label: v.string(),
      description: v.optional(v.string()),
    }),
  ),
  status: v.union(
    v.literal("pending"),
    v.literal("answered"),
    v.literal("skipped"),
  ),
  answer: v.optional(v.string()),
  aiConfidence: v.optional(v.number()),
});

/**
 * List pending verification questions for an organization.
 */
export const listPending = query({
  args: { orgId: v.id("organizations") },
  returns: v.array(questionDoc),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("verificationQuestions")
      .withIndex("by_orgId_and_status", (q) =>
        q.eq("orgId", args.orgId).eq("status", "pending"),
      )
      .collect();
  },
});

/**
 * List all verification questions for an organization.
 */
export const listByOrg = query({
  args: { orgId: v.id("organizations") },
  returns: v.array(questionDoc),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("verificationQuestions")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .collect();
  },
});

/**
 * Create a verification question (called by the AI agent).
 */
export const create = internalMutation({
  args: {
    orgId: v.id("organizations"),
    relatedNodeId: v.optional(v.id("knowledgeBaseNodes")),
    relatedDataItemIds: v.optional(v.array(v.id("dataItems"))),
    questionText: v.string(),
    questionType: v.union(
      v.literal("disambiguation"),
      v.literal("conflict"),
      v.literal("classification"),
      v.literal("missing_info"),
    ),
    options: v.array(
      v.object({
        label: v.string(),
        description: v.optional(v.string()),
      }),
    ),
    aiConfidence: v.optional(v.number()),
  },
  returns: v.id("verificationQuestions"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("verificationQuestions", {
      ...args,
      status: "pending",
    });
  },
});

/**
 * Answer a verification question (called by the human user).
 */
export const answer = mutation({
  args: {
    questionId: v.id("verificationQuestions"),
    answer: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.questionId);
    if (!existing) {
      throw new Error("Question not found");
    }
    await ctx.db.patch(args.questionId, {
      status: "answered",
      answer: args.answer,
    });
    return null;
  },
});

/**
 * Skip a verification question.
 */
export const skip = mutation({
  args: { questionId: v.id("verificationQuestions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.questionId);
    if (!existing) {
      throw new Error("Question not found");
    }
    await ctx.db.patch(args.questionId, { status: "skipped" });
    return null;
  },
});
