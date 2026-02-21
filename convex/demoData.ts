/**
 * DEMO DATA — demoData.ts
 *
 * Standalone seed file for the HackEurope26 demo narrative.
 * Creates two mutations:
 *
 *   insertDemoMessy  — Phase: explore. The "before" state. Raw, unstructured,
 *                      the graph looks like a hairball. This is what you show first.
 *
 *   insertDemoClean  — Phase: verify. The "after" state. Structured, verified,
 *                      rich cross-links, the graph has clear shape and colour.
 *
 * Usage (Convex CLI):
 *   npx convex run demoData:insertDemoMessy
 *   npx convex run demoData:insertDemoClean
 *   npx convex run demoData:clearDemo      ← wipe everything before re-seeding
 *
 * DELETE THIS FILE after the hackathon.
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// ─────────────────────────────────────────────────────────────────────────────
// CLEAR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wipe all demo data for a given org so you can re-seed cleanly.
 */
export const clearDemo = mutation({
  args: { orgId: v.id("organizations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Tables with by_orgId index — delete directly
    const orgScopedTables = [
      "agentMessages",
      "agentJobs",
      "verificationQuestions",
      "knowledgeBaseLinks",
      "knowledgeBaseNodes",
      "dataItems",
      "dataSources",
    ] as const;

    for (const table of orgScopedTables) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
        .collect();
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }
    }

    // nodeDataItems has no orgId — delete via KB nodes that belong to this org
    const kbNodes = await ctx.db
      .query("knowledgeBaseNodes")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .collect();
    for (const node of kbNodes) {
      const mappings = await ctx.db
        .query("nodeDataItems")
        .withIndex("by_nodeId", (q) => q.eq("nodeId", node._id))
        .collect();
      for (const mapping of mappings) {
        await ctx.db.delete(mapping._id);
      }
    }

    return null;
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MESSY — the "before" state
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inserts a realistic "before" state for Hartley & Associates LLP.
 * Phase: EXPLORE — the agent has just crawled data sources and discovered files/emails.
 * 
 * THIS IS THE KEY DEMO VISUAL:
 * - Graph nodes = individual DATA ITEMS (files, emails, spreadsheets)
 * - Node icons show file type: 📄 PDF, 📊 XLSX, 📧 Email, 📝 Doc, etc.
 * - Files and emails are COMPLETELY DISCONNECTED (no links between them)
 * - Shows the chaos: duplicates, version conflicts, orphaned files
 * - All scattered across random Drive folders and email inboxes
 * 
 * Visual characteristics:
 *   - 60+ nodes floating independently (no clusters)
 *   - No hierarchical structure (everything depth 0)
 *   - Files near each other in Drive might be slightly connected
 *   - Emails are completely isolated from files
 *   - All status: "discovered" or "processing" (orange/yellow nodes)
 */
export const insertDemoMessy = mutation({
  args: { orgId: v.id("organizations") },
  returns: v.object({ message: v.string(), nodesCreated: v.number() }),
  handler: async (ctx, args) => {
    const now = Date.now();

    // ── Data Sources ───────────────────────────────────────────────
    const gDrive = await ctx.db.insert("dataSources", {
      orgId: args.orgId,
      provider: "google_drive",
      label: "Hartley Main Drive",
      connectionStatus: "connected",
      lastSyncedAt: now - 1000 * 60 * 15, // 15 mins ago
    });

    const gmail = await ctx.db.insert("dataSources", {
      orgId: args.orgId,
      provider: "gmail",
      label: "Partners Gmail",
      connectionStatus: "connected",
      lastSyncedAt: now - 1000 * 60 * 12,
    });

    const outlook = await ctx.db.insert("dataSources", {
      orgId: args.orgId,
      provider: "outlook",
      label: "Client Comms Outlook",
      connectionStatus: "error",
      errorMessage: "OAuth token expired — reconnect required",
    });

    // ── Data Items — raw discovered files, INTENTIONALLY MESSY ─────
    // Characteristics of mess:
    // - Inconsistent naming conventions (snake_case, camelCase, "Copy of")
    // - Version chaos (v1, v2, FINAL, FINAL_v2, REALLY_FINAL)
    // - Duplicates across random locations
    // - Deep nested folders with cryptic names
    // - Date format inconsistency (Q1_2024, 2024-Q1, mar24, March)
    // - Typos and abbreviations (inv, invce, invoice)
    // - Orphaned mystery files
    const rawItems = [
      // ── INVOICING CHAOS ────
      { name: "invoice_acme_march.pdf",                  fileType: "pdf", path: "/Drive/Desktop/Random Stuff/",                    processingStatus: "discovered" },
      { name: "invce ACME april 2024.pdf",               fileType: "pdf", path: "/Drive/Sarah's Files/Clients/Acme/",              processingStatus: "discovered" },
      { name: "invoice_acme_feb_FINAL_v2.pdf",           fileType: "pdf", path: "/Drive/Invoices Old/2024/Q1/",                   processingStatus: "processing" },
      { name: "ACME inv - Feb REALLY FINAL.pdf",         fileType: "pdf", path: "/Drive/Desktop/",                                processingStatus: "discovered" },
      { name: "Copy of invoice_acme_march.pdf",          fileType: "pdf", path: "/Drive/Archive/Unsorted/",                       processingStatus: "discovered" },
      { name: "brightfield_inv_2024-03.pdf",             fileType: "pdf", path: "/Drive/Sarah's Files/Clients/Brightfield/",       processingStatus: "discovered" },
      { name: "Invoice - Brightfield - March 24.pdf",    fileType: "pdf", path: "/Drive/Invoices Old/",                           processingStatus: "discovered" },
      { name: "client_inv_mar.pdf",                      fileType: "pdf", path: "/Drive/Desktop/To Sort/",                        processingStatus: "error" },      // which client?
      
      // ── VAT NIGHTMARE ────
      { name: "vat_return_Q1_2024.pdf",                  fileType: "pdf", path: "/Drive/",                                        processingStatus: "discovered" },
      { name: "VAT Q1 2024 DRAFT.pdf",                   fileType: "pdf", path: "/Drive/Finance/VAT/",                            processingStatus: "discovered" },  // duplicate?
      { name: "vat_return_Q2_2024_draft.pdf",            fileType: "pdf", path: "/Drive/Desktop/",                                processingStatus: "discovered" },
      { name: "vat_Q2_AMENDED.pdf",                      fileType: "pdf", path: "/Drive/Old Docs/Backup/",                        processingStatus: "discovered" },  // which is correct?
      { name: "VAT Return 2024-Q2 FINAL.pdf",            fileType: "pdf", path: "/Drive/Finance/VAT/2024/",                       processingStatus: "discovered" },  // third version!
      { name: "Q3_vat_2023.pdf",                         fileType: "pdf", path: "/Drive/Archive/2023/Tax/",                       processingStatus: "discovered" },
      
      // ── SPREADSHEET HELL ────
      { name: "trial_balance_2024.xlsx",                 fileType: "spreadsheet", path: "/Drive/Finance/",                        processingStatus: "processing" },
      { name: "trial_balance_2024_COPY.xlsx",            fileType: "spreadsheet", path: "/Drive/Finance/Backup/March/",           processingStatus: "discovered" },
      { name: "Trial Balance 2024 v2.xlsx",              fileType: "spreadsheet", path: "/Drive/Desktop/John's Stuff/",           processingStatus: "discovered" },
      { name: "PnL_2023.xlsx",                           fileType: "spreadsheet", path: "/Drive/Finance/",                        processingStatus: "processed"  },
      { name: "P&L 2023 FINAL.xlsx",                     fileType: "spreadsheet", path: "/Drive/Archive/2023/",                   processingStatus: "discovered" },  // duplicate?
      { name: "cashflow_forecast_v1.xlsx",               fileType: "spreadsheet", path: "/Drive/Finance/Planning/",               processingStatus: "discovered" },
      { name: "cashflow_forecast_v2.xlsx",               fileType: "spreadsheet", path: "/Drive/Finance/Planning/Old versions/",  processingStatus: "discovered" },
      { name: "cashflow_forecast_v3_FINAL.xlsx",         fileType: "spreadsheet", path: "/Drive/Desktop/",                        processingStatus: "discovered" },
      { name: "cashflow forecast FINAL FINAL.xlsx",      fileType: "spreadsheet", path: "/Drive/",                                processingStatus: "discovered" },  // which is latest?
      { name: "Budget 2024.xlsx",                        fileType: "spreadsheet", path: "/Drive/Finance/",                        processingStatus: "discovered" },
      { name: "budget_2024_revised.xlsx",                fileType: "spreadsheet", path: "/Drive/Sarah's Files/Planning/",         processingStatus: "discovered" },
      
      // ── CLIENT DOCS MESS ────
      { name: "engagement_letter_acme.docx",             fileType: "document", path: "/Drive/Clients/",                           processingStatus: "processed"  },
      { name: "Engagement Letter - Acme Ltd.docx",       fileType: "document", path: "/Drive/Sarah's Files/Clients/Acme/",        processingStatus: "discovered" },  // duplicate
      { name: "engagement_letter_brightfield.docx",      fileType: "document", path: "/Drive/Clients/Brightfield/",               processingStatus: "processing" },
      { name: "EL - brightfield - 2024.docx",            fileType: "document", path: "/Drive/Desktop/To Send/",                   processingStatus: "discovered" },
      
      // ── REPORTS & PRESENTATIONS ────
      { name: "board_report_Q3.pptx",                    fileType: "presentation", path: "/Drive/Board/",                         processingStatus: "discovered" },
      { name: "Board Report Q3 2023.pptx",               fileType: "presentation", path: "/Drive/Archive/2023/Board Meetings/",   processingStatus: "discovered" },
      { name: "management_accounts_mar24.xlsx",          fileType: "spreadsheet", path: "/Drive/Finance/Reporting/",             processingStatus: "discovered" },
      { name: "Mgmt Accts March 2024.xlsx",              fileType: "spreadsheet", path: "/Drive/Desktop/John's Stuff/",           processingStatus: "discovered" },
      
      // ── COMPLIANCE SCATTERED ────
      { name: "HMRC_correspondence_jan.pdf",             fileType: "pdf", path: "/Drive/Desktop/",                                processingStatus: "discovered" },
      { name: "HMRC_correspondence_feb.pdf",             fileType: "pdf", path: "/Drive/Old Docs/Inbox/",                         processingStatus: "discovered" },
      { name: "hmrc letter march 2024.pdf",              fileType: "pdf", path: "/Drive/Sarah's Files/Tax/HMRC/",                 processingStatus: "discovered" },
      { name: "Copy of HMRC letter march 2024.pdf",      fileType: "pdf", path: "/Drive/Desktop/To Read/",                       processingStatus: "discovered" },
      
      // ── HR STUFF (vague folder name) ────
      { name: "staff_expenses_march.xlsx",               fileType: "spreadsheet", path: "/Drive/HR stuff/",                       processingStatus: "discovered" },
      { name: "Expenses - March 24.xlsx",                fileType: "spreadsheet", path: "/Drive/Finance/Expenses/",               processingStatus: "discovered" },
      { name: "payroll_summary.xlsx",                    fileType: "spreadsheet", path: "/Drive/HR stuff/Payroll/",               processingStatus: "discovered" },
      { name: "Payroll March 2024.xlsx",                 fileType: "spreadsheet", path: "/Drive/Desktop/Confidential/",           processingStatus: "discovered" },
      
      // ── MYSTERY & JUNK FILES ────
      { name: "Untitled document.docx",                  fileType: "document", path: "/Drive/",                                   processingStatus: "error"      },
      { name: "Untitled spreadsheet (3).xlsx",           fileType: "spreadsheet", path: "/Drive/Desktop/",                        processingStatus: "error"      },
      { name: "scan0042.pdf",                            fileType: "pdf", path: "/Drive/Scans/",                                  processingStatus: "error"      },
      { name: "scan0043.pdf",                            fileType: "pdf", path: "/Drive/Scans/March/",                            processingStatus: "error"      },
      { name: "IMG_2847.jpg",                            fileType: "image", path: "/Drive/Desktop/Screenshots/",                  processingStatus: "discovered" },
      { name: "Copy of Copy of notes.docx",              fileType: "document", path: "/Drive/",                                   processingStatus: "discovered" },
      { name: "New folder/temp.xlsx",                    fileType: "spreadsheet", path: "/Drive/Desktop/New folder/",             processingStatus: "discovered" },
      { name: "IMPORTANT.pdf",                           fileType: "pdf", path: "/Drive/Desktop/",                                processingStatus: "discovered" },  // no context
      { name: "final_version_updated.docx",              fileType: "document", path: "/Drive/Desktop/",                           processingStatus: "discovered" },  // final of what?
    ] as const;

    const emailItems = [
      // ── EMAIL CHAOS - inconsistent subjects, nested threads ────
      { name: "Re: Q3 VAT query from HMRC",                    fileType: "email", path: "inbox",         processingStatus: "discovered" },
      { name: "Re: Re: Q3 VAT query from HMRC",                fileType: "email", path: "sent",          processingStatus: "discovered" },  // thread duplicate
      { name: "FW: Acme invoice dispute March",                fileType: "email", path: "inbox",         processingStatus: "discovered" },
      { name: "RE: FW: Acme invoice dispute March",            fileType: "email", path: "inbox/clients", processingStatus: "discovered" },
      { name: "RE: Engagement letter Brightfield",             fileType: "email", path: "sent",          processingStatus: "processing" },
      { name: "Fwd: Cashflow model - which version?",          fileType: "email", path: "inbox",         processingStatus: "discovered" },
      { name: "Re: Fwd: Cashflow model - which version??",     fileType: "email", path: "sent",          processingStatus: "discovered" },
      { name: "Payment reminder - ACME",                       fileType: "email", path: "sent",          processingStatus: "discovered" },
      { name: "Re: Payment reminder - ACME",                   fileType: "email", path: "inbox",         processingStatus: "discovered" },
      { name: "(no subject)",                                  fileType: "email", path: "inbox",         processingStatus: "error"      },  // mystery
      { name: "Quick question",                                fileType: "email", path: "inbox",         processingStatus: "error"      },  // no context
    ] as const;

    const dataItemIds: Id<"dataItems">[] = [];
    for (const item of rawItems) {
      const id = await ctx.db.insert("dataItems", {
        orgId: args.orgId,
        dataSourceId: gDrive,
        name: item.name,
        fileType: item.fileType,
        path: item.path,
        processingStatus: item.processingStatus,
      });
      dataItemIds.push(id);
    }
    for (const item of emailItems) {
      const id = await ctx.db.insert("dataItems", {
        orgId: args.orgId,
        dataSourceId: gmail,
        name: item.name,
        fileType: item.fileType,
        path: item.path,
        processingStatus: item.processingStatus,
      });
      dataItemIds.push(id);
    }

    // ── KB Nodes — WHY IS THIS MESSY? ────────────────────────────
    //
    // 1. DUPLICATE ENTITIES — The same real-world concept has been
    //    dumped as 2-3 separate nodes because the AI found them in
    //    different folders with different names (e.g. "Acme", "Acme Ltd",
    //    "Acme Ltd (2024)", "acme_stuff"). A human can tell these are
    //    the same client. An agent can't yet.
    //
    // 2. CRYPTIC / JUNK NAMES — Real Google Drives are full of
    //    "Untitled", "Copy of Copy of", "New folder (2)", "misc".
    //    These provide zero signal to the AI and create visual noise.
    //
    // 3. NO HIERARCHY — Everything is depth 0. Nothing is a child of
    //    anything else. The tree is completely flat because the agent
    //    hasn't run the "structure" phase yet.
    //
    // 4. EVERYTHING IS DRAFT — No human has verified anything. In the
    //    graph this means all nodes render in the same muted colour.
    //
    // 5. TANGLED LINKS — The agent created links by keyword-matching
    //    file names to node names. This creates a dense core where
    //    generic "hub" nodes (Finance, 2024, Misc) link to everything,
    //    plus circular references and contradictory edges.
    //
    // The visual result: a dense, tangled blob with no clear clusters,
    //   uniform colour, and node labels that overlap. The "after" state
    //   collapses 42 nodes into 12 clean ones with hierarchy + colour.

    const n = async (name: string, i: number) =>
      ctx.db.insert("knowledgeBaseNodes", {
        orgId: args.orgId, name, depth: 0, orderIndex: i, status: "draft",
      });

    // Domain concepts — duplicated 2-3x each as an AI would find them
    const n1  = await n("Finance", 0);
    const n2  = await n("Invoices", 1);
    const n3  = await n("Invoices (old)", 2);
    const n4  = await n("invoices_2024", 3);          // folder-name dump
    const n5  = await n("VAT", 4);
    const n6  = await n("VAT Returns", 5);
    const n7  = await n("vat_Q2_AMENDED", 6);         // raw file name as node
    const n8  = await n("VAT 2024", 7);
    const n9  = await n("Clients", 8);
    const n10 = await n("Acme", 9);
    const n11 = await n("Acme Ltd", 10);
    const n12 = await n("Acme Ltd (2024)", 11);
    const n13 = await n("acme_stuff", 12);            // folder dump
    const n14 = await n("Brightfield", 13);
    const n15 = await n("Brightfield Co", 14);
    const n16 = await n("brightfield_engagement", 15);// folder dump
    const n17 = await n("HMRC", 16);
    const n18 = await n("HMRC Comms", 17);
    const n19 = await n("hmrc_jan_feb", 18);          // folder dump
    const n20 = await n("Emails", 19);
    const n21 = await n("Email Attachments", 20);
    const n22 = await n("Expenses", 21);
    const n23 = await n("HR", 22);
    const n24 = await n("Payroll", 23);
    const n25 = await n("Staff", 24);
    const n26 = await n("Management Accounts", 25);
    const n27 = await n("Reports", 26);
    const n28 = await n("Board Reports", 27);
    const n29 = await n("Compliance", 28);
    // Junk / cryptic nodes — zero useful signal
    const n30 = await n("Misc", 29);
    const n31 = await n("Other", 30);
    const n32 = await n("Uncategorised", 31);
    const n33 = await n("New folder", 32);
    const n34 = await n("New folder (2)", 33);
    const n35 = await n("Copy of Finance", 34);
    const n36 = await n("Archive", 35);
    const n37 = await n("Old Stuff", 36);
    const n38 = await n("Scans", 37);
    const n39 = await n("scan0042", 38);              // individual scan as node
    const n40 = await n("Untitled", 39);
    const n41 = await n("Documents", 40);
    const n42 = await n("tmp", 41);

    // ── Links — WHY IS THIS A HAIRBALL? ────────────────────────────
    //
    // The agent linked nodes by keyword overlap. "Finance" mentions
    // invoices? Link. "2024" appears in "VAT 2024"? Link. "Misc"
    // mentions everything? Hub node. The result is:
    //
    //   - DENSE CORE: Finance, Misc, Emails all have 8+ connections
    //   - BROKEN CHAINS: VAT → VAT Returns → vat_Q2_AMENDED (disconnected end)
    //   - CONTRADICTIONS: Acme depends_on Invoices AND Invoices
    //     depends_on Acme (bidirectional — which is it?)
    //   - WRONG RELATIONSHIPS: "parent_of" used between peers,
    //     "depends_on" between unrelated things
    //   - ORPHANED NODES: "scan0042", "tmp", "Untitled" floating alone
    //   - ISLANDS: Some nodes form small disconnected clusters

    type R = "related_to" | "depends_on" | "see_also" | "parent_of";
    const links: Array<{ s: typeof n1; t: typeof n1; r: R }> = [
      // ── Dense hub: Finance links to 10 things ──
      { s: n1,  t: n2,  r: "parent_of" },
      { s: n1,  t: n5,  r: "parent_of" },
      { s: n1,  t: n22, r: "parent_of" },
      { s: n1,  t: n26, r: "parent_of" },
      { s: n1,  t: n24, r: "related_to" },
      { s: n1,  t: n27, r: "related_to" },
      { s: n1,  t: n28, r: "see_also" },
      { s: n1,  t: n8,  r: "related_to" },
      { s: n1,  t: n35, r: "related_to" },   // Finance → Copy of Finance (!!)
      { s: n1,  t: n29, r: "depends_on" },   // Finance depends on Compliance? wrong
      
      // ── Broken chains (no cycles) ──
      { s: n2,  t: n3,  r: "related_to" },   // Invoices → Invoices (old)
      { s: n3,  t: n4,  r: "related_to" },   // Invoices (old) → invoices_2024 [DEAD END]
      // invoices_2024 (n4) is ORPHANED - no links back!
      
      { s: n5,  t: n6,  r: "related_to" },   // VAT → VAT Returns
      { s: n6,  t: n7,  r: "related_to" },   // VAT Returns → vat_Q2_AMENDED [DEAD END]
      // vat_Q2_AMENDED (n7) is ORPHANED
      // VAT 2024 (n8) only has incoming link from Finance, no outgoing
      
      { s: n10, t: n11, r: "related_to" },   // Acme → Acme Ltd
      { s: n11, t: n12, r: "related_to" },   // Acme Ltd → Acme Ltd (2024) [DEAD END]
      // Acme Ltd (2024) (n12) is ORPHANED
      // acme_stuff (n13) is COMPLETELY ISOLATED
      
      { s: n14, t: n15, r: "related_to" },   // Brightfield → Brightfield Co [DEAD END]
      // Brightfield Co (n15) is ORPHANED
      // brightfield_engagement (n16) is COMPLETELY ISOLATED
      
      { s: n17, t: n18, r: "related_to" },   // HMRC → HMRC Comms [DEAD END]
      // HMRC Comms (n18) is ORPHANED
      // hmrc_jan_feb (n19) is COMPLETELY ISOLATED
      
      // ── Contradictory dependencies (kept for chaos) ──
      { s: n11, t: n2,  r: "depends_on" },   // Acme Ltd depends_on Invoices
      { s: n2,  t: n11, r: "depends_on" },   // Invoices depends_on Acme Ltd (CONTRADICTION)
      { s: n29, t: n5,  r: "depends_on" },   // Compliance depends_on VAT
      { s: n5,  t: n29, r: "depends_on" },   // VAT depends_on Compliance (CONTRADICTION)
      
      // ── Dense hub: Emails links to 7 things ──
      { s: n20, t: n17, r: "related_to" },
      { s: n20, t: n10, r: "related_to" },
      { s: n20, t: n15, r: "related_to" },
      { s: n20, t: n22, r: "related_to" },
      { s: n20, t: n5,  r: "related_to" },
      { s: n20, t: n21, r: "parent_of" },
      { s: n20, t: n2,  r: "see_also" },
      
      // ── Misc hub links to fewer things (reduced density) ──
      { s: n30, t: n31, r: "related_to" },   // Misc → Other
      { s: n30, t: n32, r: "related_to" },   // Misc → Uncategorised
      { s: n30, t: n38, r: "related_to" },   // Misc → Scans
      { s: n30, t: n36, r: "see_also" },     // Misc → Archive
      // Removed links to Untitled, tmp, Old Stuff, New folder
      
      // ── Small disconnected junk cluster ──
      { s: n31, t: n32, r: "related_to" },   // Other → Uncategorised [DEAD END]
      // Uncategorised (n32) is ORPHANED - no back link to Misc creates island!
      
      { s: n33, t: n34, r: "related_to" },   // New folder → New folder (2) [ISOLATED PAIR]
      // This pair floats alone - no connection to main graph
      
      { s: n36, t: n37, r: "related_to" },   // Archive → Old Stuff
      { s: n37, t: n3,  r: "related_to" },   // Old Stuff → Invoices (old) [connects back to main]
      
      { s: n38, t: n39, r: "parent_of" },    // Scans → scan0042 [DEAD END]
      // scan0042 (n39) is ORPHANED
      
      { s: n41, t: n20, r: "see_also" },     // Documents → Emails
      // Documents connects to main graph but many others don't
      
      // ── COMPLETELY ISOLATED NODES (no links at all) ──
      // n40 = "Untitled" - FLOATING ALONE
      // n42 = "tmp" - FLOATING ALONE
      
      // ── Cross-domain chaos ──
      { s: n9,  t: n10, r: "parent_of" },    // Clients → Acme
      { s: n9,  t: n14, r: "parent_of" },    // Clients → Brightfield
      { s: n22, t: n24, r: "related_to" },   // Expenses → Payroll
      { s: n23, t: n24, r: "related_to" },   // HR → Payroll
      { s: n23, t: n25, r: "related_to" },   // HR → Staff [DEAD END]
      // Staff (n25) is ORPHANED
      { s: n27, t: n26, r: "related_to" },   // Reports → Management Accounts
      { s: n27, t: n28, r: "related_to" },   // Reports → Board Reports
      { s: n28, t: n1,  r: "depends_on" },   // Board Reports → Finance
      { s: n26, t: n2,  r: "depends_on" },   // Mgmt Accounts → Invoices
      { s: n26, t: n22, r: "depends_on" },   // Mgmt Accounts → Expenses
      { s: n35, t: n2,  r: "parent_of" },    // Copy of Finance → Invoices (wrong!)
      { s: n35, t: n5,  r: "parent_of" },    // Copy of Finance → VAT (wrong!)
      { s: n21, t: n41, r: "related_to" },   // Email Attachments → Documents
      { s: n21, t: n38, r: "related_to" },   // Email Attachments → Scans
      { s: n29, t: n17, r: "related_to" },   // Compliance → HMRC
      { s: n17, t: n20, r: "see_also" },     // HMRC → Emails
    ];

    for (const link of links) {
      await ctx.db.insert("knowledgeBaseLinks", {
        orgId: args.orgId, sourceNodeId: link.s, targetNodeId: link.t, relationship: link.r,
      });
    }

    // ── Agent Job — currently running ──────────────────────────────
    const exploreJob = await ctx.db.insert("agentJobs", {
      orgId: args.orgId,
      jobType: "explore",
      status: "running",
      progressPercent: 62,
      startedAt: now - 1000 * 60 * 8,
    });

    // ── Agent Messages — live feed showing problems found ──────────
    const messages = [
      { messageType: "info",      content: "Connected to Google Drive. Scanning 4 top-level folders..." },
      { messageType: "discovery", content: "Found 20 files across 8 folders. Beginning classification." },
      { messageType: "warning",   content: "2 files named similarly: 'cashflow_forecast_v1.xlsx' and 'cashflow_forecast_v3_FINAL.xlsx'. Cannot determine canonical version." },
      { messageType: "warning",   content: "Duplicate detected: 'trial_balance_2024.xlsx' and 'trial_balance_2024_COPY.xlsx' appear identical." },
      { messageType: "warning",   content: "'vat_Q2_AMENDED.pdf' and 'vat_return_Q2_2024_draft.pdf' both reference Q2 VAT. Conflict — different figures." },
      { messageType: "error",     content: "Cannot read 'scan0042.pdf' — file appears to be a blank scan with no extractable text." },
      { messageType: "error",     content: "Cannot read 'Untitled document.docx' — file is empty." },
      { messageType: "warning",   content: "Outlook connection failed (OAuth expired). 0 emails retrieved from client comms account." },
      { messageType: "info",      content: "Identified 7 candidate KB nodes. Hierarchy unclear — multiple overlapping categories found." },
      { messageType: "discovery", content: "Found 4 emails in Gmail inbox related to invoice disputes and HMRC queries." },
    ] as const;

    for (const msg of messages) {
      await ctx.db.insert("agentMessages", {
        orgId: args.orgId,
        jobId: exploreJob,
        messageType: msg.messageType,
        content: msg.content,
      });
    }

    // ── Verification Questions — AI already surfacing ambiguities ──
    await ctx.db.insert("verificationQuestions", {
      orgId: args.orgId,
      questionText: "We found two Q2 VAT files: 'vat_return_Q2_2024_draft.pdf' (£84,200) and 'vat_Q2_AMENDED.pdf' (£91,500). Which figure is correct?",
      questionType: "conflict",
      options: [
        { label: "£84,200 (draft)", description: "The original draft figure" },
        { label: "£91,500 (amended)", description: "The amended figure — likely the correct one" },
        { label: "Neither — I'll provide the correct figure", description: "Manually enter the correct amount" },
      ],
      status: "pending",
      aiConfidence: 0.31,
    });

    await ctx.db.insert("verificationQuestions", {
      orgId: args.orgId,
      questionText: "The column header 'Ref' appears in trial_balance_2024.xlsx. Does it refer to (a) invoice reference, (b) client account code, or (c) internal ledger ID?",
      questionType: "disambiguation",
      options: [
        { label: "Invoice reference" },
        { label: "Client account code" },
        { label: "Internal ledger ID" },
      ],
      status: "pending",
      aiConfidence: 0.24,
    });

    await ctx.db.insert("verificationQuestions", {
      orgId: args.orgId,
      questionText: "We found 3 files related to cashflow forecasts. Which should be treated as the canonical version?",
      questionType: "disambiguation",
      options: [
        { label: "cashflow_forecast_v1.xlsx", description: "Created January 2024" },
        { label: "cashflow_forecast_v3_FINAL.xlsx", description: "Created March 2024 — probably most recent" },
        { label: "Both — they cover different periods" },
      ],
      status: "pending",
      aiConfidence: 0.45,
    });

    return {
      message: "Messy demo state seeded for Hartley & Associates LLP",
      nodesCreated: 42,
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// CLEAN — the "after" state
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inserts the "after" state — same firm, same data, but now structured.
 * Phase: verify — the agent has organised everything, duplicates resolved,
 * hierarchy clear, cross-links rich. The graph looks clean and clustered.
 *
 * Run clearDemo first, then insertDemoClean to show the after state.
 *
 * Visual characteristics in reagraph:
 *   - Nodes clustered into clear groups (Finance, Clients, Compliance)
 *   - Mix of "verified" (bright) and "draft" (muted) nodes
 *   - Rich cross-links between domains → graph has visible structure
 *   - Completed agent job
 *   - Verification questions answered
 */
export const insertDemoClean = mutation({
  args: { orgId: v.id("organizations") },
  returns: v.object({ message: v.string(), nodesCreated: v.number() }),
  handler: async (ctx, args) => {
    const now = Date.now();

    // ── Data Sources — all connected ───────────────────────────────
    const gDrive = await ctx.db.insert("dataSources", {
      orgId: args.orgId,
      provider: "google_drive",
      label: "Hartley Main Drive",
      connectionStatus: "connected",
      lastSyncedAt: now - 1000 * 60 * 2,
    });

    const gmail = await ctx.db.insert("dataSources", {
      orgId: args.orgId,
      provider: "gmail",
      label: "Partners Gmail",
      connectionStatus: "connected",
      lastSyncedAt: now - 1000 * 60 * 2,
    });

    // ── Data Items — all processed ─────────────────────────────────
    // Duplicates resolved, everything classified
    const rawItems = [
      { name: "Invoice — Acme Ltd — March 2024",         fileType: "pdf",          path: "/Finance/Invoices/2024/Q1/", processingStatus: "processed" },
      { name: "Invoice — Acme Ltd — April 2024",         fileType: "pdf",          path: "/Finance/Invoices/2024/Q2/", processingStatus: "processed" },
      { name: "Invoice — Acme Ltd — February 2024",      fileType: "pdf",          path: "/Finance/Invoices/2024/Q1/", processingStatus: "processed" },
      { name: "VAT Return Q1 2024",                       fileType: "pdf",          path: "/Finance/VAT Filings/",      processingStatus: "processed" },
      { name: "VAT Return Q2 2024 (Amended — £91,500)",  fileType: "pdf",          path: "/Finance/VAT Filings/",      processingStatus: "processed" },
      { name: "Trial Balance 2024",                       fileType: "spreadsheet",  path: "/Finance/Management Accounts/", processingStatus: "processed" },
      { name: "P&L 2023",                                 fileType: "spreadsheet",  path: "/Finance/Management Accounts/", processingStatus: "processed" },
      { name: "Cashflow Forecast 2024 (v3 — canonical)", fileType: "spreadsheet",  path: "/Finance/Management Accounts/", processingStatus: "processed" },
      { name: "Engagement Letter — Acme Ltd",            fileType: "document",     path: "/Clients/Acme Ltd/",         processingStatus: "processed" },
      { name: "Engagement Letter — Brightfield Co",      fileType: "document",     path: "/Clients/Brightfield Co/",   processingStatus: "processed" },
      { name: "Board Report Q3 2024",                     fileType: "presentation", path: "/Finance/Reports/",          processingStatus: "processed" },
      { name: "HMRC Correspondence — January 2024",      fileType: "pdf",          path: "/Compliance/HMRC/",          processingStatus: "processed" },
      { name: "HMRC Correspondence — February 2024",     fileType: "pdf",          path: "/Compliance/HMRC/",          processingStatus: "processed" },
      { name: "Staff Expenses — March 2024",             fileType: "spreadsheet",  path: "/Finance/Expenses/",         processingStatus: "processed" },
      { name: "Payroll Summary 2024",                     fileType: "spreadsheet",  path: "/Finance/Expenses/",         processingStatus: "processed" },
    ] as const;

    const emailItems = [
      { name: "HMRC: VAT Q3 query",                      fileType: "email", path: "/Compliance/HMRC/",          processingStatus: "processed" },
      { name: "Acme Ltd: Invoice dispute — March",       fileType: "email", path: "/Clients/Acme Ltd/Comms/",   processingStatus: "processed" },
      { name: "Brightfield Co: Engagement letter signed",fileType: "email", path: "/Clients/Brightfield Co/",   processingStatus: "processed" },
      { name: "Internal: Cashflow version clarification",fileType: "email", path: "/Finance/Management Accounts/", processingStatus: "processed" },
    ] as const;

    const driveItemIds: Id<"dataItems">[] = [];
    for (const item of rawItems) {
      const id = await ctx.db.insert("dataItems", {
        orgId: args.orgId,
        dataSourceId: gDrive,
        name: item.name,
        fileType: item.fileType,
        path: item.path,
        processingStatus: item.processingStatus,
        previewSnippet: `Processed and classified by agent. Canonical version confirmed.`,
      });
      driveItemIds.push(id);
    }

    const emailItemIds: Id<"dataItems">[] = [];
    for (const item of emailItems) {
      const id = await ctx.db.insert("dataItems", {
        orgId: args.orgId,
        dataSourceId: gmail,
        name: item.name,
        fileType: item.fileType,
        path: item.path,
        processingStatus: item.processingStatus,
      });
      emailItemIds.push(id);
    }

    // ── KB Nodes — clean hierarchy, READMEs, proper depth ─────────

    // Root nodes
    const finance = await ctx.db.insert("knowledgeBaseNodes", {
      orgId: args.orgId,
      name: "Finance",
      depth: 0, orderIndex: 0, status: "verified",
      readme: "All financial records for Hartley & Associates LLP. Covers invoices, VAT filings, management accounts, and expenses. Start here for any financial query.",
    });

    const clients = await ctx.db.insert("knowledgeBaseNodes", {
      orgId: args.orgId,
      name: "Clients",
      depth: 0, orderIndex: 1, status: "verified",
      readme: "Client records, engagement letters, and correspondence. Each client has its own subfolder. Cross-references to Finance/Invoices for billing history.",
    });

    const compliance = await ctx.db.insert("knowledgeBaseNodes", {
      orgId: args.orgId,
      name: "Compliance",
      depth: 0, orderIndex: 2, status: "verified",
      readme: "Regulatory and HMRC-related documents. Includes all HMRC correspondence and filings. Cross-references to Finance/VAT Filings.",
    });

    // Finance children
    const invoices = await ctx.db.insert("knowledgeBaseNodes", {
      orgId: args.orgId,
      parentId: finance,
      name: "Invoices",
      depth: 1, orderIndex: 0, status: "verified",
      readme: "Client invoices organised by year and quarter. All duplicates resolved. See Clients section for engagement context.",
    });

    const vatFilings = await ctx.db.insert("knowledgeBaseNodes", {
      orgId: args.orgId,
      parentId: finance,
      name: "VAT Filings",
      depth: 1, orderIndex: 1, status: "verified",
      readme: "VAT returns by quarter. Note: Q2 2024 uses the amended figure of £91,500 (confirmed by user). Depends on Invoices and Expenses.",
    });

    const managementAccounts = await ctx.db.insert("knowledgeBaseNodes", {
      orgId: args.orgId,
      parentId: finance,
      name: "Management Accounts",
      depth: 1, orderIndex: 2, status: "verified",
      readme: "Trial balance, P&L, and cashflow forecasts. Canonical cashflow: v3_FINAL (March 2024). Cross-reference with Invoices for revenue figures.",
    });

    const expenses = await ctx.db.insert("knowledgeBaseNodes", {
      orgId: args.orgId,
      parentId: finance,
      name: "Expenses",
      depth: 1, orderIndex: 3, status: "draft",
      readme: "Staff expenses and payroll summaries. Feeds into VAT Filings (input VAT) and Management Accounts.",
    });

    // Invoices children (depth 2)
    const invoices2024 = await ctx.db.insert("knowledgeBaseNodes", {
      orgId: args.orgId,
      parentId: invoices,
      name: "2024 Invoices",
      depth: 2, orderIndex: 0, status: "verified",
      readme: "All 2024 client invoices. Q1: 3 invoices (Acme Ltd). Q2: 1 invoice (Acme Ltd).",
    });

    // Clients children
    const acme = await ctx.db.insert("knowledgeBaseNodes", {
      orgId: args.orgId,
      parentId: clients,
      name: "Acme Ltd",
      depth: 1, orderIndex: 0, status: "verified",
      readme: "Acme Ltd client file. Engagement letter signed Jan 2024. Active invoice dispute on March invoice — see email thread.",
    });

    const brightfield = await ctx.db.insert("knowledgeBaseNodes", {
      orgId: args.orgId,
      parentId: clients,
      name: "Brightfield Co",
      depth: 1, orderIndex: 1, status: "draft",
      readme: "Brightfield Co client file. Engagement letter signed February 2024. No outstanding disputes.",
    });

    // Compliance children
    const hmrc = await ctx.db.insert("knowledgeBaseNodes", {
      orgId: args.orgId,
      parentId: compliance,
      name: "HMRC Correspondence",
      depth: 1, orderIndex: 0, status: "verified",
      readme: "All inbound and outbound HMRC correspondence. Q3 VAT query currently open — see email. Depends on VAT Filings for supporting data.",
    });

    // ── Cross-links — rich graph edges across the tree ─────────────

    // VAT depends on Invoices and Expenses (input/output VAT)
    await ctx.db.insert("knowledgeBaseLinks", {
      orgId: args.orgId, sourceNodeId: vatFilings, targetNodeId: invoices, relationship: "depends_on",
    });
    await ctx.db.insert("knowledgeBaseLinks", {
      orgId: args.orgId, sourceNodeId: vatFilings, targetNodeId: expenses, relationship: "depends_on",
    });

    // Management Accounts references Invoices for revenue
    await ctx.db.insert("knowledgeBaseLinks", {
      orgId: args.orgId, sourceNodeId: managementAccounts, targetNodeId: invoices, relationship: "depends_on",
    });
    await ctx.db.insert("knowledgeBaseLinks", {
      orgId: args.orgId, sourceNodeId: managementAccounts, targetNodeId: expenses, relationship: "depends_on",
    });

    // Acme client file is related to their invoices
    await ctx.db.insert("knowledgeBaseLinks", {
      orgId: args.orgId, sourceNodeId: acme, targetNodeId: invoices2024, relationship: "related_to",
    });

    // HMRC correspondence depends on VAT filings
    await ctx.db.insert("knowledgeBaseLinks", {
      orgId: args.orgId, sourceNodeId: hmrc, targetNodeId: vatFilings, relationship: "depends_on",
    });

    // Compliance cross-references client engagement letters
    await ctx.db.insert("knowledgeBaseLinks", {
      orgId: args.orgId, sourceNodeId: compliance, targetNodeId: clients, relationship: "see_also",
    });

    // Brightfield related to Acme (same engagement type)
    await ctx.db.insert("knowledgeBaseLinks", {
      orgId: args.orgId, sourceNodeId: brightfield, targetNodeId: acme, relationship: "related_to",
    });

    // ── Map data items into KB nodes ───────────────────────────────
    // Invoice PDFs → invoices2024 node
    for (let i = 0; i < 3; i++) {
      await ctx.db.insert("nodeDataItems", {
        nodeId: invoices2024,
        dataItemId: driveItemIds[i],
        relevanceScore: 0.95,
      });
    }
    // VAT PDFs → vatFilings node
    await ctx.db.insert("nodeDataItems", { nodeId: vatFilings, dataItemId: driveItemIds[3], relevanceScore: 0.98 });
    await ctx.db.insert("nodeDataItems", { nodeId: vatFilings, dataItemId: driveItemIds[4], relevanceScore: 0.98 });
    // Management accounts → managementAccounts node
    await ctx.db.insert("nodeDataItems", { nodeId: managementAccounts, dataItemId: driveItemIds[5], relevanceScore: 0.92 });
    await ctx.db.insert("nodeDataItems", { nodeId: managementAccounts, dataItemId: driveItemIds[6], relevanceScore: 0.91 });
    await ctx.db.insert("nodeDataItems", { nodeId: managementAccounts, dataItemId: driveItemIds[7], relevanceScore: 0.94 });
    // Engagement letters → respective client nodes
    await ctx.db.insert("nodeDataItems", { nodeId: acme, dataItemId: driveItemIds[8], relevanceScore: 0.99 });
    await ctx.db.insert("nodeDataItems", { nodeId: brightfield, dataItemId: driveItemIds[9], relevanceScore: 0.99 });
    // HMRC correspondence → hmrc node
    await ctx.db.insert("nodeDataItems", { nodeId: hmrc, dataItemId: driveItemIds[11], relevanceScore: 0.97 });
    await ctx.db.insert("nodeDataItems", { nodeId: hmrc, dataItemId: driveItemIds[12], relevanceScore: 0.97 });
    // HMRC email → hmrc node
    await ctx.db.insert("nodeDataItems", { nodeId: hmrc, dataItemId: emailItemIds[0], relevanceScore: 0.95 });
    // Acme dispute email → acme node
    await ctx.db.insert("nodeDataItems", { nodeId: acme, dataItemId: emailItemIds[1], relevanceScore: 0.93 });

    // ── Agent Job — completed ──────────────────────────────────────
    const structureJob = await ctx.db.insert("agentJobs", {
      orgId: args.orgId,
      jobType: "structure",
      status: "completed",
      progressPercent: 100,
      startedAt: now - 1000 * 60 * 20,
      completedAt: now - 1000 * 60 * 3,
    });

    // ── Agent Messages — success story ─────────────────────────────
    const cleanMessages = [
      { messageType: "info",      content: "Structure job started. Processing 24 discovered items." },
      { messageType: "info",      content: "Resolving duplicate: selecting 'cashflow_forecast_v3_FINAL.xlsx' as canonical version." },
      { messageType: "info",      content: "Conflict resolved via user input: Q2 VAT figure confirmed as £91,500 (amended)." },
      { messageType: "discovery", content: "Built Finance hierarchy: Invoices → 2024 Invoices, VAT Filings, Management Accounts, Expenses." },
      { messageType: "discovery", content: "Built Clients hierarchy: Acme Ltd, Brightfield Co. 2 engagement letters mapped." },
      { messageType: "discovery", content: "Built Compliance hierarchy: HMRC Correspondence. 2 PDF letters + 1 email thread mapped." },
      { messageType: "discovery", content: "Created 8 cross-links: VAT depends_on Invoices, VAT depends_on Expenses, HMRC depends_on VAT, and 5 more." },
      { messageType: "info",      content: "Generated READMEs for 12 nodes. 10 marked verified, 2 pending human review." },
      { messageType: "info",      content: "Structure complete. Knowledge base ready for verification phase." },
    ] as const;

    for (const msg of cleanMessages) {
      await ctx.db.insert("agentMessages", {
        orgId: args.orgId,
        jobId: structureJob,
        messageType: msg.messageType,
        content: msg.content,
      });
    }

    // ── Verification Questions — mostly answered ───────────────────
    await ctx.db.insert("verificationQuestions", {
      orgId: args.orgId,
      relatedNodeId: vatFilings,
      questionText: "We found two Q2 VAT files with different figures. Which is correct: £84,200 (draft) or £91,500 (amended)?",
      questionType: "conflict",
      options: [
        { label: "£84,200 (draft)" },
        { label: "£91,500 (amended)", description: "The amended figure" },
        { label: "Neither — I'll provide the correct figure" },
      ],
      status: "answered",
      answer: "£91,500 (amended)",
      aiConfidence: 0.31,
    });

    await ctx.db.insert("verificationQuestions", {
      orgId: args.orgId,
      relatedNodeId: managementAccounts,
      questionText: "The 'Ref' column in trial_balance_2024.xlsx — does it refer to invoice reference, client account code, or internal ledger ID?",
      questionType: "disambiguation",
      options: [
        { label: "Invoice reference" },
        { label: "Client account code" },
        { label: "Internal ledger ID" },
      ],
      status: "answered",
      answer: "Client account code",
      aiConfidence: 0.24,
    });

    await ctx.db.insert("verificationQuestions", {
      orgId: args.orgId,
      relatedNodeId: expenses,
      questionText: "Should staff expenses and payroll sit under Finance/Expenses, or should they have their own top-level HR section?",
      questionType: "classification",
      options: [
        { label: "Finance/Expenses — keep it simple" },
        { label: "Create a new HR section at the root level" },
      ],
      status: "pending",
      aiConfidence: 0.62,
    });

    return {
      message: "Clean demo state seeded for Hartley & Associates LLP",
      nodesCreated: 12,
    };
  },
});
