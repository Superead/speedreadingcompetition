import { useLocation, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth";
import {
  BookOpen,
  HelpCircle,
  Users,
  FileText,
  LogOut,
  Shield,
  Trophy,
} from "lucide-react";

import BooksTab from "./admin/books-tab";
import QuestionsTab from "./admin/questions-tab";
import UsersTab from "./admin/users-tab";
import SubmissionsTab from "./admin/submissions-tab";
import CompetitionsTab from "./admin/competitions-tab";
import LeaderboardTab from "./admin/leaderboard-tab";
import StatsOverview from "./admin/stats-overview";

export default function AdminDashboard() {
  const { user, logout, isAdmin } = useAuth();
  const [, navigate] = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <Shield className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">Access Denied</h2>
            <p className="text-muted-foreground">You must be an admin to access this page.</p>
            <Link href="/admin-login">
              <Button>Go to Admin Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-destructive" />
            <span className="font-semibold text-lg">Admin Dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2" data-testid="button-admin-logout">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <StatsOverview />
        <Tabs defaultValue="competitions" className="space-y-6">
          <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full max-w-4xl h-auto">
            <TabsTrigger value="competitions" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-2" data-testid="tab-competitions">
              <Trophy className="h-4 w-4 hidden sm:inline" />
              <span className="hidden sm:inline">Competitions</span>
              <span className="sm:hidden">Comp.</span>
            </TabsTrigger>
            <TabsTrigger value="books" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-2" data-testid="tab-books">
              <BookOpen className="h-4 w-4 hidden sm:inline" />
              Books
            </TabsTrigger>
            <TabsTrigger value="questions" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-2" data-testid="tab-questions">
              <HelpCircle className="h-4 w-4 hidden sm:inline" />
              <span className="hidden sm:inline">Questions</span>
              <span className="sm:hidden">Q&A</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-2" data-testid="tab-users">
              <Users className="h-4 w-4 hidden sm:inline" />
              Users
            </TabsTrigger>
            <TabsTrigger value="submissions" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-2" data-testid="tab-submissions">
              <FileText className="h-4 w-4 hidden sm:inline" />
              <span className="hidden sm:inline">Submissions</span>
              <span className="sm:hidden">Subs.</span>
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-2" data-testid="tab-leaderboard">
              <Trophy className="h-4 w-4 hidden sm:inline" />
              <span className="hidden sm:inline">Leaderboard</span>
              <span className="sm:hidden">Board</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="competitions"><CompetitionsTab /></TabsContent>
          <TabsContent value="books"><BooksTab /></TabsContent>
          <TabsContent value="questions"><QuestionsTab /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
          <TabsContent value="submissions"><SubmissionsTab /></TabsContent>
          <TabsContent value="leaderboard"><LeaderboardTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
