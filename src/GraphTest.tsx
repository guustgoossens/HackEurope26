/**
 * STANDALONE GRAPH TEST PAGE
 * Accessible at http://localhost:5173/graph-test — no auth needed.
 * Hardcodes the demo client ID and renders all three graph types.
 * Delete this file after testing.
 */

import { ConvexProvider, ConvexReactClient, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import type { Id } from '../convex/_generated/dataModel';
import { useState } from 'react';
import { VisualizationGraph } from './components/VisualizationGraph';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

// The messy demo client (42 nodes, 4 contradictions)
const DEMO_CLIENT_ID = 'kn721r3ty78a9hxjwr3vp438w581kb94' as Id<'clients'>;

type GraphType = 'knowledge' | 'exploration' | 'contradictions';

function GraphTestInner() {
  const [type, setType] = useState<GraphType>('knowledge');

  const client = useQuery(api.clients.get, { id: DEMO_CLIENT_ID });

  return (
    <div style={{ background: '#0f172a', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Graph Test</h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            Client: {client?.name ?? '…'} · ID: {DEMO_CLIENT_ID}
          </p>
        </div>

        {/* Type switcher */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          {(['knowledge', 'exploration', 'contradictions'] as GraphType[]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                background: type === t ? '#3b82f6' : '#1e293b',
                color: type === t ? 'white' : '#94a3b8',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Graph */}
      <div style={{ height: 'calc(100vh - 65px)' }}>
        <VisualizationGraph clientId={DEMO_CLIENT_ID} type={type} />
      </div>
    </div>
  );
}

export default function GraphTest() {
  return (
    <ConvexProvider client={convex}>
      <GraphTestInner />
    </ConvexProvider>
  );
}
