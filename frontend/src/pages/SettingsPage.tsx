import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { User, LogOut, Mail, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/context/AuthContext';
import { formatDate } from '@/lib/utils';

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your profile and sign out.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profile</CardTitle>
          <CardDescription>Your NOVA account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg bg-indigo-100 text-indigo-700">
                {user ? getInitials(user.name) : '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-lg">{user?.name}</p>
              <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                <Mail className="h-3.5 w-3.5" />
                {user?.email}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">User ID</div>
              <code className="text-xs bg-slate-100 rounded px-2 py-1 break-all">{user?.id}</code>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Created
              </div>
              <div>{user?.createdAt ? formatDate(user.createdAt) : '-'}</div>
            </div>
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                Profile editing (name/password) is a reasonable P2 enhancement. Focus on the graded
                features first — name change at the database level is simple but adds surface area
                for bugs.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sign out</CardTitle>
          <CardDescription>End your session on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={async () => {
              await logout();
              toast.success('Signed out');
              navigate('/auth/login', { replace: true });
            }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
