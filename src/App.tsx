import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RouteFallback } from "@/components/RouteFallback";
import { SentryRoutes } from "@/lib/observability";

const TracedRoutes = SentryRoutes(Routes);

const Index = lazy(() => import("./pages/Index"));
const Feed = lazy(() => import("./pages/Feed"));
const Auth = lazy(() => import("./pages/Auth"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Recognition = lazy(() => import("./pages/Recognition"));
const Objectives = lazy(() => import("./pages/Objectives"));
const ObjectiveDetail = lazy(() => import("./pages/ObjectiveDetail"));
const OkrOverview = lazy(() => import("./pages/OkrOverview"));
const Surveys = lazy(() => import("./pages/Surveys"));
const Company = lazy(() => import("./pages/Company"));
const Settings = lazy(() => import("./pages/Settings"));
const Automation = lazy(() => import("./pages/Automation"));
const Teams = lazy(() => import("./pages/Teams"));
const Performance = lazy(() => import("./pages/Performance"));
const Gamification = lazy(() => import("./pages/Gamification"));
const HR = lazy(() => import("./pages/HR"));
const PeriodsAdmin = lazy(() => import("./pages/admin/Periods"));
const OkrEscalationAdmin = lazy(() => import("./pages/admin/OkrEscalation"));
const InvitationsAdmin = lazy(() => import("./pages/admin/Invitations"));
const ManagersAdmin = lazy(() => import("./pages/admin/Managers"));
const OkrAccessAdmin = lazy(() => import("./pages/admin/OkrAccess"));
const PulseSurveysAdmin = lazy(() => import("./pages/admin/PulseSurveys"));
const PulseAnalyticsAdmin = lazy(() => import("./pages/admin/PulseAnalytics"));
const NineBoxAdmin = lazy(() => import("./pages/admin/NineBox"));
const NineBoxEditorAdmin = lazy(() => import("./pages/admin/NineBoxEditor"));
const FeedbackAnalyticsAdmin = lazy(() => import("./pages/admin/FeedbackAnalytics"));
const OneOnOnesDashboardAdmin = lazy(() => import("./pages/admin/OneOnOnesDashboard"));
const PDIDashboardAdmin = lazy(() => import("./pages/admin/PDIDashboard"));
const PulsePage = lazy(() => import("./pages/Pulse"));
const Feedback = lazy(() => import("./pages/feedback/Feedback"));
const FeedbackDetail = lazy(() => import("./pages/feedback/Detail"));

/** Redirect legado de /feedback/new → /feedback?tab=pedir preservando o preset `?subject=`. */
function RedirectFeedbackNew() {
  const [params] = useSearchParams();
  const subject = params.get("subject");
  return (
    <Navigate
      to={`/feedback?tab=pedir${subject ? `&subject=${encodeURIComponent(subject)}` : ""}`}
      replace
    />
  );
}
const OneOnOnes = lazy(() => import("./pages/OneOnOnes"));
const OneOnOneDetail = lazy(() => import("./pages/OneOnOneDetail"));
const PDI = lazy(() => import("./pages/PDI"));
const PDITeam = lazy(() => import("./pages/PDITeam"));
const TimeOff = lazy(() => import("./pages/TimeOff"));
const PDIDetail = lazy(() => import("./pages/PDIDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Não retentar erros permanentes: 4xx HTTP (401/403/404) e erros do
      // PostgREST/Postgres (ex.: PGRST205 = tabela ausente, 42P01 = relação
      // inexistente). Retentar esses só prolonga o spinner sem nunca suceder.
      retry: (failureCount, error: unknown) => {
        const e = error as { status?: number; code?: string } | null;
        const httpStatus = Number(e?.status);
        if (httpStatus >= 400 && httpStatus < 500) return false;
        const code = e?.code ?? "";
        // Códigos do PostgREST (PGRST*) e SQLSTATE de objeto inexistente.
        if (/^PGRST/.test(code) || /^(42P01|42703|22|23)/.test(code))
          return false;
        return failureCount < 2;
      },
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ErrorBoundary>
            <BrowserRouter>
              <Suspense fallback={<RouteFallback />}>
                <TracedRoutes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/auth/reset" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                  <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
                  <Route path="/recognition" element={<ProtectedRoute><Recognition /></ProtectedRoute>} />
                  <Route path="/objectives" element={<ProtectedRoute><Objectives /></ProtectedRoute>} />
                  <Route path="/objectives/:id" element={<ProtectedRoute><ObjectiveDetail /></ProtectedRoute>} />
                  <Route path="/okr-overview" element={<ProtectedRoute><OkrOverview /></ProtectedRoute>} />
                  <Route path="/surveys" element={<ProtectedRoute><Surveys /></ProtectedRoute>} />
                  <Route path="/company" element={<ProtectedRoute><Company /></ProtectedRoute>} />
                  <Route path="/time-off" element={<ProtectedRoute><TimeOff /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                  <Route path="/automation" element={<ProtectedRoute><Automation /></ProtectedRoute>} />
                  <Route path="/teams" element={<ProtectedRoute><Teams /></ProtectedRoute>} />
                  <Route path="/performance" element={<ProtectedRoute><Performance /></ProtectedRoute>} />
                  <Route path="/gamification" element={<ProtectedRoute><Gamification /></ProtectedRoute>} />
                  <Route path="/hr" element={<ProtectedRoute><HR /></ProtectedRoute>} />
                  <Route path="/admin/periods" element={<ProtectedRoute><PeriodsAdmin /></ProtectedRoute>} />
                  <Route path="/admin/okr-escalation" element={<ProtectedRoute><OkrEscalationAdmin /></ProtectedRoute>} />
                  <Route path="/admin/invitations" element={<ProtectedRoute><InvitationsAdmin /></ProtectedRoute>} />
                  <Route path="/admin/managers" element={<ProtectedRoute><ManagersAdmin /></ProtectedRoute>} />
                  <Route path="/admin/okr-access" element={<ProtectedRoute><OkrAccessAdmin /></ProtectedRoute>} />
                  <Route path="/admin/pulse-surveys" element={<ProtectedRoute><PulseSurveysAdmin /></ProtectedRoute>} />
                  <Route path="/admin/pulse-surveys/:id/analytics" element={<ProtectedRoute><PulseAnalyticsAdmin /></ProtectedRoute>} />
                  <Route path="/admin/nine-box" element={<ProtectedRoute><NineBoxAdmin /></ProtectedRoute>} />
                  <Route path="/admin/nine-box/:id" element={<ProtectedRoute><NineBoxEditorAdmin /></ProtectedRoute>} />
                  <Route path="/admin/pdi-dashboard" element={<ProtectedRoute><PDIDashboardAdmin /></ProtectedRoute>} />
                  <Route path="/pulse/:id" element={<ProtectedRoute><PulsePage /></ProtectedRoute>} />
                  <Route path="/admin/feedback/analytics" element={<ProtectedRoute><FeedbackAnalyticsAdmin /></ProtectedRoute>} />
                  <Route path="/admin/one-on-ones-dashboard" element={<ProtectedRoute><OneOnOnesDashboardAdmin /></ProtectedRoute>} />
                  {/* Feedback unificado (Onda 3 §3.1): 1 página com abas via ?tab= */}
                  <Route path="/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
                  {/* Redirects dos deep-links antigos → abas da página unificada */}
                  <Route path="/feedback/inbox" element={<Navigate to="/feedback?tab=inbox" replace />} />
                  <Route path="/feedback/new" element={<RedirectFeedbackNew />} />
                  <Route path="/feedback/sent" element={<Navigate to="/feedback?tab=enviados" replace />} />
                  <Route path="/feedback/about-me" element={<Navigate to="/feedback?tab=sobre-mim" replace />} />
                  <Route path="/feedback/:id" element={<ProtectedRoute><FeedbackDetail /></ProtectedRoute>} />
                  <Route path="/one-on-ones" element={<ProtectedRoute><OneOnOnes /></ProtectedRoute>} />
                  <Route path="/one-on-ones/:id" element={<ProtectedRoute><OneOnOneDetail /></ProtectedRoute>} />
                  <Route path="/pdi" element={<ProtectedRoute><PDI /></ProtectedRoute>} />
                  <Route path="/pdi/team" element={<ProtectedRoute><PDITeam /></ProtectedRoute>} />
                  <Route path="/pdi/:id" element={<ProtectedRoute><PDIDetail /></ProtectedRoute>} />
                  <Route path="*" element={<NotFound />} />
                </TracedRoutes>
              </Suspense>
            </BrowserRouter>
          </ErrorBoundary>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
