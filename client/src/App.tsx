import { Switch, Route, Redirect } from "wouter";
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
import AdminDashboard from "@/pages/admin";

function ProtectedRoute({ component: Component, adminOnly = false }: { component: React.ComponentType; adminOnly?: boolean }) {
  const { user, isLoading, isAdmin, isStudent } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to={adminOnly ? "/admin/login" : "/login"} />;
  }

  if (adminOnly && !isAdmin) {
    return <Redirect to="/admin/login" />;
  }

  if (!adminOnly && !isStudent) {
    return <Redirect to="/admin" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/register/:category" component={RegisterPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/admin/login" component={AdminLoginPage} />
      <Route path="/admin-login">{() => <Redirect to="/admin/login" />}</Route>
      <Route path="/dashboard">
        {() => <ProtectedRoute component={DashboardPage} />}
      </Route>
      <Route path="/competition/read">
        {() => <ProtectedRoute component={CompetitionReadPage} />}
      </Route>
      <Route path="/competition/questions">
        {() => <ProtectedRoute component={CompetitionQuestionsPage} />}
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
