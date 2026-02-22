import { query, mutation, internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';

const questionValidator = v.object({
  id: v.string(),
  text: v.string(),
  options: v.array(v.string()),
  contradictionId: v.optional(v.id('contradictions')),
});

const questionnaireDocValidator = v.object({
  _id: v.id('questionnaires'),
  _creationTime: v.number(),
  clientId: v.id('clients'),
  title: v.string(),
  questions: v.array(questionValidator),
  status: v.union(v.literal('draft'), v.literal('sent'), v.literal('completed')),
});

const responseDocValidator = v.object({
  _id: v.id('questionnaire_responses'),
  _creationTime: v.number(),
  questionnaireId: v.id('questionnaires'),
  questionId: v.string(),
  selectedOption: v.string(),
  respondedBy: v.string(),
});

export const create = internalMutation({
  args: {
    clientId: v.id('clients'),
    title: v.string(),
    questions: v.array(questionValidator),
  },
  returns: v.id('questionnaires'),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert('questionnaires', {
      clientId: args.clientId,
      title: args.title,
      questions: args.questions,
      status: 'draft',
    });
    return id;
  },
});

export const respond = mutation({
  args: {
    questionnaireId: v.id('questionnaires'),
    questionId: v.string(),
    selectedOption: v.string(),
    respondedBy: v.string(),
  },
  returns: v.id('questionnaire_responses'),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert('questionnaire_responses', {
      questionnaireId: args.questionnaireId,
      questionId: args.questionId,
      selectedOption: args.selectedOption,
      respondedBy: args.respondedBy,
    });
    return id;
  },
});

export const listByClient = query({
  args: {
    clientId: v.id('clients'),
  },
  returns: v.array(questionnaireDocValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('questionnaires')
      .withIndex('by_clientId', (q) => q.eq('clientId', args.clientId))
      .collect();
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id('questionnaires'),
    status: v.union(v.literal('draft'), v.literal('sent'), v.literal('completed')),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status });
    return null;
  },
});

export const internalGetResponses = internalQuery({
  args: {
    questionnaireId: v.id('questionnaires'),
  },
  returns: v.array(responseDocValidator),
  handler: async (ctx, args) => {
    return await ctx.db
      .query('questionnaire_responses')
      .withIndex('by_questionnaireId', (q) => q.eq('questionnaireId', args.questionnaireId))
      .collect();
  },
});

export const getWithResponses = query({
  args: {
    id: v.id('questionnaires'),
  },
  returns: v.union(
    v.object({
      questionnaire: questionnaireDocValidator,
      responses: v.array(responseDocValidator),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const questionnaire = await ctx.db.get(args.id);
    if (!questionnaire) {
      return null;
    }

    const responses = await ctx.db
      .query('questionnaire_responses')
      .withIndex('by_questionnaireId', (q) => q.eq('questionnaireId', args.id))
      .collect();

    return { questionnaire, responses };
  },
});
