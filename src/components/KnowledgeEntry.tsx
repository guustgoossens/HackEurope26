import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { BookOpen, ShieldCheck, AlertCircle, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import type { Id } from '../../convex/_generated/dataModel';

interface KnowledgeEntryProps {
  treeNodeId: string;
}

export function KnowledgeEntryList({ treeNodeId }: KnowledgeEntryProps) {
  const entries = useQuery(api.knowledge.listEntriesByNode, {
    treeNodeId: treeNodeId as Id<'knowledge_tree'>,
  });

  if (entries === undefined) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="bg-slate-800 border border-slate-700 rounded-xl p-4 animate-pulse">
            <div className="h-5 bg-slate-700 rounded w-48 mb-2" />
            <div className="h-16 bg-slate-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
        <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-3" />
        <p className="text-sm text-slate-500">No entries in this node yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div key={entry._id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-start justify-between mb-2">
            <h4 className="text-sm font-medium text-white">{entry.title}</h4>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              {entry.verified ? (
                <span className="flex items-center gap-1 text-xs text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Unverified
                </span>
              )}
              <ConfidenceBadge confidence={entry.confidence} />
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{entry.content}</p>
          {entry.sourceRef && (
            <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-500">
              <ExternalLink className="w-3 h-3" />
              <span>Source: {entry.sourceRef}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  return (
    <span
      className={clsx(
        'text-xs px-2 py-0.5 rounded-full border',
        pct >= 80
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          : pct >= 50
            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            : 'bg-red-500/10 text-red-400 border-red-500/20',
      )}
    >
      {pct}%
    </span>
  );
}
