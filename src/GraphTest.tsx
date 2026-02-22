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

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL ?? '');

type GraphType = 'knowledge' | 'exploration' | 'contradictions';

function GraphTestInner() {
  const [type, setType] = useState<GraphType>('knowledge');

  // Dynamically look up the demo client — no hardcoded ID needed
  const demoClients = useQuery(api.clients.list, { createdBy: 'demo' });
  const client = demoClients?.[0];
  const clientId = client?._id as Id<'clients'> | undefined;

  if (demoClients === undefined) {
    return (
      <div style={{ background: '#0f172a', minHeight: '100vh', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        Loading…
      </div>
    );
  }

  if (!clientId) {
    return (
      <div style={{ background: '#0f172a', minHeight: '100vh', color: '#f87171', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', gap: '12px' }}>
        <p style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>No demo client found.</p>
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Run <code style={{ background: '#1e293b', padding: '2px 6px', borderRadius: '4px' }}>npx convex run demoData:createDemoClient</code> then seed with <code style={{ background: '#1e293b', padding: '2px 6px', borderRadius: '4px' }}>insertDemoMessy</code>.</p>
      </div>
    );
  }

  return (
    <div style={{ background: '#0f172a', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Graph Test</h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            Client: {client?.name} · ID: {clientId}
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
        <VisualizationGraph clientId={clientId} type={type} />
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
