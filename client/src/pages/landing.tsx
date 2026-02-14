import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CountdownTimer } from "@/components/countdown-timer";
import { BookOpen, Users, Trophy, Clock, ArrowRight } from "lucide-react";
import type { Competition, Category } from "@shared/schema";

interface CategoryCardProps {
  category: Category;
  competitions: Competition[];
  isLoading: boolean;
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
  const now = new Date();
  const upcoming = competitions
    .filter(c => c.registrationStartTime || c.competitionStartTime)
    .sort((a, b) => {
      const aTime = a.competitionStartTime ? new Date(a.competitionStartTime).getTime() : Infinity;
      const bTime = b.competitionStartTime ? new Date(b.competitionStartTime).getTime() : Infinity;
      return aTime - bTime;
    });
  return upcoming[0];
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
