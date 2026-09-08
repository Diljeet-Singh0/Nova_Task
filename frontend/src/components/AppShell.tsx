import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Settings,
  LogOut,
  ChevronDown,
  Plus,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { Team } from '@/types';

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const res = await api<{ teams: Team[] }>('/api/teams');
      if (res.teams.length > 0 && !activeTeamId) {
        setActiveTeamId(res.teams[0].id);
      }
      return res.teams;
    },
  });

  const teams = data ?? [];
  const activeTeam = teams.find((t) => t.id === activeTeamId) ?? teams[0];

  useEffect(() => {
    if (!isLoading && teams.length === 0) {
      navigate('/onboarding', { replace: true });
    }
  }, [isLoading, teams.length, navigate]);

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      <aside className="w-64 shrink-0 border-r bg-white dark:bg-slate-900 flex flex-col">
        <div className="p-4 border-b flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold">
            N
          </div>
          <div>
            <div className="font-bold text-sm leading-none">NOVA</div>
            <div className="text-xs text-slate-500">Plan · Deliver</div>
          </div>
        </div>

        <div className="p-3 border-b">
          {isLoading ? (
            <Skeleton className="h-9 w-full" />
          ) : teams.length === 0 ? (
            <Button variant="outline" size="sm" className="w-full" onClick={() => navigate('/onboarding')}>
              <Plus className="h-4 w-4 mr-2" />
              Create team
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between font-normal">
                  <span className="truncate text-left">{activeTeam?.name}</span>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Your teams</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {teams.map((t) => (
                  <DropdownMenuItem
                    key={t.id}
                    onClick={() => setActiveTeamId(t.id)}
                    className="flex items-center justify-between"
                  >
                    <span className="truncate">{t.name}</span>
                    {t.id === activeTeam?.id && <span className="text-xs text-indigo-600">Active</span>}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/onboarding')}>
                  <Plus className="h-4 w-4 mr-2" />
                  New team
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <nav className="flex-1 p-2 space-y-1">
          <NavLink
            to="/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 [&.active]:bg-indigo-50 dark:[&.active]:bg-indigo-500/10 [&.active]:text-indigo-700 dark:[&.active]:text-indigo-300"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </NavLink>

          {activeTeam && (
            <>
              <NavLink
                to={`/teams/${activeTeam.id}/projects`}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 [&.active]:bg-indigo-50 dark:[&.active]:bg-indigo-500/10 [&.active]:text-indigo-700 dark:[&.active]:text-indigo-300"
              >
                <FolderKanban className="h-4 w-4" />
                Projects
              </NavLink>
              <NavLink
                to={`/teams/${activeTeam.id}`}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 [&.active]:bg-indigo-50 dark:[&.active]:bg-indigo-500/10 [&.active]:text-indigo-700 dark:[&.active]:text-indigo-300"
              >
                <Users className="h-4 w-4" />
                Team
              </NavLink>
            </>
          )}

          <NavLink
            to="/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 [&.active]:bg-indigo-50 dark:[&.active]:bg-indigo-500/10 [&.active]:text-indigo-700 dark:[&.active]:text-indigo-300"
          >
            <Settings className="h-4 w-4" />
            Settings
          </NavLink>
        </nav>

        <div className="p-2 border-t mt-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start px-2">
                <Avatar className="h-7 w-7 mr-2">
                  <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
                    {user ? getInitials(user.name) : '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-medium truncate">{user?.name}</div>
                  <div className="text-xs text-slate-500 truncate">{user?.email}</div>
                </div>
                <ChevronDown className="h-4 w-4 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" className="w-56">
              <DropdownMenuLabel>
                <div className="text-xs text-slate-500">Signed in as</div>
                <div className="text-sm font-medium truncate">{user?.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="h-4 w-4 mr-2" />
                Account settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={async () => {
                  await logout();
                  navigate('/auth/login');
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 border-b bg-white dark:bg-slate-900 flex items-center px-6 justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            <span className="text-sm text-slate-600 dark:text-slate-300">
              Welcome back, <span className="font-medium text-foreground">{user?.name}</span>
            </span>
          </div>
        </header>
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
