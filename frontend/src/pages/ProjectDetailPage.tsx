import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  ArrowLeft,
  MoreHorizontal,
  Calendar,
  Flag,
  User,
  Trash2,
  CheckCircle2,
  MessageSquare,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api';
import { formatDate, formatDateTime, cn } from '@/lib/utils';
import type { Task, Priority, TaskStatus, TeamMember, Comment } from '@/types';

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).default('TODO'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

type TaskForm = z.infer<typeof createTaskSchema>;

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const STATUS_META: Record<TaskStatus, { label: string; variant: Parameters<typeof Badge>[0]['variant']; color: string }> = {
  TODO: { label: 'Todo', variant: 'outline', color: 'border-slate-300' },
  IN_PROGRESS: { label: 'In Progress', variant: 'info', color: 'border-blue-400' },
  DONE: { label: 'Done', variant: 'success', color: 'border-emerald-400' },
};

const PRIORITY_META: Record<Priority, { label: string; variant: Parameters<typeof Badge>[0]['variant']; icon: string }> = {
  LOW: { label: 'Low', variant: 'secondary', icon: '' },
  MEDIUM: { label: 'Medium', variant: 'warning', icon: '' },
  HIGH: { label: 'High', variant: 'destructive', icon: '' },
};

export default function ProjectDetailPage() {
  const { teamId = '', projectId = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [selected, setSelected] = useState<Task | null>(null);
  const [commentText, setCommentText] = useState('');

  const createForm = useForm<TaskForm>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: { status: 'TODO', priority: 'MEDIUM' },
  });

  const editForm = useForm<TaskForm>({
    resolver: zodResolver(createTaskSchema),
  });

  const membersQuery = useQuery({
    queryKey: ['members', teamId],
    queryFn: async () => {
      const res = await api<{ members: TeamMember[] }>(`/api/teams/${teamId}/members`);
      return res.members;
    },
    enabled: !!teamId,
  });
  const members = membersQuery.data ?? [];

  const tasksQuery = useQuery({
    queryKey: ['tasks', projectId, statusFilter, priorityFilter, assigneeFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);
      if (assigneeFilter !== 'all') params.set('assigneeId', assigneeFilter);
      if (search.trim()) params.set('search', search.trim());
      const res = await api<{ tasks: Task[] }>(
        `/api/projects/${projectId}/tasks?${params.toString()}`
      );
      return res.tasks;
    },
    enabled: !!projectId,
  });

  const selectedQuery = useQuery({
    queryKey: ['task', selected?.id],
    queryFn: async () => {
      const res = await api<{ task: Task }>(`/api/tasks/${selected!.id}`);
      return res.task;
    },
    enabled: !!selected,
  });

  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);

  const grouped = useMemo(() => {
    const cols: Record<TaskStatus, Task[]> = { TODO: [], IN_PROGRESS: [], DONE: [] };
    for (const t of tasks) cols[t.status].push(t);
    return cols;
  }, [tasks]);

  const counts = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'DONE').length;
    return { total, done };
  }, [tasks]);

  const createMutation = useMutation({
    mutationFn: async (v: TaskForm) => {
      const res = await api<{ task: Task }>(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        body: JSON.stringify(v),
      });
      return res.task;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
      setCreateOpen(false);
      createForm.reset({ status: 'TODO', priority: 'MEDIUM' });
      toast.success('Task created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<TaskForm> }) => {
      const res = await api<{ task: Task }>(`/api/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      return res.task;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
      qc.invalidateQueries({ queryKey: ['task', selected?.id] });
      setEditing(null);
      editForm.reset();
      toast.success('Task updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api(`/api/tasks/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
      if (selected?.id) qc.invalidateQueries({ queryKey: ['task', selected.id] });
      setSelected(null);
      toast.success('Task deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const commentMutation = useMutation({
    mutationFn: async ({ taskId, body }: { taskId: string; body: string }) => {
      const res = await api<{ comment: Comment }>(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      });
      return res.comment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task', selected?.id] });
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
      setCommentText('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startEdit = (t: Task) => {
    setEditing(t);
    editForm.reset({
      title: t.title,
      description: t.description ?? undefined,
      status: t.status,
      priority: t.priority,
      assigneeId: t.assigneeId ?? null,
      dueDate: t.dueDate ? t.dueDate.slice(0, 10) : null,
    });
  };

  useEffect(() => {
    if (!selected) return;
  }, [selected]);

  const columns: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/teams/${teamId}/projects`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight truncate">Project tasks</h1>
            <p className="text-sm text-slate-500">
              {counts.total} tasks · {counts.done} complete
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-56"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="TODO">Todo</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="DONE">Done</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priority</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assignees</SelectItem>
              <SelectItem value="none">Unassigned</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.userId} value={m.userId}>
                  {m.user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create task</DialogTitle>
                <DialogDescription>Track a unit of work.</DialogDescription>
              </DialogHeader>
              <form
                onSubmit={createForm.handleSubmit((v) => createMutation.mutate(v))}
                className="space-y-4"
                noValidate
              >
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input autoFocus {...createForm.register('title')} />
                  {createForm.formState.errors.title && (
                    <p className="text-xs text-red-600">{createForm.formState.errors.title.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea rows={3} {...createForm.register('description')} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      defaultValue="TODO"
                      onValueChange={(v) => createForm.setValue('status', v as TaskStatus)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TODO">Todo</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="DONE">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      defaultValue="MEDIUM"
                      onValueChange={(v) => createForm.setValue('priority', v as Priority)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Assignee (optional)</Label>
                    <Select onValueChange={(v) => createForm.setValue('assigneeId', v === 'none' ? null : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {members.map((m) => (
                          <SelectItem key={m.userId} value={m.userId}>
                            {m.user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Due date (optional)</Label>
                    <Input type="date" {...createForm.register('dueDate')} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating...' : 'Create task'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {tasksQuery.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columns.map((c) => (
            <div key={c} className="space-y-3">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-28 rounded-lg" />
              <Skeleton className="h-28 rounded-lg" />
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4 text-indigo-600">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <p className="font-medium text-lg">No tasks found</p>
            <p className="text-sm text-slate-500 mt-1 mb-4">
              Try adjusting your filters, or create a new task.
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New task
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columns.map((status) => (
            <div key={status} className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold">{STATUS_META[status].label}</h2>
                  <Badge variant="secondary" className="text-xs">
                    {grouped[status].length}
                  </Badge>
                </div>
              </div>
              <div className="space-y-3">
                {grouped[status].length === 0 ? (
                  <div className="h-24 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400">
                    No tasks
                  </div>
                ) : (
                  grouped[status].map((t) => {
                    const assignee = members.find((m) => m.userId === t.assigneeId);
                    return (
                      <Card
                        key={t.id}
                        className={cn('cursor-pointer hover:shadow-sm transition-shadow border-l-4', STATUS_META[t.status].color)}
                        onClick={() => setSelected(t)}
                      >
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-sm leading-snug">{t.title}</p>
                            <DropdownMenuStandalone
                              onEdit={() => startEdit(t)}
                              onDelete={() => deleteMutation.mutate(t.id)}
                            />
                          </div>
                          {t.description && (
                            <p className="text-xs text-slate-500 line-clamp-2">{t.description}</p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={PRIORITY_META[t.priority].variant as never}>
                              <Flag className="h-3 w-3 mr-1 inline" />
                              {PRIORITY_META[t.priority].label}
                            </Badge>
                            {t.dueDate && (
                              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                <Calendar className="h-3 w-3" />
                                {formatDate(t.dueDate)}
                              </span>
                            )}
                            {t._count?.comments ? (
                              <span className="inline-flex items-center gap-1 text-xs text-slate-500 ml-auto">
                                <MessageSquare className="h-3 w-3" />
                                {t._count.comments}
                              </span>
                            ) : null}
                            {assignee ? (
                              <TooltipWrapper text={assignee.user.name}>
                                <Avatar className="h-6 w-6 ml-auto">
                                  <AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-700">
                                    {getInitials(assignee.user.name)}
                                  </AvatarFallback>
                                </Avatar>
                              </TooltipWrapper>
                            ) : (
                              <TooltipWrapper text="Unassigned">
                                <div className="h-6 w-6 ml-auto rounded-full border border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                                  <User className="h-3 w-3" />
                                </div>
                              </TooltipWrapper>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit task</DialogTitle>
              <DialogDescription>Update task details.</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={editForm.handleSubmit((v) =>
                updateMutation.mutate({ id: editing.id, payload: v })
              )}
              className="space-y-4"
              noValidate
            >
              <div className="space-y-2">
                <Label>Title</Label>
                <Input autoFocus {...editForm.register('title')} />
                {editForm.formState.errors.title && (
                  <p className="text-xs text-red-600">{editForm.formState.errors.title.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea rows={3} {...editForm.register('description')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    defaultValue={editing.status}
                    onValueChange={(v) => editForm.setValue('status', v as TaskStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODO">Todo</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="DONE">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    defaultValue={editing.priority}
                    onValueChange={(v) => editForm.setValue('priority', v as Priority)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Assignee</Label>
                  <Select
                    defaultValue={editing.assigneeId ?? 'none'}
                    onValueChange={(v) => editForm.setValue('assigneeId', v === 'none' ? null : v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.userId} value={m.userId}>
                          {m.user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Due date</Label>
                  <Input type="date" {...editForm.register('dueDate')} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving...' : 'Save changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
      </Dialog>

      {selected && (
        <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            {(() => {
              const t = selectedQuery.data ?? selected;
              const assignee = members.find((m) => m.userId === t.assigneeId);
              return (
                <>
                  <DialogHeader className="pr-8">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant={STATUS_META[t.status].variant as never}>
                        {STATUS_META[t.status].label}
                      </Badge>
                      <Badge variant={PRIORITY_META[t.priority].variant as never}>
                        {PRIORITY_META[t.priority].label} priority
                      </Badge>
                    </div>
                    <DialogTitle className="text-xl leading-tight">{t.title}</DialogTitle>
                    <DialogDescription className="pt-1">
                      Created {formatDateTime(t.createdAt)}
                      {t.updatedAt !== t.createdAt && <> · Updated {formatDateTime(t.updatedAt)}</>}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {t.description && (
                      <div className="rounded-lg bg-slate-50 p-4 text-sm whitespace-pre-wrap">
                        {t.description}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg border p-3">
                        <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Assignee</div>
                        {assignee ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-700">
                                {getInitials(assignee.user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{assignee.user.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500">Unassigned</span>
                        )}
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Due date</div>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {t.dueDate ? formatDate(t.dueDate) : 'Not set'}
                        </span>
                      </div>
                      <div className="rounded-lg border p-3 col-span-2">
                        <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Quick actions</div>
                        <div className="flex flex-wrap gap-2">
                          {(Object.keys(STATUS_META) as TaskStatus[]).map((s) => (
                            <Button
                              key={s}
                              size="sm"
                              variant={t.status === s ? 'default' : 'outline'}
                              disabled={updateMutation.isPending}
                              onClick={() =>
                                updateMutation.mutate({ id: t.id, payload: { status: s } })
                              }
                            >
                              Mark {STATUS_META[s].label}
                            </Button>
                          ))}
                          <div className="flex-1" />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              startEdit(t);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm('Delete this task?')) deleteMutation.mutate(t.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <MessageSquare className="h-4 w-4 text-slate-500" />
                        <h3 className="font-semibold text-sm">Comments</h3>
                        <Badge variant="secondary">{t.comments?.length ?? 0}</Badge>
                      </div>
                      <div className="space-y-3 mb-3">
                        {!t.comments || t.comments.length === 0 ? (
                          <div className="rounded-lg border border-dashed p-4 text-center text-sm text-slate-500">
                            No comments yet. Be the first to add one.
                          </div>
                        ) : (
                          t.comments.map((c) => (
                            <div key={c.id} className="flex gap-3">
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-700">
                                  {getInitials(c.author?.name ?? 'U')}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2 flex-wrap">
                                  <span className="font-medium text-sm">{c.author?.name ?? 'Unknown'}</span>
                                  <span className="text-xs text-slate-500">
                                    {formatDateTime(c.createdAt)}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">
                                  {c.body}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!commentText.trim()) return;
                          commentMutation.mutate({ taskId: t.id, body: commentText.trim() });
                        }}
                        className="flex items-end gap-2"
                      >
                        <div className="flex-1">
                          <Textarea
                            rows={2}
                            placeholder="Write a comment..."
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                          />
                        </div>
                        <Button
                          type="submit"
                          size="icon"
                          disabled={!commentText.trim() || commentMutation.isPending}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </form>
                    </div>
                  </div>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function DropdownMenuStandalone({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 -m-1">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600"
            onClick={() => {
              if (confirm('Delete this task?')) onDelete();
            }}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function DropdownMenuSeparator() {
  return <div className="h-px bg-slate-200 my-1" />;
}

function TooltipWrapper({ text, children }: { text: string; children: React.ReactNode }) {
  return <div title={text}>{children}</div>;
}
