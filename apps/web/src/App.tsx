import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './lib/auth';
import { I18nProvider, useI18n } from './lib/i18n';
import { ToastProvider } from './components/ui/Toast';
import { Button, ErrorState, Spinner } from './components/ui';
import { Brand } from './components/Brand';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import AuthPage from './pages/AuthPage';
import OverviewPage from './pages/OverviewPage';
import ProjectsPage from './pages/ProjectsPage';
import TemplatesPage from './pages/TemplatesPage';
import ComponentsPage from './pages/ComponentsPage';
import AIPage from './pages/AIPage';
import MediaPage from './pages/MediaPage';
import PublicationsPage from './pages/PublicationsPage';
import DomainsPage from './pages/DomainsPage';
import SubmissionsPage from './pages/SubmissionsPage';
import ActivityPage from './pages/ActivityPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const EditorPage = lazy(() => import('./pages/EditorPage'));
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15000, refetchOnWindowFocus: false } } });

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, error, refresh } = useAuth(); const location = useLocation(); const { t } = useI18n();
  if (loading) return <div className="boot-screen"><Brand /><Spinner label={t('Opening your workspace…', 'Otwieranie Twojej przestrzeni…')} /></div>;
  if (error) return <div className="boot-screen"><Brand /><ErrorState message={error} retry={() => void refresh()} /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}
function NotFound() {
  const { t } = useI18n();
  return <div className="boot-screen"><Brand /><h1 className="not-found-title">404</h1><p className="muted">{t('This page wandered off the canvas.', 'Ta strona zniknęła z płótna.')}</p><Button onClick={() => window.location.assign('/')}>{t('Back to workspace', 'Wróć do przestrzeni')}</Button></div>;
}
function Shell() {
  const { user, loading } = useAuth();
  useEffect(() => {
    const settings = user?.settings || {}; const theme = String(settings.theme || 'dark');
    const apply = () => { const resolved = theme === 'system' ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : theme; document.documentElement.dataset.theme = resolved === 'light' ? 'light' : 'dark'; };
    apply(); document.documentElement.dataset.motion = settings.reduceMotion ? 'reduced' : 'full';
    const media = window.matchMedia('(prefers-color-scheme: light)'); media.addEventListener('change', apply); return () => media.removeEventListener('change', apply);
  }, [user?.settings]);
  if (loading) return <div className="boot-screen"><Brand /><Spinner /></div>;
  return <Routes>
    <Route path="/login" element={<AuthPage mode="login" />} />
    <Route path="/register" element={<AuthPage mode="register" />} />
    <Route path="/forgot-password" element={<AuthPage mode="forgot-password" />} />
    <Route path="/reset-password" element={<AuthPage mode="reset-password" />} />
    <Route path="/editor/:id" element={<RequireAuth><Suspense fallback={<div className="boot-screen"><Brand /><Spinner /></div>}><EditorPage /></Suspense></RequireAuth>} />
    <Route element={<RequireAuth><DashboardLayout /></RequireAuth>}>
      <Route index element={<OverviewPage />} />
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/recent" element={<ProjectsPage mode="recent" />} />
      <Route path="/trash" element={<ProjectsPage mode="trash" />} />
      <Route path="/templates" element={<TemplatesPage />} />
      <Route path="/components" element={<ComponentsPage />} />
      <Route path="/ai" element={<AIPage />} />
      <Route path="/media" element={<MediaPage />} />
      <Route path="/publications" element={<PublicationsPage />} />
      <Route path="/domains" element={<DomainsPage />} />
      <Route path="/analytics" element={<Suspense fallback={<Spinner />}><AnalyticsPage /></Suspense>} />
      <Route path="/submissions" element={<SubmissionsPage />} />
      <Route path="/activity" element={<ActivityPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="*" element={<NotFound />} />
    </Route>
  </Routes>;
}
export default function App() {
  return <QueryClientProvider client={queryClient}><BrowserRouter><AuthProvider><I18nProvider><ToastProvider><Shell /></ToastProvider></I18nProvider></AuthProvider></BrowserRouter></QueryClientProvider>;
}