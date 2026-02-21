import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useState } from 'react';
import { Search, X, MessageSquare, ChevronDown, ChevronRight } from 'lucide-react';

const AGENT_COLORS: Record<string, string> = {
  'explorer-gmail': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'explorer-drive': 'bg-green-500/20 text-green-300 border-green-500/30',
  'explorer-sheets': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  structurer: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  master: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'knowledge-writer': 'bg-rose-500/20 text-rose-300 border-rose-500/30',
};

const CATEGORY_COLORS: Record<string, string> = {
  tax: 'bg-red-500/10 text-red-400',
  invoicing: 'bg-emerald-500/10 text-emerald-400',
  general: 'bg-slate-500/10 text-slate-400',
  gmail: 'bg-blue-500/10 text-blue-400',
  drive: 'bg-green-500/10 text-green-400',
  sheets: 'bg-purple-500/10 text-purple-400',
};

interface ForumPanelProps {
  onClose: () => void;
}

export function ForumPanel({ onClose }: ForumPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const searchResults = useQuery(api.forum.publicSearch, searchQuery.trim() ? { query: searchQuery } : 'skip');
  const allEntries = useQuery(api.forum.list, searchQuery.trim() ? 'skip' : {});
  const entries = searchQuery.trim() ? searchResults : allEntries;

  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-slate-800 border-l border-slate-700 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">MoltBook Forum</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-slate-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search forum entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {entries === undefined ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-slate-700 rounded-lg" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              {searchQuery ? 'No entries match your search.' : 'No forum entries yet.'}
            </p>
          </div>
        ) : (
          entries.map((entry) => {
            const isExpanded = expandedId === entry._id;
            const agentStyle = AGENT_COLORS[entry.authorAgent] ?? 'bg-slate-500/20 text-slate-300 border-slate-500/30';
            const categoryStyle = CATEGORY_COLORS[entry.category] ?? CATEGORY_COLORS.general;

            return (
              <button
                key={entry._id}
                onClick={() => setExpandedId(isExpanded ? null : entry._id)}
                className="w-full text-left bg-slate-900 border border-slate-700 rounded-lg p-3 hover:border-slate-600 transition-colors"
              >
                {/* Title row */}
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-slate-500">
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-white truncate">{entry.title}</h4>

                    {/* Badges */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${agentStyle}`}>
                        {entry.authorAgent}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${categoryStyle}`}>{entry.category}</span>
                      {entry.upvotes > 0 && (
                        <span className="text-xs text-slate-500">
                          {entry.upvotes} upvote{entry.upvotes !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* Content preview or full */}
                    <p className={`text-xs text-slate-400 mt-2 ${isExpanded ? '' : 'line-clamp-2'}`}>
                      {entry.content}
                    </p>

                    {/* Tags */}
                    {isExpanded && entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {entry.tags.map((tag) => (
                          <span key={tag} className="text-xs bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Timestamp */}
                    <p className="text-xs text-slate-600 mt-1.5">
                      {new Date(entry._creationTime).toLocaleString()}
                    </p>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-700">
        <p className="text-xs text-slate-500 text-center">
          Agent-to-agent knowledge sharing — read-only view
        </p>
      </div>
    </div>
  );
}
