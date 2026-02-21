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
    .index('by_treeNodeId', ['treeNodeId']),

  forum_entries: defineTable({
    title: v.string(),
    category: v.string(),
    content: v.string(),
    authorAgent: v.string(),
    tags: v.array(v.string()),
    upvotes: v.number(),
  })
    .index('by_category', ['category'])
    .searchIndex('search_content', { searchField: 'content' }),

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
  }).index('by_clientId', ['clientId']),

  // ─── LEGACY VISUALIZATION TABLES (for demo) ─────────────────────
  organizations: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    phase: v.union(
      v.literal('onboard'),
      v.literal('explore'),
      v.literal('structure'),
      v.literal('verify'),
      v.literal('ready'),
    ),
    goals: v.optional(v.array(v.string())),
    createdBy: v.optional(v.string()),
  }).index('by_createdBy', ['createdBy']),

  dataSources: defineTable({
    organizationId: v.id('organizations'),
    name: v.string(),
    provider: v.union(
      v.literal('google_drive'),
      v.literal('gmail'),
      v.literal('sharepoint'),
      v.literal('dropbox'),
      v.literal('onedrive'),
      v.literal('local_upload'),
      v.literal('other'),
    ),
    connectionStatus: v.union(
      v.literal('pending'),
      v.literal('connected'),
      v.literal('syncing'),
      v.literal('error'),
      v.literal('disconnected'),
    ),
    lastSyncedAt: v.optional(v.number()),
    itemCount: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  }).index('by_organizationId', ['organizationId']),

  dataItems: defineTable({
    organizationId: v.id('organizations'),
    dataSourceId: v.id('dataSources'),
    name: v.string(),
    path: v.string(),
    fileType: v.union(
      v.literal('pdf'),
      v.literal('spreadsheet'),
      v.literal('document'),
      v.literal('email'),
      v.literal('image'),
      v.literal('presentation'),
      v.literal('other'),
    ),
    size: v.optional(v.number()),
    processingStatus: v.union(
      v.literal('discovered'),
      v.literal('processing'),
      v.literal('processed'),
      v.literal('error'),
    ),
    errorMessage: v.optional(v.string()),
    metadata: v.optional(v.any()),
  })
    .index('by_organizationId', ['organizationId'])
    .index('by_dataSourceId', ['dataSourceId']),

  knowledgeBaseNodes: defineTable({
    organizationId: v.id('organizations'),
    name: v.string(),
    description: v.optional(v.string()),
    nodeType: v.union(
      v.literal('domain'),
      v.literal('subdomain'),
      v.literal('concept'),
      v.literal('fact'),
      v.literal('procedure'),
      v.literal('other'),
    ),
    depth: v.number(),
    status: v.union(v.literal('draft'), v.literal('verified'), v.literal('archived')),
    metadata: v.optional(v.any()),
  }).index('by_organizationId', ['organizationId']),

  knowledgeBaseLinks: defineTable({
    organizationId: v.id('organizations'),
    sourceNodeId: v.id('knowledgeBaseNodes'),
    targetNodeId: v.id('knowledgeBaseNodes'),
    relationship: v.union(
      v.literal('parent_of'),
      v.literal('relates_to'),
      v.literal('depends_on'),
      v.literal('contradicts'),
      v.literal('same_folder'),
    ),
    strength: v.optional(v.number()),
  })
    .index('by_organizationId', ['organizationId'])
    .index('by_sourceNodeId', ['sourceNodeId'])
    .index('by_targetNodeId', ['targetNodeId']),

  nodeDataItems: defineTable({
    organizationId: v.id('organizations'),
    nodeId: v.id('knowledgeBaseNodes'),
    dataItemId: v.id('dataItems'),
    relevanceScore: v.optional(v.number()),
  })
    .index('by_nodeId', ['nodeId'])
    .index('by_dataItemId', ['dataItemId']),
});
