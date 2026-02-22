# Pitch Bible

*(Moved from `docs/Pitch_notes_Emeric.md`)*

---

## 1. Pitch Presentation

### Opening (15 seconds)
"Every company wants AI agents. But when you deploy an agent
into a real company, it knows nothing. Zero context, zero memory,
zero understanding of how this specific business works.
It's like hiring a brilliant consultant and locking them
in a room with no files, no colleagues, no history."

### The Problem (20 seconds)
Company data is not ready for agents.
It's scattered across Gmail, Drive, Excel, legacy software,
tools built by contractors no one remembers.
No structure. No hierarchy. No navigation layer.
Result: AI demos fail. Not because the models are bad —
because the data foundation doesn't exist.

### The Solution (20 seconds)
We build that foundation.
We connect to your existing tools, send agents to explore
what's there, and organize it into a hierarchical knowledge base —
verified by a human in the loop.
The output: a structured, navigable KB that any agent
can work on with precision.
Not a search tool. Not another chatbot.
The data infrastructure that makes agents actually work.

### The Demo (40 seconds)
[Live: Screen 1 — chaos]
"Here's a real French accounting firm.
Emails, Drive, accounting entries, Excel files.
Total chaos. No agent can work here."

[Live: Screen 2 — graph building]
"Our agents explore. They map relationships.
They build a knowledge structure —
Finance, Compliance, Clients, Operations —
in real time."

[Live: Screen 3 — verification questionnaire]
"When the agent hits an ambiguity it can't resolve alone,
it asks. Clean, structured, specific.
The human corrects the shape.
Not a black box — a collaboration."

[Live: Screen 2 again — final structured graph]
"The output: a verified knowledge base
any agent can navigate with precision."

### The Market (15 seconds)
"We start with French accounting firms.
19,000 cabinets, 3 million SME clients behind them,
all facing AI disruption, none ready for it.
But this problem — chaotic data, agents that can't work —
is the problem of every company.
We're building the infrastructure layer
that makes organizations agent-ready."

### The Close (10 seconds)
"The agentic workforce is arriving.
Companies that have clean, structured knowledge
will deploy it in days.
Companies that don't will spend months just getting ready.
We're the layer that closes that gap."

---

## 2. Q&A

### Q: How does this fit into the agentic landscape?

The shift: companies are moving from "we have AI tools" to "we have AI agents that work autonomously."

An agent executes a workflow — it navigates, decides, acts, and loops back. For that to work, the agent needs to know where things are, what they mean, how they relate.

Our KB is built for agent navigation — not for humans:
- Hierarchical structure, READMEs at every level
- Cross-references between domains, progressive disclosure
- MCP (Model Context Protocol) compatible by design
- Compatible with LangGraph, CrewAI, AutoGen as a retrieval layer

The "company brain" that persists across all agent deployments.

### Q: Why start with French accountants?

Four reasons that compound:

1. **Regulatory complexity creates data volume** — TVA, liasses fiscales, FEC, facturation électronique incoming
2. **Profession under acute AI pressure** — low-cost digital competitors (Dougs, Clementine) eating the bottom of the market
3. **Relationship-based sales** — one accountant manages 50-200 client files; win one cabinet, access their whole network
4. **Perfect beachhead** — small enough to move fast, regulated enough to care about data accuracy, painful enough to pay

### Q: What about industry-specific business logic?

The verification questionnaire captures it:
- Agent flags: "Ref column in 340 entries — invoice reference, client code, or internal ID?"
- Human resolves it once
- Resolution written into KB as a permanent rule
- Next agent already has the answer

Over time, KB accumulates institutional knowledge that used to live only in the head of a senior employee.

### Q: How do you handle onboarding?

Iterative, progressive, immediate value at each step:
- Connect one source (5 min) → data landscape visualization appears
- Agent builds first-draft KB on that source → 3-4 verification questions → KB updates in real time
- Add sources progressively → cross-references start appearing automatically

Never ask for everything upfront. Show value after each micro-step. The graph growing is intrinsically motivating.

---

## 3. Vision

**18 months:** Dominant tool for French accounting firms. Integrations with Pennylane, Cegid, Google Workspace, M365. Agent Forum accumulating cross-firm intelligence. First domain agents: compliance agent, client communication agent.

**3 years:** Adjacent professions (lawyers, notaires, financial advisors). Platform: third-party agents connect to our KB as a verified context source.

**Long-term:** The infrastructure layer for the agentic enterprise. What Stripe did for payments, we do for company knowledge.

---

## 4. Demo Flow — Exact Script

**[0:00]** "Here's Cabinet Dupont. 12 years of client files, emails, accounting entries. No structure. Every junior hire takes 3 months to find anything."

**[0:15]** "We connect. The agent starts exploring."
[Screen 1: data landscape appears — bubbles, volumes]

**[0:30]** "It maps what's there. 847 emails. 203 documents. 1,200 accounting entries."

**[0:45]** "Now it builds."
[Screen 2: graph starts populating — nodes appear, clusters form]
"Finance. Compliance. Clients. Operations. Each node is a folder with a README — context an agent can read and navigate."

**[1:10]** "It hits something it can't figure out alone."
[Screen 3: verification questionnaire]
"'This field is labeled Ref in 340 entries. Is it invoice reference, client code, or internal ID?' The accountant answers. One click."

**[1:25]** "The KB updates. Verified. Paradox-free."

**[1:40]** "Now any agent — compliance, email, client communication — can work on this data with precision. Not best-guess retrieval. Exact navigation."

**[1:55]** "This is what agent-ready looks like. We build it for every company."
