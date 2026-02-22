import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  clients: defineTable({
    name: v.string(),
    industry: v.string(),
    phase: v.union(
      v.literal('onboard'),
      v.literal('explore'),
      v.literal('structure'),
      v.literal('verify'),
      v.literal('use'),
    ),
    createdBy: v.string(),
  }).index('by_createdBy', ['createdBy']),

  data_sources: defineTable({
    clientId: v.id('clients'),
    type: v.union(v.literal('gmail'), v.literal('drive'), v.literal('sheets')),
    label: v.string(),
    connectionStatus: v.union(v.literal('pending'), v.literal('connected'), v.literal('error')),
    composioEntityId: v.optional(v.string()),
  }).index('by_clientId', ['clientId']),

  explorations: defineTable({
    clientId: v.id('clients'),
    dataSourceId: v.id('data_sources'),
    metrics: v.any(),
    status: v.union(v.literal('running'), v.literal('completed'), v.literal('failed')),
  })
    .index('by_clientId', ['clientId'])
    .index('by_clientId_and_dataSourceId', ['clientId', 'dataSourceId']),

  contradictions: defineTable({
    clientId: v.id('clients'),
    description: v.string(),
    sourceA: v.string(),
    sourceB: v.string(),
    valueA: v.string(),
    valueB: v.string(),
    status: v.union(v.literal('open'), v.literal('resolved'), v.literal('dismissed')),
    resolution: v.optional(v.string()),
  })
    .index('by_clientId', ['clientId'])
    .index('by_clientId_and_status', ['clientId', 'status']),

  questionnaires: defineTable({
    clientId: v.id('clients'),
    title: v.string(),
    questions: v.array(
      v.object({
        id: v.string(),
        text: v.string(),
        options: v.array(v.string()),
        contradictionId: v.optional(v.id('contradictions')),
      }),
    ),
    status: v.union(v.literal('draft'), v.literal('sent'), v.literal('completed')),
  }).index('by_clientId', ['clientId']),

  questionnaire_responses: defineTable({
    questionnaireId: v.id('questionnaires'),
    questionId: v.string(),
    selectedOption: v.string(),
    respondedBy: v.string(),
  })
    .index('by_questionnaireId', ['questionnaireId'])
    .index('by_questionnaireId_and_questionId', ['questionnaireId', 'questionId']),

  knowledge_tree: defineTable({
    clientId: v.id('clients'),
    parentId: v.optional(v.id('knowledge_tree')),
    name: v.string(),
    type: v.union(v.literal('domain'), v.literal('skill'), v.literal('entry_group')),
    readme: v.optional(v.string()),
    order: v.number(),
  })
    .index('by_clientId', ['clientId'])
    .index('by_clientId_and_parentId', ['clientId', 'parentId']),

  knowledge_entries: defineTable({
    clientId: v.id('clients'),
    treeNodeId: v.id('knowledge_tree'),
    title: v.string(),
    content: v.string(),
    sourceRef: v.optional(v.string()),
    confidence: v.number(),
    verified: v.boolean(),
  })
    .index('by_clientId', ['clientId'])
    .index('by_treeNodeId', ['treeNodeId'])
    .index('by_clientId_and_treeNodeId', ['clientId', 'treeNodeId']),

  forum_entries: defineTable({
    title: v.string(),
    category: v.string(),
    content: v.string(),
    authorAgent: v.string(),
    tags: v.array(v.string()),
    upvotes: v.number(),
    sourceType: v.optional(v.string()),
    phase: v.optional(v.string()),
    fileType: v.optional(v.string()),
  })
    .index('by_category', ['category'])
    .index('by_authorAgent', ['authorAgent'])
    .searchIndex('search_content', {
      searchField: 'content',
      filterFields: ['sourceType', 'phase', 'fileType', 'category'],
    }),

  pipeline_status: defineTable({
    clientId: v.id('clients'),
    currentPhase: v.union(
      v.literal('explore'),
      v.literal('structure'),
      v.literal('verify'),
      v.literal('use'),
    ),
    phaseProgress: v.number(),
    activeAgents: v.array(v.string()),
    lastActivity: v.number(),
  }).index('by_clientId', ['clientId']),

  agent_events: defineTable({
    clientId: v.id('clients'),
    agentName: v.string(),
    eventType: v.union(
      v.literal('info'),
      v.literal('progress'),
      v.literal('warning'),
      v.literal('error'),
      v.literal('complete'),
    ),
    message: v.string(),
    metadata: v.optional(v.any()),
  })
    .index('by_clientId', ['clientId'])
    .index('by_clientId_and_eventType', ['clientId', 'eventType']),
});
