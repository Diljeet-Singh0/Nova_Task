import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRight, Users, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import type { Team } from '@/types';
import { useAuth } from '@/context/AuthContext';

interface InvitePreview {
  team: { id: string; name: string; createdAt: string };
  expiresAt: string;
}

export default function AcceptInvitePage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const [alreadyJoined, setAlreadyJoined] = useState(false);

  const previewQuery = useQuery({
    queryKey: ['invite-preview', token],
    queryFn: async () => {
      return await api<InvitePreview>(`/api/teams/invitations/${token}`);
    },
    enabled: !!token,
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const res = await api<{ team: Team }>(`/api/teams/invitations/${token}/accept`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      return res.team;
    },
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Joined team!');
      navigate('/dashboard', { replace: true });
    },
    onError: (e: Error) => {
      if (e.message.includes('Already a member') || e.message.includes('Already')) {
        setAlreadyJoined(true);
      }
      toast.error(e.message);
    },
  });

  // If no user and we have a valid preview, suggest login with redirect back
  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>You&apos;re invited!</CardTitle>
            <CardDescription>Log in or sign up to accept this invite.</CardDescription>
          </CardHeader>
          <CardContent>
            {previewQuery.isLoading ? (
              <Skeleton className="h-12 w-full rounded-lg" />
            ) : previewQuery.error || !previewQuery.data ? (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  This invite link is invalid or expired. Ask a team admin for a new one.
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-white border p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Team</p>
                  <p className="font-semibold truncate">{previewQuery.data.team.name}</p>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex-col gap-2 items-stretch">
            <Link to={`/auth/login?next=${encodeURIComponent(`/accept/${token}`)}`} className="w-full">
              <Button className="w-full">
                Log in to accept <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link to={`/auth/register?next=${encodeURIComponent(`/accept/${token}`)}`} className="w-full">
              <Button variant="outline" className="w-full">
                Create account instead
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Join team</CardTitle>
          <CardDescription>Accept the invite to start collaborating.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {previewQuery.isLoading ? (
            <>
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </>
          ) : previewQuery.error || !previewQuery.data ? (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>This invite link is invalid or expired. Ask a team admin for a new one.</div>
            </div>
          ) : (
            <>
              <div className="rounded-lg bg-white border p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Team</p>
                  <p className="font-semibold truncate">{previewQuery.data.team.name}</p>
                </div>
                {alreadyJoined && <BadgeWrapped>Already joined</BadgeWrapped>}
              </div>
              <Button
                className="w-full"
                disabled={acceptMutation.isPending || alreadyJoined}
                onClick={() => acceptMutation.mutate()}
              >
                {acceptMutation.isPending
                  ? 'Joining...'
                  : alreadyJoined
                    ? 'Go to dashboard'
                    : 'Accept invite and join'}
                {!acceptMutation.isPending && !alreadyJoined && (
                  <CheckCircle2 className="h-4 w-4 ml-2" />
                )}
              </Button>
              {alreadyJoined && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/dashboard')}
                >
                  Open dashboard <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BadgeWrapped({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
      {children}
    </span>
  );
}
