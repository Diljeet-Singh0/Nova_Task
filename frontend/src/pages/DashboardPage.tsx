import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, ListTodo, AlertTriangle, Calendar, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Task, DashboardStats } from '@/types';

function priorityVariant(p: string) {
  if (p === 'HIGH') return 'destructive';
  if (p === 'MEDIUM') return 'warning';
  return 'secondary';
}

function statusVariant(s: string) {
  if (s === 'DONE') return 'success';
  if (s === 'IN_PROGRESS') return 'info';
  return 'outline';
}

function statusLabel(s: string) {
  if (s === 'DONE') return 'Done';
  if (s === 'IN_PROGRESS') return 'In Progress';
  return 'Todo';
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-tasks'],
    queryFn: async () => {
      return await api<{ tasks: Task[]; stats: DashboardStats }>('/api/projects/me/tasks');
    },
  });

  const tasks = data?.tasks ?? [];
  const stats = data?.stats ?? { total: 0, todo: 0, inProgress: 0, done: 0, high: 0 };

  const statCards = [
    { label: 'Total tasks', value: stats.total, icon: ListTodo, color: 'text-slate-600', bg: 'bg-slate-50' },
    { label: 'In progress', value: stats.inProgress, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Done', value: stats.done, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'High priority', value: stats.high, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Your work across all teams and projects.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          : statCards.map((s) => (
              <Card key={s.label} className="border-slate-200">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{s.label}</p>
                      <p className="text-3xl font-bold mt-1">{s.value}</p>
                    </div>
                    <div className={`h-10 w-10 rounded-xl ${s.bg} ${s.color} flex items-center justify-center`}>
                      <s.icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">My tasks</CardTitle>
            <CardDescription>Tasks you created or are assigned to.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3 text-slate-500">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="font-medium">Nothing on your plate</p>
              <p className="text-sm text-slate-500 mt-1">
                You have no assigned tasks yet. Open a project and create one!
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {tasks.map((t) => (
                <li key={t.id} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/teams/${t.project?.team?.id ?? t.project?.teamId ?? ''}/projects/${t.projectId}/tasks`}
                        className="font-medium hover:underline truncate"
                      >
                        {t.title}
                      </Link>
                      <Badge variant={statusVariant(t.status) as never}>{statusLabel(t.status)}</Badge>
                      <Badge variant={priorityVariant(t.priority) as never}>{t.priority}</Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-indigo-500" />
                        {t.project?.name}
                      </span>
                      {t.project?.team?.name && <span>· {t.project.team.name}</span>}
                      {t.dueDate && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(t.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Link
                    to={`/teams/${t.project?.team?.id ?? t.project?.teamId ?? ''}/projects/${t.projectId}/tasks`}
                    className="shrink-0 text-slate-400 hover:text-slate-700"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
