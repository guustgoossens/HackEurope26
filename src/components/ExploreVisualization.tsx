import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useCountUp } from '@/hooks/useCountUp';
import { Mail, HardDrive, Sheet, FileText } from 'lucide-react';
import type { Id } from '../../convex/_generated/dataModel';

interface ExploreVisualizationProps {
  clientId: string;
}

const blobs = [
  'M50 4C72 3 96 14 98 38C100 62 84 96 54 98C24 100 4 78 2 52C0 26 28 5 50 4Z',
  'M52 2C78 1 97 18 99 42C101 66 80 98 50 99C20 100 2 74 3 48C4 22 26 3 52 2Z',
  'M48 3C74 2 98 16 97 44C96 72 78 99 48 98C18 97 2 72 3 46C4 20 22 4 48 3Z',
];

const sourceIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  gmail: Mail,
  drive: HardDrive,
  sheets: Sheet,
};

function DataSourceCard({
  clientId,
  sourceId,
  type,
  label,
  index,
}: {
  clientId: string;
  sourceId: string;
  type: string;
  label: string;
  index: number;
}) {
  const exploration = useQuery(api.explorations.getBySource, {
    clientId: clientId as Id<'clients'>,
    dataSourceId: sourceId as Id<'data_sources'>,
  });

  const metrics = exploration?.metrics as Record<string, number> | undefined;
  const total = metrics ? Object.values(metrics).reduce((a, b) => (typeof b === 'number' ? a + b : a), 0) : 0;
  const count = useCountUp(total, 1500, total > 0);

  const Icon = sourceIconMap[type] || FileText;

  return (
    <div
      className="rounded-2xl p-5 flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1"
      style={{
        background: 'linear-gradient(135deg, hsl(0 0% 100% / 0.05), hsl(217 30% 20% / 0.3))',
        border: '1px solid hsl(217 20% 35%)',
      }}
    >
      <div className="relative w-12 h-12 mb-3">
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
          <path d={blobs[index % blobs.length]} fill="hsl(217 60% 50% / 0.15)" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className="h-5 w-5 text-blue-400" />
        </div>
      </div>
      <p className="text-sm font-medium text-white capitalize">{label}</p>
      <p className="text-2xl font-bold text-white mt-1" style={{ fontFamily: "'Newsreader', serif" }}>
        {total > 0 ? count.toLocaleString() : exploration === undefined ? '…' : '—'}
      </p>
      {exploration?.status && (
        <span className={`text-[10px] mt-1 px-2 py-0.5 rounded-full ${exploration.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : exploration.status === 'running' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-700 text-slate-400'}`}>
          {exploration.status}
        </span>
      )}
    </div>
  );
}

export function ExploreVisualization({ clientId }: ExploreVisualizationProps) {
  const dataSources = useQuery(api.dataSources.listByClient, { clientId: clientId as Id<'clients'> });

  if (!dataSources || dataSources.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-6">
      <h3 className="text-sm font-medium text-slate-300">Data Sources Overview</h3>

      {/* Source cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {dataSources.map((ds, i) => (
          <DataSourceCard
            key={ds._id}
            clientId={clientId}
            sourceId={ds._id}
            type={ds.type}
            label={ds.label}
            index={i}
          />
        ))}
      </div>

      {/* Bar chart */}
      <SourceBarChart clientId={clientId} dataSources={dataSources} />
    </div>
  );
}

function SourceBarChart({
  clientId,
  dataSources,
}: {
  clientId: string;
  dataSources: Array<{ _id: string; type: string; label: string }>;
}) {
  // Gather totals from explorations per source
  return (
    <div className="space-y-2.5 max-w-sm">
      {dataSources.map((ds) => (
        <BarRow key={ds._id} clientId={clientId} sourceId={ds._id} label={ds.label} />
      ))}
    </div>
  );
}

function BarRow({ clientId, sourceId, label }: { clientId: string; sourceId: string; label: string }) {
  const exploration = useQuery(api.explorations.getBySource, {
    clientId: clientId as Id<'clients'>,
    dataSourceId: sourceId as Id<'data_sources'>,
  });

  const metrics = exploration?.metrics as Record<string, number> | undefined;
  const total = metrics ? Object.values(metrics).reduce((a, b) => (typeof b === 'number' ? a + b : a), 0) : 0;

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-24 text-slate-400 text-right truncate">{label}</span>
      <div className="flex-1 h-2 rounded-full overflow-hidden bg-slate-700">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: total > 0 ? `${Math.min((total / 1200) * 100, 100)}%` : '0%',
            background: 'linear-gradient(90deg, hsl(217 55% 60%), hsl(217 65% 50%))',
          }}
        />
      </div>
      <span className="text-xs font-medium w-12 text-white">{total > 0 ? total.toLocaleString() : '—'}</span>
    </div>
  );
}
