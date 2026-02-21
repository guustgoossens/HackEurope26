# Quick Start: Knowledge Graph

## 1. Start Convex (in terminal)
```bash
npx convex dev
```
Choose "Start without an account (run Convex locally)" when prompted.

## 2. Access Convex Dashboard
Open the URL shown in terminal (usually http://localhost:3000)

## 3. Create Organization
In the dashboard, go to "Data" → "organizations" → Click "Add Row"
```json
{
  "name": "Demo Accounting Firm",
  "industry": "accounting",
  "phase": "structure"
}
```
Copy the generated `_id` value.

## 4. Seed Demo Data
In dashboard, go to "Functions" → Find `seed:seedAccountingFirmKB`
Run with:
```json
{
  "orgId": "paste-your-org-id-here"
}
```

## 5. Update Your App
In `src/App.tsx`, replace the content with:

```tsx
import { useState } from 'react';
import { KnowledgeGraphView } from './components/KnowledgeGraphView';
import { GraphNodeDetail } from './components/GraphNodeDetail';
import { Id } from '../convex/_generated/dataModel';

export default function App() {
  const [selectedNodeId, setSelectedNodeId] = useState<Id<'knowledgeBaseNodes'> | null>(null);
  
  // Replace with your actual orgId from step 3
  const orgId = 'YOUR_ORG_ID_HERE' as Id<'organizations'>;

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-4">Knowledge Graph</h1>
      <KnowledgeGraphView
        orgId={orgId}
        onNodeClick={setSelectedNodeId}
      />
      <GraphNodeDetail
        nodeId={selectedNodeId}
        onClose={() => setSelectedNodeId(null)}
      />
    </div>
  );
}
```

## 6. Run Your App
```bash
npm run dev
```

Visit http://localhost:5173 and see your interactive graph! 🎉

## What to Try
- Hover over nodes to see connections
- Click nodes to see details in the side panel
- Drag nodes to rearrange
- Zoom and pan with mouse/trackpad
