import { useAuth } from '@workos-inc/authkit-react';
import { LayoutDashboard, LogOut, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';
import folioMark from '@/assets/folio-mark.svg';

interface LayoutProps {
  children: React.ReactNode;
  onNavigateHome: () => void;
  onToggleForum?: () => void;
  forumOpen?: boolean;
}

export function Layout({ children, onNavigateHome, onToggleForum, forumOpen }: LayoutProps) {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="landing min-h-screen flex" style={{ background: 'hsl(var(--background))' }}>
      {/* Sidebar */}
      <aside className="w-64 flex flex-col" style={{ background: 'hsl(var(--card))', borderRight: '1px solid hsl(var(--border))' }}>
        <div
          className="p-5 cursor-pointer transition-colors"
          style={{ borderBottom: '1px solid hsl(var(--border))' }}
          onClick={onNavigateHome}
        >
          <div className="flex items-center gap-2.5">
            <img src={folioMark} alt="Folio" className="w-[32px] h-[32px]" />
            <span className="text-xl" style={{ fontFamily: "'Newsreader', serif", fontWeight: 500, color: 'hsl(var(--foreground))' }}>folio</span>
          </div>
          <p className="text-[11px] mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{t('layout.subtitle')}</p>
        </div>

        <nav className="flex-1 p-3">
          <button
            onClick={onNavigateHome}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors"
            style={{ color: 'hsl(var(--foreground))', background: 'transparent' }}
          >
            <LayoutDashboard className="w-4 h-4" />
            {t('layout.dashboard')}
          </button>
          {onToggleForum && (
            <button
              onClick={onToggleForum}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors mt-1`}
              style={forumOpen ? { color: 'hsl(var(--primary))', background: 'hsl(var(--primary) / 0.08)' } : { color: 'hsl(var(--muted-foreground))' }}
            >
              <MessageSquare className="w-4 h-4" />
              {t('layout.forum')}
            </button>
          )}
        </nav>

        {/* User section at bottom */}
        <div className="p-4" style={{ borderTop: '1px solid hsl(var(--border))' }}>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate" style={{ color: 'hsl(var(--foreground))' }}>
                {user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email : t('layout.demoUser')}
              </p>
              <p className="text-xs truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>{user?.email ?? t('layout.demoEmail')}</p>
            </div>
            <LanguageSwitcher className="px-2 py-1 text-xs font-medium rounded transition-colors" style={{ color: 'hsl(var(--muted-foreground))' }} />
            {user && (
              <button
                onClick={() => signOut()}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'hsl(var(--muted-foreground))' }}
                title={t('common.signOut')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-auto">{children}</main>
    </div>
  );
}
