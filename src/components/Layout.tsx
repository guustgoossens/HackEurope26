import { useAuth } from '@workos-inc/authkit-react';
import { LayoutDashboard, LogOut, Database, MessageSquare } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  onNavigateHome: () => void;
  onToggleForum?: () => void;
  forumOpen?: boolean;
}

export function Layout({ children, onNavigateHome, onToggleForum, forumOpen }: LayoutProps) {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen flex bg-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div
          className="p-5 border-b border-slate-700 cursor-pointer hover:bg-slate-700/50 transition-colors"
          onClick={onNavigateHome}
        >
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-blue-400" />
            <span className="text-lg font-bold text-white">HackEurope26</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">AI-Ready Company Data</p>
        </div>

        <nav className="flex-1 p-3">
          <button
            onClick={onNavigateHome}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
          {onToggleForum && (
            <button
              onClick={onToggleForum}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors ${
                forumOpen
                  ? 'text-blue-400 bg-blue-500/10'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              MoltBook Forum
            </button>
          )}
        </nav>

        {/* User section at bottom */}
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">
                {user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email : 'Demo'}
              </p>
              <p className="text-xs text-slate-400 truncate">{user?.email ?? 'demo@demo'}</p>
            </div>
            {user && (
              <button
                onClick={() => signOut()}
                className="ml-3 p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
