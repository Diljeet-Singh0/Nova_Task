import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, LayoutDashboard, Users, FolderKanban, GanttChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    { icon: LayoutDashboard, title: 'Unified dashboard', desc: 'See all your work in one place with clear counts and status' },
    { icon: FolderKanban, title: 'Projects & tasks', desc: 'Break work into projects, assign tasks, set priorities and due dates' },
    { icon: Users, title: 'Team collaboration', desc: 'Invite your team, control roles, delegate easily' },
    { icon: GanttChart, title: 'Kanban board', desc: 'Drag-and-drop between Todo, In Progress, and Done' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <header className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold">
            N
          </div>
          <span className="font-bold text-lg">NOVA</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link to="/auth/login">
            <Button variant="ghost">Log in</Button>
          </Link>
          <Link to="/auth/register">
            <Button>Get started</Button>
          </Link>
        </nav>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-1.5 text-xs text-slate-600 mb-6 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Built for small teams that ship
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-900 to-violet-700 bg-clip-text text-transparent max-w-3xl mx-auto">
          Plan. Collaborate. Deliver.
        </h1>
        <p className="mt-6 text-lg text-slate-600 max-w-xl mx-auto">
          NOVA helps small teams turn big ideas into trackable tasks — so everyone knows what to do,
          and nothing falls through the cracks.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <Button size="lg" onClick={() => navigate('/auth/register')}>
            Create a free account
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/auth/login')}>
            I already have an account
          </Button>
        </div>
        <ul className="mt-8 flex items-center justify-center gap-6 text-sm text-slate-600 flex-wrap">
          {['No credit card', 'Unlimited projects', 'Team invites included'].map((f) => (
            <li key={f} className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              {f}
            </li>
          ))}
        </ul>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((f) => (
          <Card key={f.title} className="p-5 hover:shadow-md transition-shadow border-slate-200">
            <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="font-semibold mb-1">{f.title}</h3>
            <p className="text-sm text-slate-600">{f.desc}</p>
          </Card>
        ))}
      </section>

      <footer className="border-t py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} NOVA. Built for teams that deliver.
      </footer>
    </div>
  );
}
