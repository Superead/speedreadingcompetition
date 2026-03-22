import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import RegisterPage from "@/pages/register";
import LoginPage from "@/pages/login";
import AdminLoginPage from "@/pages/admin-login";
import DashboardPage from "@/pages/dashboard";
import CompetitionReadPage from "@/pages/competition-read";
import CompetitionQuestionsPage from "@/pages/competition-questions";
import CompetitionResultsPage from "@/pages/competition-results";
import AdminDashboard from "@/pages/admin";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import { useEffect } from "react";
import "@/lib/i18n";

function ProtectedRoute({ component: Component, adminOnly = false }: { component: React.ComponentType; adminOnly?: boolean }) {
  const { user, isLoading, isAdmin, isStudent } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate(adminOnly ? "/admin-login" : "/login", { replace: true });
    } else if (adminOnly && !isAdmin) {
      navigate("/admin-login", { replace: true });
    } else if (!adminOnly && !isStudent) {
      navigate("/admin", { replace: true });
    }
  }, [user, isLoading, isAdmin, isStudent, adminOnly, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user || (adminOnly && !isAdmin) || (!adminOnly && !isStudent)) {
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/register/:category" component={RegisterPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/admin-login" component={AdminLoginPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/dashboard">
        {() => <ProtectedRoute component={DashboardPage} />}
      </Route>
      <Route path="/competition/read">
        {() => <ProtectedRoute component={CompetitionReadPage} />}
      </Route>
      <Route path="/competition/questions">
        {() => <ProtectedRoute component={CompetitionQuestionsPage} />}
      </Route>
      <Route path="/competition/results">
        {() => <ProtectedRoute component={CompetitionResultsPage} />}
      </Route>
      <Route path="/admin">
        {() => <ProtectedRoute component={AdminDashboard} adminOnly />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
