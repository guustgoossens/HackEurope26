// Vibe coded ideas for pitch and Q&A

# Pitch Bible — Hackathon

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

## 2. Pitch Q&A

### Q: How does this fit into the agentic landscape?

The shift happening right now: companies are moving from 
"we have AI tools" to "we have AI agents that work autonomously."

The difference is fundamental. A tool answers a question. 
An agent executes a workflow — it navigates, decides, acts, 
and loops back. For that to work, the agent needs to know 
where things are, what they mean, how they relate.

Our KB is built exactly for agent navigation — not for humans.
Hierarchical structure, READMEs at every level, 
cross-references between domains, progressive disclosure.
An agent can enter at the top, read the overview, 
drill into the relevant subfolder, and retrieve precisely.
No hallucination from context overload. No missed results 
from similarity search across a flat pile.

Integration with the agentic stack:
- MCP (Model Context Protocol) compatible by design — 
  any agent using MCP can connect to our KB as a context source
- Compatible with agent orchestration frameworks 
  (LangGraph, CrewAI, AutoGen) as a retrieval layer
- The KB becomes the "company brain" that persists 
  across all agent deployments — email agent, 
  compliance agent, client communication agent — 
  all drawing from the same verified source

The vision: as the agentic workforce matures, 
having a structured company KB won't be optional. 
It will be the prerequisite for deploying any agent at all. 
We're building that prerequisite now.

---

### Q: Why start with French accountants?

Four reasons that compound:

**1. Regulatory complexity creates data volume**
French accounting is among the most regulated in Europe — 
TVA, liasses fiscales, FEC, facturation électronique incoming.
Every regulation creates documents, declarations, 
correspondence. High volume = high need for structure.

**2. The profession is under acute AI pressure**
Low-cost digital competitors (Dougs, Clementine) 
are eating the bottom of the market.
Cabinets know they need to move upmarket into conseil — 
but they can't do that while drowning in administrative work.
AI is their escape route. But they're blocked by their data.

**3. Relationship-based sales = easier entry**
53% of SMEs have used the same accountant for 10+ years.
One accountant manages 50-200 client files.
If we win one cabinet, we get access to their entire client base.
The sales motion is: land one cabinet, expand through their network.

**4. Perfect beachhead profile**
Small enough to move fast (TPE, <10 people).
Sophisticated enough to understand the value.
Regulated enough to care about data accuracy and verification.
Painful enough to pay.

And behind the cabinet: the 3 million SMEs they serve.
Every client file is a future deployment of our KB.

---

### Q: What about industry-specific rules and business logic?

This is the hardest and most interesting part of the problem.

Generic AI tools fail on this because they don't know:
- That "Ref" in this cabinet means client code, not invoice ref
- That Q3 revenue in this firm always includes deferred billing
- That this specific client is billed differently because of a 
  legacy contract from 2019

This is exactly what our verification questionnaire captures.
The agent flags the ambiguity. The human resolves it.
That resolution gets written into the KB as a rule — 
permanently. The next agent that hits the same question 
already has the answer.

Over time, the KB accumulates the institutional knowledge 
that used to live only in the head of a senior employee.
It becomes the memory of the firm.

This is also our moat: the more a cabinet uses the system, 
the richer their KB becomes, and the harder it is to leave.

---

### Q: How do you handle onboarding — 
      making it engaging and not overwhelming?

The onboarding problem is real. 
Traditional data migration is a one-time traumatic event.
We do it differently — iterative, progressive, with 
immediate visible value at each step.

**Phase 1 — Connect (5 minutes)**
Connect one source. Just one. Gmail, or Drive, or Pennylane.
Immediate output: data landscape visualization — 
the agent shows you what's there. 
First "aha": "I had no idea I had 847 emails about VAT."

**Phase 2 — First structure (same session)**
Agent builds a first-draft KB on that one source.
Shows you the graph. Asks 3-4 verification questions.
You answer. The KB updates in real time.
The loop is fast, visual, and satisfying.

**Phase 3 — Expand progressively**
Add sources one by one. Each addition enriches the graph.
Cross-references start appearing automatically.
The KB grows visibly, measurably.

The UX principle: never ask for everything upfront.
Show value after each micro-step.
The graph is the feedback mechanism — 
watching it grow is intrinsically motivating.

This is also why the Obsidian-style visualization matters:
it's not just a demo gimmick — it's the core feedback loop 
of the product. You see your company knowledge 
becoming organized in real time.

---

## 3. Vision — Where This Goes

### 18 months
Dominant tool for French accounting firms.
Integrations with Pennylane, Cegid, Google Workspace, M365.
Agent Forum accumulating cross-firm operational intelligence.
First domain agents built on top: 
compliance agent, client communication agent.

### 3 years
Expand to adjacent professions: lawyers, notaires, 
financial advisors — all high-regulation, 
high-document-volume, high AI-pressure.
Platform play: third-party agents connect to our KB 
as a verified context source.

### Long-term
The infrastructure layer for the agentic enterprise.
Any company that wants to deploy an AI workforce 
starts here — because you can't deploy agents 
on top of chaos.
We're the data foundation that makes 
the agentic transformation possible.

The market comp: what Stripe did for payments 
(made the infrastructure invisible and universal), 
we do for company knowledge.

---

## 4. Demo Flow — Exact Script

**[0:00]** "Here's Cabinet Dupont. 
12 years of client files, emails, accounting entries. 
Typical French cabinet. No structure. 
Every junior hire takes 3 months to find anything."

**[0:15]** "We connect. 
The agent starts exploring."
[Screen 1: data landscape appears — bubbles, volumes]

**[0:30]** "It maps what's there. 
847 emails. 203 documents. 1,200 accounting entries.
Already more clarity than they had before."

**[0:45]** "Now it builds."
[Screen 2: graph starts populating — nodes appear, 
clusters form, edges connect]
"Finance. Compliance. Clients. Operations.
Each node is a folder with a README — 
context an agent can read and navigate."

**[1:10]** "It hits something it can't figure out alone."
[Screen 3: verification questionnaire]
"'This field is labeled Ref in 340 entries. 
Is it invoice reference, client code, or internal ID?'
The accountant answers. One click."

**[1:25]** "The KB updates. Verified. Paradox-free."
[Graph reorganizes, final clean state]

**[1:40]** "Now any agent — 
compliance, email, client communication — 
can work on this data with precision.
Not best-guess retrieval. Exact navigation."

**[1:55]** "This is what agent-ready looks like.
We build it for every company."