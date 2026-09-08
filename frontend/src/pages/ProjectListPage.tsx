import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, FolderKanban, MoreHorizontal, Archive, ArchiveRestore, Edit2, CheckCircle2, ListTodo, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api';
import type { Project } from '@/types';

const createSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200),
  description: z.string().max(2000).optional(),
});

type CreateForm = z.infer<typeof createSchema>;

export default function ProjectListPage() {
  const { teamId = '' } = useParams();
  const qc = useQueryClient();
  const [includeArchived, setIncludeArchived] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['projects', teamId, includeArchived],
    queryFn: async () => {
      const res = await api<{ projects: Project[] }>(
        `/api/teams/${teamId}/projects?includeArchived=${includeArchived}`
      );
      return res.projects;
    },
    enabled: !!teamId,
  });

  const projects = useMemo(() => data ?? [], [data]);

  const createForm = useForm<CreateForm>({ resolver: zodResolver(createSchema) });
  const editForm = useForm<CreateForm>({ resolver: zodResolver(createSchema) });

  const createMutation = useMutation({
    mutationFn: async (v: CreateForm) => {
      const res = await api<{ project: Project }>(`/api/teams/${teamId}/projects`, {
        method: 'POST',
        body: JSON.stringify(v),
      });
      return res.project;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', teamId] });
      setCreateOpen(false);
      createForm.reset();
      toast.success('Project created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<CreateForm> & { status?: 'ACTIVE' | 'ARCHIVED' } }) => {
      const res = await api<{ project: Project }>(`/api/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      return res.project;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', teamId] });
      setEditing(null);
      editForm.reset();
      toast.success('Project updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startEdit = (p: Project) => {
    setEditing(p);
    editForm.reset({ name: p.name, description: p.description ?? undefined });
  };

  const counts = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((p) => p.status === 'ACTIVE').length;
    const archived = projects.filter((p) => p.status === 'ARCHIVED').length;
    return { total, active, archived };
  }, [projects]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-slate-500 mt-1">
            {counts.active} active · {counts.archived} archived
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            Include archived
          </label>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create project</DialogTitle>
                <DialogDescription>Break work into tasks. You can archive it later.</DialogDescription>
              </DialogHeader>
              <form
                onSubmit={createForm.handleSubmit((v) => createMutation.mutate(v))}
                className="space-y-4"
                noValidate
              >
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input autoFocus {...createForm.register('name')} />
                  {createForm.formState.errors.name && (
                    <p className="text-xs text-red-600">{createForm.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea rows={4} {...createForm.register('description')} />
                  {createForm.formState.errors.description && (
                    <p className="text-xs text-red-600">{createForm.formState.errors.description.message}</p>
                  )}
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating...' : 'Create project'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4 text-indigo-600">
              <FolderKanban className="h-7 w-7" />
            </div>
            <p className="font-medium text-lg">No projects yet</p>
            <p className="text-sm text-slate-500 mt-1 mb-4">
              Create your first project to start tracking work.
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <Card
              key={p.id}
              className={
                p.status === 'ARCHIVED'
                  ? 'opacity-70 border-dashed'
                  : 'hover:shadow-md transition-shadow cursor-pointer'
              }
            >
              <Link
                to={`/teams/${teamId}/projects/${p.id}/tasks`}
                className="block"
                onClick={(e) => {
                  if (p.status === 'ARCHIVED') e.preventDefault();
                }}
              >
                <CardHeader className="pb-3 flex flex-row justify-between space-y-0">
                  <div className="min-w-0">
                    <CardTitle className="text-base leading-tight truncate pr-3">{p.name}</CardTitle>
                    {p.description && (
                      <CardDescription className="mt-1 line-clamp-2">{p.description}</CardDescription>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 -m-2" onClick={(e) => e.preventDefault()}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.preventDefault(); startEdit(p); }}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {p.status === 'ACTIVE' ? (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            updateMutation.mutate({ id: p.id, payload: { status: 'ARCHIVED' } });
                          }}
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            updateMutation.mutate({ id: p.id, payload: { status: 'ACTIVE' } });
                          }}
                        >
                          <ArchiveRestore className="h-4 w-4 mr-2" />
                          Restore
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
              </Link>
              <CardContent className="pt-3 pb-0">
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <ListTodo className="h-3.5 w-3.5" />
                    {p.stats?.total ?? 0} tasks
                  </span>
                  <span className="inline-flex items-center gap-1 text-amber-600">
                    <Clock className="h-3.5 w-3.5" />
                    {p.stats?.inProgress ?? 0}
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {p.stats?.done ?? 0}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="pt-4 flex gap-2 flex-wrap">
                <Badge variant="secondary">{p.status === 'ARCHIVED' ? 'Archived' : 'Active'}</Badge>
                {p.stats && p.stats.total > 0 && (
                  <div className="flex-1 min-w-[100px] h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${(p.stats.done / p.stats.total) * 100}%` }}
                    />
                  </div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit project</DialogTitle>
              <DialogDescription>Update name and description.</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={editForm.handleSubmit((v) =>
                updateMutation.mutate({ id: editing.id, payload: v })
              )}
              className="space-y-4"
              noValidate
            >
              <div className="space-y-2">
                <Label>Name</Label>
                <Input autoFocus {...editForm.register('name')} />
                {editForm.formState.errors.name && (
                  <p className="text-xs text-red-600">{editForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea rows={4} {...editForm.register('description')} />
                {editForm.formState.errors.description && (
                  <p className="text-xs text-red-600">{editForm.formState.errors.description.message}</p>
                )}
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
    </div>
  );
}
