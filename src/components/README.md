# Knowledge Graph Visualization

This folder contains the implementation of the interactive knowledge graph visualization using `react-force-graph-2d`.

## Components

### `KnowledgeGraphView.tsx`
The main force-directed graph visualization component. Features:
- Real-time updates via Convex reactive queries
- Node coloring by status (verified/draft/archived) and depth
- Link coloring by relationship type (depends_on, related_to, see_also, parent_of)
- Hover effects to highlight connected nodes
- Click to select nodes
- Zoom and pan controls
- Auto-fit on load

### `GraphNodeDetail.tsx`
Side panel that displays detailed information about a selected node:
- Node status and depth
- README content
- Associated data items
- Outgoing and incoming links

### `KnowledgeGraphPage.tsx`
Full-page demo showing how to integrate the graph with a legend and controls.

## Convex Backend

### `convex/knowledgeGraph.ts`
Queries for the knowledge graph:
- `getKnowledgeGraph(orgId)` - Returns all nodes and links for an organization in react-force-graph format
- `getNodeDetails(nodeId)` - Returns detailed information about a specific node

## Usage

### Basic Integration

```tsx
import { KnowledgeGraphView } from './components/KnowledgeGraphView';
import { useState } from 'react';

function MyPage() {
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const orgId = 'your-org-id';

  return (
    <>
      <KnowledgeGraphView
        orgId={orgId}
        onNodeClick={(nodeId) => setSelectedNodeId(nodeId)}
      />
      <GraphNodeDetail
        nodeId={selectedNodeId}
        onClose={() => setSelectedNodeId(null)}
      />
    </>
  );
}
```

### Customization

The graph appearance can be customized by modifying the `nodeCanvasObject` and link styling props in `KnowledgeGraphView.tsx`.

**Node colors:**
- Verified: Green (#4CAF50)
- Draft: Orange (#FFA500)  
- Archived: Gray (#9E9E9E)

**Link colors:**
- Depends On: Red (#FF6B6B) with arrow
- Related To: Teal (#4ECDC4)
- See Also: Light teal (#95E1D3)
- Parent Of: Peach (#F3A683)

## Real-time Updates

The graph automatically updates when:
- New nodes are added by AI agents (Structure phase)
- Nodes are verified by humans (Verify phase)
- Relationships are created or modified

New draft nodes will pulse/glow to draw attention.

## Performance

For optimal performance with large graphs (100+ nodes):
- The cooldown ticks are set to 100 for faster settling
- Auto-zoom is delayed by 100ms to ensure data is loaded
- Node labels only show when zoomed in (globalScale > 0.8) or on hover

## Demo Data

To test the visualization, you can populate the database with sample nodes and links using the Convex dashboard or by creating seed functions.

Example:
```typescript
// In convex/seed.ts
export const seedKnowledgeBase = mutation({
  args: { orgId: v.id('organizations') },
  handler: async (ctx, args) => {
    const rootId = await ctx.db.insert('knowledgeBaseNodes', {
      orgId: args.orgId,
      name: 'Finance',
      depth: 0,
      orderIndex: 0,
      status: 'verified',
      readme: 'Root node for all financial documents and processes',
    });

    const childId = await ctx.db.insert('knowledgeBaseNodes', {
      orgId: args.orgId,
      parentId: rootId,
      name: 'Invoices',
      depth: 1,
      orderIndex: 0,
      status: 'draft',
      readme: 'Invoice management and tracking',
    });

    await ctx.db.insert('knowledgeBaseLinks', {
      orgId: args.orgId,
      sourceNodeId: rootId,
      targetNodeId: childId,
      relationship: 'parent_of',
    });
  },
});
```
