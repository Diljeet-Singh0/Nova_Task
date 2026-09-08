import { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import AppShell from '@/components/AppShell';
import { ProtectedRoute, GuestRoute } from '@/routes/ProtectedRoute';
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import OnboardingPage from '@/pages/OnboardingPage';
import DashboardPage from '@/pages/DashboardPage';
import ProjectListPage from '@/pages/ProjectListPage';
import ProjectDetailPage from '@/pages/ProjectDetailPage';
import TeamPage from '@/pages/TeamPage';
import SettingsPage from '@/pages/SettingsPage';
import AcceptInvitePage from '@/pages/AcceptInvitePage';
import NotFoundPage from '@/pages/NotFoundPage';

function AuthRedirectHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const next = params.get('next');
    if (next && (location.pathname === '/auth/login' || location.pathname === '/auth/register')) {
      // After login, the page checks localStorage. Next handled in login page via state.from fallback.
    }
  }, [location, navigate]);

  return null;
}

function AppShellLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthRedirectHandler />
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route
          path="/auth/login"
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />
        <Route
          path="/auth/register"
          element={
            <GuestRoute>
              <RegisterPage />
            </GuestRoute>
          }
        />

        <Route path="/accept/:token" element={<AcceptInvitePage />} />

        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />

        <Route
          element={
            <ProtectedRoute>
              <AppShellLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="teams/:teamId" element={<TeamPage />} />
          <Route path="teams/:teamId/projects" element={<ProjectListPage />} />
          <Route
            path="teams/:teamId/projects/:projectId/tasks"
            element={<ProjectDetailPage />}
          />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}
