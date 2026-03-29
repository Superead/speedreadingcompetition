import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LogOut, BookOpen } from "lucide-react";
import { useLocation } from "wouter";
import SubmissionsTab from "@/pages/admin/submissions-tab";

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/admin-login");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-lg font-bold">Teacher Dashboard</h1>
              <p className="text-xs text-muted-foreground">
                {user?.name} {user?.surname}
                {(user as any)?.teacherLanguages && (
                  <span className="ml-2 text-primary">
                    ({(user as any).teacherLanguages})
                  </span>
                )}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <SubmissionsTab apiPrefix="/api/teacher" showReviewerColumn showLanguageFilter />
      </main>
    </div>
  );
}
