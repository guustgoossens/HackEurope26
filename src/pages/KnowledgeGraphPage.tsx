import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { KnowledgeGraphView } from '../components/KnowledgeGraphView';
import { GraphNodeDetail } from '../components/GraphNodeDetail';

export function KnowledgeGraphPage() {
  const [selectedNodeId, setSelectedNodeId] = useState<Id<'knowledgeBaseNodes'> | null>(null);

  // Get all organizations
  const organizations = useQuery(api.organizations.listMine);

  // Use first org, or fall back to the demo org created via CLI (no createdBy set)
  const DEMO_ORG_ID = 'k57392mvgy9p3hnk62eh0rkvax81kbkg' as Id<'organizations'>;
  const demoOrgId = organizations?.[0]?._id ?? DEMO_ORG_ID;

  return (
    <div className="relative min-h-screen">
      <header className="sticky top-0 z-10 bg-light dark:bg-dark p-4 border-b-2 border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold">Knowledge Graph</h1>
            <p className="text-sm text-slate-500">
              Navigate your organization's structured knowledge base
            </p>
          </div>
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto">
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Interactive Knowledge Graph</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            {!demoOrgId 
              ? "Create an organization first using the Convex dashboard at http://127.0.0.1:6790"
              : "Click and drag nodes to explore. Hover to see connections. Click a node to view details."}
          </p>
        </div>

        {demoOrgId ? (
          <KnowledgeGraphView
            orgId={demoOrgId}
            onNodeClick={(nodeId) => setSelectedNodeId(nodeId)}
          />
        ) : (
          <div className="bg-slate-100 dark:bg-slate-800 p-8 rounded-lg text-center">
            <p className="text-lg mb-4">No organization found</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Create an organization in the Convex dashboard, then run the seed mutation.
            </p>
          </div>
        )}

        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Legend - Node Status</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#4CAF50]"></div>
                <span>Verified - Human-approved knowledge</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#FFA500]"></div>
                <span>Draft - AI-generated, pending verification</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#9E9E9E]"></div>
                <span>Archived - Deprecated or outdated</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Legend - Relationships</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-[#FF6B6B]"></div>
                <span>Depends On (with arrow)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-[#4ECDC4]"></div>
                <span>Related To</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-[#95E1D3]"></div>
                <span>See Also</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-[#F3A683]"></div>
                <span>Parent Of</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Node Detail Panel */}
      <GraphNodeDetail
        nodeId={selectedNodeId}
        onClose={() => setSelectedNodeId(null)}
      />
    </div>
  );
}
