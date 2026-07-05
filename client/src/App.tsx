import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { GrantedLogo } from "@/components/granted-logo";
import { Skeleton } from "@/components/ui/skeleton";
import { MicroSurvey } from "@/components/micro-survey";
import { useSurveyTrigger } from "@/hooks/use-survey-trigger";
import { SupportChatWidget } from "@/components/support-chat-widget";
import { CookieConsentBanner } from "@/components/cookie-consent";
import { OnboardingWizard, useOnboardingStatus } from "@/components/onboarding-wizard";
import { MobileBottomNav } from "@/components/mobile-nav";
import { lazy, Suspense, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";
import { useBodyPointerEventsCleanup } from "@/hooks/use-body-pointer-events-cleanup";

const LandingPage = lazy(() => import("@/pages/landing"));
const AuthPage = lazy(() => import("@/pages/auth-page"));
const DashboardPage = lazy(() => import("@/pages/dashboard"));
const ProjectsPage = lazy(() => import("@/pages/projects"));
const ProjectWorkspacePage = lazy(() => import("@/pages/project-workspace"));
const NotificationsPage = lazy(() => import("@/pages/notifications"));
const MyAccountPage = lazy(() => import("@/pages/my-account"));
const AcceptPrivacyPage = lazy(() => import("@/pages/accept-privacy"));
const NewsPage = lazy(() => import("@/pages/news"));
const CompaniesPage = lazy(() => import("@/pages/companies"));
const FundingCallsPage = lazy(() => import("@/pages/funding-calls"));
const IdeaSearchPage = lazy(() => import("@/pages/idea-search"));
const EligibilityPage = lazy(() => import("@/pages/eligibility"));
const HowItWorksPage = lazy(() => import("@/pages/how-it-works"));
const CompanyDetailPage = lazy(() => import("@/pages/company-detail"));
const AdminPage = lazy(() => import("@/pages/admin"));
const PricingPage = lazy(() => import("@/pages/pricing"));
function HomeRedirect() { const [, setLocation] = useLocation(); useEffect(() => { setLocation("/"); }, []); return null; }
function AuthAliasRedirect() { const [, setLocation] = useLocation(); useEffect(() => { setLocation("/auth" + window.location.search + window.location.hash); }, []); return null; }
function CallsManagementRedirect() { const [, setLocation] = useLocation(); useEffect(() => { setLocation("/funding-calls"); }, []); return null; }
function SettingsRedirect() { const [, setLocation] = useLocation(); useEffect(() => { setLocation("/my-account"); }, []); return null; }
function SubscriptionRedirect() { useEffect(() => { window.location.replace("/my-account?tab=abonament"); }, []); return null; }
function MyDataRedirect() { useEffect(() => { window.location.replace("/my-account?tab=date-gdpr"); }, []); return null; }
const CalendarPage = lazy(() => import("@/pages/calendar"));
const FundingCallDetailPage = lazy(() => import("@/pages/funding-call-detail"));
const ResetPasswordPage = lazy(() => import("@/pages/reset-password"));
const PrivacyPolicyPage = lazy(() => import("@/pages/privacy-policy"));
const TermsConditionsPage = lazy(() => import("@/pages/terms-conditions"));
const CookiePolicyPage = lazy(() => import("@/pages/cookie-policy"));
const NotificationSettingsPage = lazy(() => import("@/pages/notification-settings"));
const NotFound = lazy(() => import("@/pages/not-found"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
}

function AuthenticatedRouter() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/" component={DashboardPage} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/login" component={HomeRedirect} />
          <Route path="/register" component={HomeRedirect} />
          <Route path="/projects" component={ProjectsPage} />
          <Route path="/projects/:id" component={ProjectWorkspacePage} />
          <Route path="/notifications" component={NotificationsPage} />
          <Route path="/notification-settings" component={NotificationSettingsPage} />
          <Route path="/my-account" component={MyAccountPage} />
          <Route path="/settings" component={SettingsRedirect} />
          <Route path="/subscription" component={SubscriptionRedirect} />
          <Route path="/my-data" component={MyDataRedirect} />

          <Route path="/news" component={NewsPage} />
          <Route path="/companies" component={CompaniesPage} />
          <Route path="/funding-calls" component={FundingCallsPage} />
          <Route path="/funding-calls/:id" component={FundingCallDetailPage} />
          <Route path="/cauta-dupa-idee" component={IdeaSearchPage} />
          <Route path="/eligibility" component={EligibilityPage} />
          <Route path="/how-it-works" component={HowItWorksPage} />
          <Route path="/companies/:id" component={CompanyDetailPage} />
          <Route path="/calendar" component={CalendarPage} />
          <Route path="/calls-management" component={CallsManagementRedirect} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/preturi" component={PricingPage} />
          <Route path="/privacy-policy" component={PrivacyPolicyPage} />
          <Route path="/terms-conditions" component={TermsConditionsPage} />
          <Route path="/cookie-policy" component={CookiePolicyPage} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </ErrorBoundary>
  );
}

function HeaderLogo() {
  const { state } = useSidebar();
  if (state === "expanded") return null;
  return <GrantedLogo size="sm" variant="navy" />;
}

function AuthenticatedLayout() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };
  const [, navigate] = useLocation();
  const { shouldShow: showOnboarding, dismiss: dismissOnboarding } = useOnboardingStatus();
  const { user } = useAuth();
  const onboarding7dEnabled = (() => {
    const createdAt = user?.createdAt;
    if (!createdAt) return false;
    const ageMs = Date.now() - new Date(createdAt).getTime();
    return ageMs >= 7 * 24 * 60 * 60 * 1000;
  })();
  const onboardingSurvey = useSurveyTrigger({
    event: "onboarding_7d",
    enabled: !showOnboarding && onboarding7dEnabled,
    delayMs: 4000,
  });

  if (showOnboarding) {
    return (
      <OnboardingWizard
        onComplete={(destination) => {
          dismissOnboarding();
          if (destination) navigate(destination);
        }}
      />
    );
  }

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center gap-3 p-3 h-14 mx-3 mt-2 border rounded-2xl bg-background/95 backdrop-blur-md shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <HeaderLogo />
          </header>
          <main className="flex-1 overflow-auto pb-[calc(4.5rem+max(env(safe-area-inset-bottom,0px),4px))] md:pb-0">
            <AuthenticatedRouter />
          </main>
        </div>
      </div>
      <MobileBottomNav />
      <SupportChatWidget />
      {onboardingSurvey.surveyConfig && (
        <MicroSurvey
          config={onboardingSurvey.surveyConfig}
          onSubmit={onboardingSurvey.submit}
          onDismiss={onboardingSurvey.dismiss}
          isSubmitting={onboardingSurvey.isSubmitting}
        />
      )}
    </SidebarProvider>
  );
}

function AppContent() {
  useBodyPointerEventsCleanup();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-4 text-center">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
      </div>
    );
  }

  if (!user) {
    const publicPaths = ["/", "/auth", "/login", "/register", "/reset-password", "/privacy-policy", "/terms-conditions", "/cookie-policy"];
    const currentPath = window.location.pathname;
    if (!publicPaths.includes(currentPath) && !currentPath.startsWith("/auth")) {
      const returnTo = currentPath + window.location.search + window.location.hash;
      window.location.replace(`/auth?returnTo=${encodeURIComponent(returnTo)}`);
      return <PageLoader />;
    }

    return (
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Switch>
            <Route path="/auth" component={AuthPage} />
            <Route path="/login" component={AuthAliasRedirect} />
            <Route path="/register" component={AuthAliasRedirect} />
            <Route path="/reset-password" component={ResetPasswordPage} />
            <Route path="/privacy-policy" component={PrivacyPolicyPage} />
            <Route path="/terms-conditions" component={TermsConditionsPage} />
            <Route path="/cookie-policy" component={CookiePolicyPage} />
            <Route component={LandingPage} />
          </Switch>
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (!user.privacyAcceptedAt) {
    return (
      <Suspense fallback={<PageLoader />}>
        <AcceptPrivacyPage />
      </Suspense>
    );
  }

  return <AuthenticatedLayout />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppContent />
        <CookieConsentBanner />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
