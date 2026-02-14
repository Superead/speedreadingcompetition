import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CountdownTimer } from "@/components/countdown-timer";
import { BookOpen, Users, Trophy, Clock, ArrowRight, Award, Medal } from "lucide-react";
import type { Competition, Category } from "@shared/schema";

interface CategoryCardProps {
  category: Category;
  competitions: Competition[];
  isLoading: boolean;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  city: string;
  country: string;
  finalScore: number;
  readingSpeedWPM: number | null;
  comprehensionScore: number | null;
}

interface CompetitionResult {
  competition: {
    id: string;
    title: string;
    category: string;
    resultsPublished: boolean;
  };
  leaderboard: LeaderboardEntry[];
}

interface PublicResults {
  kid: CompetitionResult[];
  teen: CompetitionResult[];
  adult: CompetitionResult[];
}

function getCategoryIcon(category: Category) {
  switch (category) {
    case "kid":
      return <BookOpen className="h-10 w-10" />;
    case "teen":
      return <Users className="h-10 w-10" />;
    case "adult":
      return <Trophy className="h-10 w-10" />;
  }
}

function getCategoryColor(category: Category) {
  switch (category) {
    case "kid":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "teen":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "adult":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
  }
}

function getCategoryTitle(category: Category) {
  switch (category) {
    case "kid":
      return "Kids";
    case "teen":
      return "Teens";
    case "adult":
      return "Adults";
  }
}

function getCategoryDescription(category: Category) {
  switch (category) {
    case "kid":
      return "Ages 6-12 \u2022 Fun reading challenges";
    case "teen":
      return "Ages 13-17 \u2022 Intermediate challenges";
    case "adult":
      return "Ages 18+ \u2022 Advanced challenges";
  }
}

function isRegistrationOpen(comp: Competition): boolean {
  if (!comp.registrationStartTime || !comp.registrationEndTime) return false;
  const now = new Date();
  const start = new Date(comp.registrationStartTime);
  const end = new Date(comp.registrationEndTime);
  return now >= start && now <= end;
}

function getNextUpcomingCompetition(competitions: Competition[]): Competition | undefined {
  const upcoming = competitions
    .filter(c => c.registrationStartTime || c.competitionStartTime)
    .sort((a, b) => {
      const aTime = a.competitionStartTime ? new Date(a.competitionStartTime).getTime() : Infinity;
      const bTime = b.competitionStartTime ? new Date(b.competitionStartTime).getTime() : Infinity;
      return aTime - bTime;
    });
  return upcoming[0];
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Medal className="h-5 w-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-amber-700 dark:text-amber-500" />;
  return null;
}

function CategoryCard({ category, competitions, isLoading }: CategoryCardProps) {
  if (isLoading) {
    return (
      <Card className="overflow-visible">
        <CardHeader className="space-y-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const competition = getNextUpcomingCompetition(competitions);
  const hasRegistrationOpen = competitions.some(c => isRegistrationOpen(c));

  return (
    <Card className="overflow-visible hover-elevate transition-all duration-200">
      <CardHeader className="space-y-4">
        <div className={`inline-flex items-center justify-center h-16 w-16 rounded-full ${getCategoryColor(category)}`}>
          {getCategoryIcon(category)}
        </div>
        <div className="space-y-1">
          <CardTitle className="text-2xl font-bold">{getCategoryTitle(category)}</CardTitle>
          <CardDescription className="text-sm">{getCategoryDescription(category)}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {competition && (
          <p className="text-sm text-muted-foreground font-medium" data-testid={`text-competition-title-${category}`}>
            {competition.title}
          </p>
        )}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Registration</p>
              {hasRegistrationOpen ? (
                <Badge variant="default" className="bg-green-600 text-white" data-testid={`badge-registration-${category}`}>Open Now</Badge>
              ) : competition?.registrationStartTime ? (
                new Date(competition.registrationStartTime) > new Date() ? (
                  <div className="space-y-1">
                    <Badge variant="secondary" data-testid={`badge-registration-${category}`}>Opens in</Badge>
                    <CountdownTimer targetDate={competition.registrationStartTime} size="sm" showLabels={false} />
                  </div>
                ) : (
                  <Badge variant="outline" data-testid={`badge-registration-${category}`}>Closed</Badge>
                )
              ) : (
                <Badge variant="outline" data-testid={`badge-registration-${category}`}>Not scheduled</Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Trophy className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Competition</p>
              {competition?.competitionStartTime ? (
                new Date(competition.competitionStartTime) > new Date() ? (
                  <div className="space-y-1">
                    <Badge variant="secondary" data-testid={`badge-competition-${category}`}>Starts in</Badge>
                    <CountdownTimer targetDate={competition.competitionStartTime} size="sm" showLabels={false} />
                  </div>
                ) : competition?.competitionEndTime && new Date(competition.competitionEndTime) > new Date() ? (
                  <Badge variant="default" className="bg-green-600 text-white" data-testid={`badge-competition-${category}`}>In Progress</Badge>
                ) : (
                  <Badge variant="outline" data-testid={`badge-competition-${category}`}>Ended</Badge>
                )
              ) : (
                <Badge variant="outline" data-testid={`badge-competition-${category}`}>Not scheduled</Badge>
              )}
            </div>
          </div>
        </div>

        {hasRegistrationOpen ? (
          <Link href={`/register/${category}`}>
            <Button 
              className="w-full gap-2" 
              data-testid={`button-register-${category}`}
            >
              Register Now
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        ) : (
          <Button 
            className="w-full gap-2" 
            disabled
            data-testid={`button-register-${category}`}
          >
            Registration Closed
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ResultsLeaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">No participants yet.</p>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div
          key={`${entry.rank}-${entry.name}`}
          className={`flex items-center gap-3 flex-wrap p-3 rounded-md ${
            entry.rank <= 3
              ? "bg-muted/60"
              : ""
          }`}
          data-testid={`result-entry-${entry.rank}`}
        >
          <div className="flex items-center justify-center w-8 shrink-0">
            {getRankIcon(entry.rank) || (
              <span className="text-sm font-medium text-muted-foreground">{entry.rank}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate" data-testid={`result-name-${entry.rank}`}>
              {entry.name}
            </p>
            {(entry.city || entry.country) && (
              <p className="text-xs text-muted-foreground truncate">
                {[entry.city, entry.country].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="font-semibold tabular-nums" data-testid={`result-score-${entry.rank}`}>
              {Math.round(entry.finalScore).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">points</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function CategoryResults({ competitionResults }: { competitionResults: CompetitionResult[] }) {
  if (competitionResults.length === 0) {
    return (
      <div className="text-center py-8 space-y-2">
        <Clock className="h-8 w-8 text-muted-foreground mx-auto" />
        <p className="text-muted-foreground">No competitions in this category yet.</p>
      </div>
    );
  }

  const hasPublished = competitionResults.some(cr => cr.competition.resultsPublished);

  if (!hasPublished) {
    return (
      <div className="text-center py-8 space-y-2" data-testid="text-results-pending">
        <Clock className="h-8 w-8 text-muted-foreground mx-auto" />
        <p className="font-medium">Results will be announced soon</p>
        <p className="text-sm text-muted-foreground">
          Competition results are being reviewed. Check back later!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {competitionResults
        .filter(cr => cr.competition.resultsPublished)
        .map((cr) => (
          <div key={cr.competition.id} className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Award className="h-4 w-4 text-muted-foreground shrink-0" />
              <h4 className="font-medium text-sm" data-testid={`result-competition-title-${cr.competition.id}`}>
                {cr.competition.title}
              </h4>
            </div>
            <ResultsLeaderboard entries={cr.leaderboard} />
          </div>
        ))}
    </div>
  );
}

function ResultsSection() {
  const { data: results, isLoading } = useQuery<PublicResults>({
    queryKey: ["/api/public/results"],
  });

  const [activeTab, setActiveTab] = useState<string>("kid");

  return (
    <div className="mt-16 max-w-3xl mx-auto" data-testid="section-results">
      <div className="text-center mb-8 space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Competition Results</h2>
        <p className="text-muted-foreground">
          See how readers ranked in each category
        </p>
      </div>

      <Card className="overflow-visible">
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-6" data-testid="results-category-tabs">
              <TabsTrigger value="kid" data-testid="tab-results-kid">
                Kids (6-12)
              </TabsTrigger>
              <TabsTrigger value="teen" data-testid="tab-results-teen">
                Teens (13-17)
              </TabsTrigger>
              <TabsTrigger value="adult" data-testid="tab-results-adult">
                Adults (18+)
              </TabsTrigger>
            </TabsList>

            {isLoading ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <TabsContent value="kid">
                  <CategoryResults competitionResults={results?.kid || []} />
                </TabsContent>
                <TabsContent value="teen">
                  <CategoryResults competitionResults={results?.teen || []} />
                </TabsContent>
                <TabsContent value="adult">
                  <CategoryResults competitionResults={results?.adult || []} />
                </TabsContent>
              </>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LandingPage() {
  const { data: competitions, isLoading } = useQuery<Competition[]>({
    queryKey: ["/api/competitions/public"],
  });

  const getCompetitionsForCategory = (category: Category) => {
    return competitions?.filter((c) => c.category === category) || [];
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="text-center mb-12 md:mb-16 space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Speed Reading Competition
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Test your reading speed and comprehension. Choose your category, register, and compete with readers from around the world.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {(["kid", "teen", "adult"] as Category[]).map((category) => (
            <CategoryCard
              key={category}
              category={category}
              competitions={getCompetitionsForCategory(category)}
              isLoading={isLoading}
            />
          ))}
        </div>

        <ResultsSection />

        <div className="mt-12 text-center space-y-4">
          <p className="text-muted-foreground">Already registered?</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/login">
              <Button variant="outline" data-testid="button-student-login">
                Student Login
              </Button>
            </Link>
            <Link href="/admin/login">
              <Button variant="ghost" data-testid="button-admin-login">
                Admin Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
