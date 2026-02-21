import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ─── ORGANIZATIONS ───────────────────────────────────────────────
  // The company being onboarded onto the platform.
  organizations: defineTable({
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
    createdBy: v.optional(v.string()), // auth subject id
  }).index("by_createdBy", ["createdBy"]),

  // ─── DATA SOURCES ────────────────────────────────────────────────
  // Each connected external system (Google Drive, Gmail, OneDrive, etc.)
  dataSources: defineTable({
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
    label: v.string(), // user-facing name, e.g. "Main Google Drive"
    connectionStatus: v.union(
      v.literal("pending"),
      v.literal("connected"),
      v.literal("error"),
      v.literal("disconnected"),
    ),
    lastSyncedAt: v.optional(v.number()),
    config: v.optional(v.string()), // JSON-encoded connection config / token ref
    errorMessage: v.optional(v.string()),
  })
    .index("by_orgId", ["orgId"])
    .index("by_orgId_and_provider", ["orgId", "provider"]),

  // ─── DATA ITEMS ──────────────────────────────────────────────────
  // Individual files, emails, or documents discovered from a data source.
  dataItems: defineTable({
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
    path: v.optional(v.string()), // original location / folder path
    mimeType: v.optional(v.string()),
    sizeBytes: v.optional(v.number()),
    previewSnippet: v.optional(v.string()),
    externalId: v.optional(v.string()), // ID in the source system
    externalUrl: v.optional(v.string()),
    metadata: v.optional(v.string()), // JSON-encoded extra metadata
    processingStatus: v.union(
      v.literal("discovered"),
      v.literal("processing"),
      v.literal("processed"),
      v.literal("error"),
    ),
    storageId: v.optional(v.id("_storage")), // Convex file storage ref
  })
    .index("by_orgId", ["orgId"])
    .index("by_dataSourceId", ["dataSourceId"])
    .index("by_orgId_and_processingStatus", ["orgId", "processingStatus"]),

  // ─── KNOWLEDGE BASE NODES ────────────────────────────────────────
  // Hierarchical folder structure — the AI-navigable knowledge base.
  // Each node has an optional parentId (null = root) and a README.
  knowledgeBaseNodes: defineTable({
    orgId: v.id("organizations"),
    parentId: v.optional(v.id("knowledgeBaseNodes")),
    name: v.string(),
    depth: v.number(), // 0 = root level
    orderIndex: v.number(), // sibling ordering
    readme: v.optional(v.string()), // AI-generated summary / guide
    status: v.union(
      v.literal("draft"),
      v.literal("verified"),
      v.literal("archived"),
    ),
  })
    .index("by_orgId", ["orgId"])
    .index("by_orgId_and_parentId", ["orgId", "parentId"])
    .index("by_orgId_and_status", ["orgId", "status"]),

  // ─── KNOWLEDGE BASE LINKS ───────────────────────────────────────
  // Cross-references between KB nodes ("depends on", "related to", etc.)
  knowledgeBaseLinks: defineTable({
    orgId: v.id("organizations"),
    sourceNodeId: v.id("knowledgeBaseNodes"),
    targetNodeId: v.id("knowledgeBaseNodes"),
    relationship: v.union(
      v.literal("depends_on"),
      v.literal("related_to"),
      v.literal("see_also"),
      v.literal("parent_of"),
    ),
  })
    .index("by_sourceNodeId", ["sourceNodeId"])
    .index("by_targetNodeId", ["targetNodeId"]),

  // ─── NODE ↔ DATA ITEM MAPPING ───────────────────────────────────
  // Junction table: which data items belong to which KB nodes.
  // A single data item can appear in multiple nodes.
  nodeDataItems: defineTable({
    nodeId: v.id("knowledgeBaseNodes"),
    dataItemId: v.id("dataItems"),
    relevanceScore: v.optional(v.number()), // 0-1, AI-assigned
  })
    .index("by_nodeId", ["nodeId"])
    .index("by_dataItemId", ["dataItemId"]),

  // ─── VERIFICATION QUESTIONS ──────────────────────────────────────
  // Ambiguities / contradictions the AI surfaces for human review.
  verificationQuestions: defineTable({
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
    aiConfidence: v.optional(v.number()), // 0-1
  })
    .index("by_orgId", ["orgId"])
    .index("by_orgId_and_status", ["orgId", "status"]),

  // ─── AGENT JOBS ──────────────────────────────────────────────────
  // Tracks what AI agents are doing — powers the real-time progress UI.
  // If the agent used a forum guide for this job, guideId links to it.
  agentJobs: defineTable({
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
    progressPercent: v.optional(v.number()), // 0-100
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    guideId: v.optional(v.id("forumGuides")), // which guide was used, if any
  })
    .index("by_orgId", ["orgId"])
    .index("by_orgId_and_status", ["orgId", "status"])
    .index("by_guideId", ["guideId"]),

  // ─── AGENT MESSAGES ──────────────────────────────────────────────
  // Live feed of agent activity — real-time log the UI subscribes to.
  agentMessages: defineTable({
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
  })
    .index("by_jobId", ["jobId"])
    .index("by_orgId", ["orgId"]),

  // ─── FORUM GUIDES ───────────────────────────────────────────────
  // Cross-org action guides written by agents — the platform's data moat.
  // NOT scoped to a single org — shared knowledge across all engagements.
  forumGuides: defineTable({
    title: v.string(),
    category: v.union(
      v.literal("connector"),
      v.literal("cleaning"),
      v.literal("structuring"),
      v.literal("format"),
      v.literal("other"),
    ),
    content: v.string(), // the guide body (markdown)
    tags: v.array(v.string()),
    sourceContext: v.optional(v.string()), // what engagement produced this
    usefulnessScore: v.optional(v.number()), // aggregated quality signal

    // ─── Aggregated performance metrics (auto-computed from reports) ──
    totalUses: v.optional(v.number()), // how many times agents have used this guide
    avgDurationMs: v.optional(v.number()), // average job duration when using this guide
    avgItemsProcessed: v.optional(v.number()), // average items processed per job
    avgErrorRate: v.optional(v.number()), // average error rate (0-1)
    avgQualityScore: v.optional(v.number()), // average quality score (0-1)
    successRate: v.optional(v.number()), // % of jobs that completed (vs failed) (0-1)
    lastUsedAt: v.optional(v.number()), // timestamp of most recent use
  })
    .index("by_category", ["category"])
    .index("by_category_and_avgQualityScore", ["category", "avgQualityScore"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["category"],
    })
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["category"],
    }),

  // ─── PERFORMANCE REPORTS ─────────────────────────────────────────
  // Filed by an agent after finishing a job. Links a guide to concrete
  // outcome metrics so the platform can compare approaches over time.
  performanceReports: defineTable({
    guideId: v.id("forumGuides"),
    jobId: v.id("agentJobs"),
    orgId: v.id("organizations"),

    // ── What happened ──
    jobType: v.union(
      v.literal("explore"),
      v.literal("structure"),
      v.literal("verify"),
      v.literal("sync"),
    ),
    outcome: v.union(
      v.literal("success"),
      v.literal("partial"),
      v.literal("failure"),
    ),

    // ── Hard metrics ──
    durationMs: v.number(), // how long the job took
    itemsProcessed: v.number(), // how many data items were handled
    itemsErrored: v.number(), // how many errored during processing
    errorRate: v.number(), // itemsErrored / itemsProcessed (0-1)

    // ── Quality metrics (agent self-assessed or derived) ──
    qualityScore: v.optional(v.number()), // 0-1, how good was the output
    notes: v.optional(v.string()), // agent's free-text reflection on what worked/didn't

    // ── Context for comparison ──
    dataSourceProvider: v.optional(v.string()), // e.g. "google_drive" — helps compare guides per provider
    industry: v.optional(v.string()), // e.g. "accountancy" — helps compare across industries
  })
    .index("by_guideId", ["guideId"])
    .index("by_jobId", ["jobId"])
    .index("by_guideId_and_jobType", ["guideId", "jobType"])
    .index("by_orgId", ["orgId"]),
});
