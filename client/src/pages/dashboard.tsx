import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CountdownTimer } from "@/components/countdown-timer";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { 
  BookOpen, 
  Copy, 
  Trophy, 
  Users, 
  Clock, 
  LogOut, 
  Gift,
  ExternalLink,
  CheckCircle
} from "lucide-react";
import type { CompetitionSettings, Book, Prize, User, Submission } from "@shared/schema";

interface DashboardData {
  settings: CompetitionSettings | null;
  book: Book | null;
  prize: Prize | null;
  referrals: User[];
  submission: Submission | null;
}

function getCategoryColor(category: string) {
  switch (category) {
    case "kid":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "teen":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "adult":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getCategoryTitle(category: string) {
  switch (category) {
    case "kid":
      return "Kids";
    case "teen":
      return "Teens";
    case "adult":
      return "Adults";
    default:
      return category;
  }
}

export default function DashboardPage() {
  const { user, logout, token } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/student/dashboard"],
    enabled: !!token,
  });

  const handleCopyCode = () => {
    if (user?.affiliateCode) {
      navigator.clipboard.writeText(user.affiliateCode);
      toast({
        title: "Copied!",
        description: "Affiliate code copied to clipboard",
      });
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const canStartReading = () => {
    if (!data?.settings?.competitionStartTime) return false;
    const now = new Date();
    const start = new Date(data.settings.competitionStartTime);
    return now >= start && !data.submission?.readingStartAt;
  };

  const hasCompletedCompetition = () => {
    return data?.submission?.answerEndAt != null;
  };

  const isReadingInProgress = () => {
    return data?.submission?.readingStartAt && !data?.submission?.readingEndAt;
  };

  const isAnsweringInProgress = () => {
    return data?.submission?.readingEndAt && !data?.submission?.answerEndAt;
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Please log in to view your dashboard</p>
            <Link href="/login">
              <Button className="mt-4">Go to Login</Button>
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
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg hidden sm:inline">Speed Reading</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2" data-testid="button-logout">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {user.name} {user.surname}
                </CardTitle>
                <CardDescription>
                  <Badge className={getCategoryColor(user.category || "")}>
                    {getCategoryTitle(user.category || "")}
                  </Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Your Affiliate Code</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-muted px-3 py-2 rounded-md font-mono text-lg tracking-wider" data-testid="text-affiliate-code">
                      {user.affiliateCode}
                    </code>
                    <Button variant="outline" size="icon" onClick={handleCopyCode} data-testid="button-copy-code">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Referrals
                </CardTitle>
                <CardDescription>
                  <span className="text-2xl font-bold text-foreground" data-testid="text-referral-points">
                    {user.referralPoints || 0}
                  </span>{" "}
                  points earned
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : data?.referrals && data.referrals.length > 0 ? (
                  <ScrollArea className="h-40">
                    <div className="space-y-2">
                      {data.referrals.map((referral) => (
                        <div key={referral.id} className="flex items-center justify-between py-2 px-3 bg-muted rounded-md">
                          <span className="text-sm font-medium">
                            {referral.name} {referral.surname}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {getCategoryTitle(referral.category || "")}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Share your code to earn referral points!
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Competition Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : hasCompletedCompetition() ? (
                  <div className="text-center py-6 space-y-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30">
                      <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">Competition Completed!</h3>
                      <p className="text-muted-foreground">
                        Your score: <span className="font-bold text-foreground">{data?.submission?.score || 0}</span> points
                      </p>
                      {data?.submission?.readingSeconds && (
                        <p className="text-sm text-muted-foreground">
                          Reading time: {Math.floor(data.submission.readingSeconds / 60)}m {data.submission.readingSeconds % 60}s
                        </p>
                      )}
                    </div>
                  </div>
                ) : data?.settings?.competitionStartTime ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">Competition starts in</p>
                      <CountdownTimer 
                        targetDate={data.settings.competitionStartTime} 
                        size="lg"
                        className="justify-center"
                      />
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Reading Time</p>
                        <p className="text-xl font-bold">{data.settings.readingDurationMinutes} min</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Answering Time</p>
                        <p className="text-xl font-bold">{data.settings.answeringDurationMinutes} min</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-6">
                    Competition schedule not yet announced
                  </p>
                )}

                {isReadingInProgress() && (
                  <div className="text-center py-4">
                    <Badge variant="default" className="text-lg px-4 py-2">Reading in progress</Badge>
                    <Link href="/competition/read">
                      <Button className="mt-4 w-full" data-testid="button-continue-reading">
                        Continue Reading
                      </Button>
                    </Link>
                  </div>
                )}

                {isAnsweringInProgress() && (
                  <div className="text-center py-4">
                    <Badge variant="default" className="text-lg px-4 py-2">Answering in progress</Badge>
                    <Link href="/competition/questions">
                      <Button className="mt-4 w-full" data-testid="button-continue-questions">
                        Continue Questions
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Book
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : data?.book ? (
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-lg" data-testid="text-book-title">{data.book.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Ready for the competition
                      </p>
                    </div>
                    <Link href="/competition/read">
                      <Button 
                        disabled={!canStartReading()}
                        data-testid="button-start-reading"
                      >
                        Start Reading
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    No book assigned yet
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Prizes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : data?.prize?.content ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none" data-testid="text-prizes">
                    <div dangerouslySetInnerHTML={{ __html: data.prize.content.replace(/\n/g, '<br>') }} />
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    Prizes will be announced soon
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5" />
                  Quick Links
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full gap-2" asChild>
                  <a href="https://superead.com" target="_blank" rel="noopener noreferrer" data-testid="link-superead">
                    Superead Login
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
