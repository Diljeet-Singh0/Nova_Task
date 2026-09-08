import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Plus, Link2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import type { Team } from '@/types';

const createSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters').max(100),
});

const joinSchema = z.object({
  token: z.string().min(4, 'Enter a valid invite code').max(80),
});

export default function OnboardingPage() {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const navigate = useNavigate();
  const qc = useQueryClient();

  const createForm = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
  });

  const joinForm = useForm<z.infer<typeof joinSchema>>({
    resolver: zodResolver(joinSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createSchema>) => {
      const res = await api<{ team: Team }>('/api/teams', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res.team;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Team created!');
      navigate('/dashboard');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const joinMutation = useMutation({
    mutationFn: async (data: z.infer<typeof joinSchema>) => {
      const res = await api<{ team: Team }>(`/api/teams/invitations/${data.token.trim()}/accept`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      return res.team;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] });
      toast.success('You joined the team!');
      navigate('/dashboard');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-lg">
            N
          </div>
          <span className="font-bold text-2xl bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            NOVA
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-slate-100 rounded-xl">
          <Button
            variant={mode === 'create' ? 'default' : 'ghost'}
            className={mode === 'create' ? '' : 'bg-transparent hover:bg-white/60'}
            onClick={() => setMode('create')}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New team
          </Button>
          <Button
            variant={mode === 'join' ? 'default' : 'ghost'}
            className={mode === 'join' ? '' : 'bg-transparent hover:bg-white/60'}
            onClick={() => setMode('join')}
          >
            <Link2 className="h-4 w-4 mr-1.5" />
            Join team
          </Button>
        </div>

        <Card>
          {mode === 'create' ? (
            <>
              <CardHeader>
                <CardTitle>Create your team workspace</CardTitle>
                <CardDescription>
                  You&apos;ll be the admin. You can invite teammates next.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={createForm.handleSubmit((v) => createMutation.mutate(v))}
                  className="space-y-4"
                  noValidate
                >
                  <div className="space-y-2">
                    <Label htmlFor="team-name">Team name</Label>
                    <Input
                      id="team-name"
                      autoFocus
                      placeholder="e.g. Acme Product Team"
                      {...createForm.register('name')}
                    />
                    {createForm.formState.errors.name && (
                      <p className="text-xs text-red-600">{createForm.formState.errors.name.message}</p>
                    )}
                  </div>
                  <Button className="w-full" type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating...' : 'Create team and continue'}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </form>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle>Join an existing team</CardTitle>
                <CardDescription>
                  Paste your invite code or the end of the invite link.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={joinForm.handleSubmit((v) => joinMutation.mutate(v))}
                  className="space-y-4"
                  noValidate
                >
                  <div className="space-y-2">
                    <Label htmlFor="invite-token">Invite code</Label>
                    <Input
                      id="invite-token"
                      autoFocus
                      placeholder="e.g. ab12-X9YZK3M2"
                      className="font-mono tracking-wider uppercase"
                      {...joinForm.register('token')}
                    />
                    {joinForm.formState.errors.token && (
                      <p className="text-xs text-red-600">{joinForm.formState.errors.token.message}</p>
                    )}
                  </div>
                  <Button className="w-full" type="submit" disabled={joinMutation.isPending}>
                    {joinMutation.isPending ? 'Joining...' : 'Join team'}
                    <CheckCircle2 className="h-4 w-4 ml-2" />
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>

        <p className="text-center text-xs text-slate-500 mt-6">
          Tip: You can belong to multiple teams — switch between them from the sidebar.
        </p>
      </div>
    </div>
  );
}
