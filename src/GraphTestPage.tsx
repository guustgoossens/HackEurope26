import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import { KnowledgeGraphView } from './components/KnowledgeGraphView';
import { GraphNodeDetail } from './components/GraphNodeDetail';

export default function GraphTestPage() {
  const [selectedNodeId, setSelectedNodeId] = useState<Id<'knowledgeBaseNodes'> | null>(null);
  
  // Get all organizations to select from
  const orgs = useQuery(api.organizations?.list) || [];
  const [selectedOrgId, setSelectedOrgId] = useState<Id<'organizations'> | null>(null);
  
  // For creating a test organization
  const createOrg = useMutation(api.organizations?.create);
  
  const handleCreateTestOrg = async () => {
    if (createOrg) {
      const orgId = await createOrg({
        name: 'Test Accounting Firm',
        industry: 'accounting',
        phase: 'structure',
        description: 'Demo organization for testing knowledge graph',
      });
      setSelectedOrgId(orgId);
    }
  };

  return (
    <div className="min-h-screen bg-light dark:bg-dark p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Knowledge Graph Test</h1>
        
        {/* Organization Selection */}
        <div className="mb-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">Step 1: Select or Create Organization</h2>
          
          {orgs.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-slate-600 dark:text-slate-400">Select an organization:</p>
              <select
                className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600"
                value={selectedOrgId || ''}
                onChange={(e) => setSelectedOrgId(e.target.value as Id<'organizations'>)}
              >
                <option value="">-- Select an organization --</option>
                {orgs.map((org: any) => (
                  <option key={org._id} value={org._id}>
                    {org.name} ({org.industry})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">No organizations found.</p>
          )}
          
          <button
            onClick={handleCreateTestOrg}
            className="mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Create Test Organization
          </button>
        </div>

        {/* Seed Data Button */}
        {selectedOrgId && (
          <div className="mb-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <h2 className="text-lg font-semibold mb-3">Step 2: Seed Demo Data</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              This will create 9 knowledge base nodes and 11 links for testing.
            </p>
            <button
              onClick={async () => {
                const seed = useMutation(api.seed?.seedAccountingFirmKB);
                if (seed) {
                  await seed({ orgId: selectedOrgId });
                  alert('Demo data created!');
                }
              }}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Seed Demo Data
            </button>
            <p className="text-xs text-slate-500 mt-2">
              Or go to Convex Dashboard → Functions → seed:seedAccountingFirmKB
            </p>
          </div>
        )}

        {/* Knowledge Graph */}
        {selectedOrgId ? (
          <div>
            <h2 className="text-lg font-semibold mb-3">Step 3: View Knowledge Graph</h2>
            <KnowledgeGraphView
              orgId={selectedOrgId}
              onNodeClick={setSelectedNodeId}
            />
          </div>
        ) : (
          <div className="p-8 bg-slate-100 dark:bg-slate-800 rounded-lg text-center">
            <p className="text-slate-600 dark:text-slate-400">
              Select or create an organization to view the knowledge graph
            </p>
          </div>
        )}

        {/* Node Detail Panel */}
        <GraphNodeDetail
          nodeId={selectedNodeId}
          onClose={() => setSelectedNodeId(null)}
        />
      </div>
    </div>
  );
}
