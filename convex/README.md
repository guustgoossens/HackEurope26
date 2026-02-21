# Welcome to your Convex functions directory!

Write your Convex functions here.
See https://docs.convex.dev/functions for more.

## HackEurope26 Project Files

This directory contains the backend logic for an Agent-Ready Data Infrastructure platform:

- **`schema.ts`** - Database schema (see SCHEMA.md for full documentation)
- **`knowledgeGraph.ts`** - Queries for knowledge graph visualization
- **`seed.ts`** - Demo data seeding functions
- **`myFunctions.ts`** - Example queries and mutations
- **`auth.config.ts`** - WorkOS authentication configuration

### Knowledge Graph Queries

The `knowledgeGraph.ts` file provides real-time data for the force-directed graph visualization:

```ts
// Get all nodes and links for an organization
const graphData = useQuery(api.knowledgeGraph.getKnowledgeGraph, { orgId });

// Get detailed information about a specific node
const nodeDetails = useQuery(api.knowledgeGraph.getNodeDetails, { nodeId });
```

See `KNOWLEDGE_GRAPH_IMPLEMENTATION.md` in the project root for integration guide.

---

## Convex Basics

A query function that takes two arguments looks like:

```ts
// convex/myFunctions.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const myQueryFunction = query({
  // Validators for arguments.
  args: {
    first: v.number(),
    second: v.string(),
  },

  // Function implementation.
  handler: async (ctx, args) => {
    // Read the database as many times as you need here.
    // See https://docs.convex.dev/database/reading-data.
    const documents = await ctx.db.query("tablename").collect();

    // Arguments passed from the client are properties of the args object.
    console.log(args.first, args.second);

    // Write arbitrary JavaScript here: filter, aggregate, build derived data,
    // remove non-public properties, or create new objects.
    return documents;
  },
});
```

Using this query function in a React component looks like:

```ts
const data = useQuery(api.myFunctions.myQueryFunction, {
  first: 10,
  second: "hello",
});
```

A mutation function looks like:

```ts
// convex/myFunctions.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const myMutationFunction = mutation({
  // Validators for arguments.
  args: {
    first: v.string(),
    second: v.string(),
  },

  // Function implementation.
  handler: async (ctx, args) => {
    // Insert or modify documents in the database here.
    // Mutations can also read from the database like queries.
    // See https://docs.convex.dev/database/writing-data.
    const message = { body: args.first, author: args.second };
    const id = await ctx.db.insert("messages", message);

    // Optionally, return a value from your mutation.
    return await ctx.db.get("messages", id);
  },
});
```

Using this mutation function in a React component looks like:

```ts
const mutation = useMutation(api.myFunctions.myMutationFunction);
function handleButtonPress() {
  // fire and forget, the most common way to use mutations
  mutation({ first: "Hello!", second: "me" });
  // OR
  // use the result once the mutation has completed
  mutation({ first: "Hello!", second: "me" }).then((result) =>
    console.log(result),
  );
}
```

Use the Convex CLI to push your functions to a deployment. See everything
the Convex CLI can do by running `npx convex -h` in your project root
directory. To learn more, launch the docs with `npx convex docs`.
