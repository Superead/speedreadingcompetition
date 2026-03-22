import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { CountdownTimer } from "@/components/countdown-timer";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import {
  BookOpen, Users, Trophy, Clock, ArrowRight, Award, Medal,
  Zap, Brain, BarChart3, Star, Share2, ChevronRight, Mail,
  CheckCircle, Sparkles, Globe, TrendingUp
} from "lucide-react";
import type { Competition, Category, Testimonial, Banner, SiteStat } from "@shared/schema";

// ─── Types ───────────────────────────────────────────────────────────────────
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
const CATEGORIES: Category[] = ["kid", "teen", "adult"];

const CATEGORY_STYLES: Record<Category, {
  color: string;
  gradient: string;
  iconBg: string;
}> = {
  kid: {
    color: "text-emerald-600 dark:text-emerald-400",
    gradient: "from-emerald-500 to-teal-600",
    iconBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  teen: {
    color: "text-blue-600 dark:text-blue-400",
    gradient: "from-blue-500 to-indigo-600",
    iconBg: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  adult: {
    color: "text-purple-600 dark:text-purple-400",
    gradient: "from-purple-500 to-violet-600",
    iconBg: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
};

function getCategoryIcon(category: Category) {
  const cls = "h-8 w-8";
  switch (category) {
    case "kid": return <BookOpen className={cls} />;
    case "teen": return <Users className={cls} />;
    case "adult": return <Trophy className={cls} />;
  }
}

function isRegistrationOpen(comp: Competition): boolean {
  if (!comp.registrationStartTime || !comp.registrationEndTime) return false;
  const now = new Date();
  return now >= new Date(comp.registrationStartTime) && now <= new Date(comp.registrationEndTime);
}

function getNextUpcomingCompetition(competitions: Competition[]): Competition | undefined {
  const now = new Date();

  // Priority: 1) registration open or competition in progress, 2) upcoming, 3) most recently ended
  return competitions
    .filter(c => c.registrationStartTime || c.competitionStartTime)
    .sort((a, b) => {
      const aEnd = a.competitionEndTime ? new Date(a.competitionEndTime) : null;
      const bEnd = b.competitionEndTime ? new Date(b.competitionEndTime) : null;
      const aEnded = aEnd && aEnd < now;
      const bEnded = bEnd && bEnd < now;

      // Active/upcoming competitions come before ended ones
      if (aEnded && !bEnded) return 1;
      if (!aEnded && bEnded) return -1;

      // Among active/upcoming, sort by earliest start time
      if (!aEnded && !bEnded) {
        const aTime = a.competitionStartTime ? new Date(a.competitionStartTime).getTime() : Infinity;
        const bTime = b.competitionStartTime ? new Date(b.competitionStartTime).getTime() : Infinity;
        return aTime - bTime;
      }

      // Among ended, show most recently ended first
      return (bEnd?.getTime() || 0) - (aEnd?.getTime() || 0);
    })[0];
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Medal className="h-5 w-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-amber-700 dark:text-amber-500" />;
  return null;
}

function getStatIcon(icon: string | null) {
  const cls = "h-8 w-8";
  switch (icon) {
    case "users": return <Users className={cls} />;
    case "book": return <BookOpen className={cls} />;
    case "zap": return <Zap className={cls} />;
    case "trophy": return <Trophy className={cls} />;
    case "globe": return <Globe className={cls} />;
    case "trending": return <TrendingUp className={cls} />;
    default: return <BarChart3 className={cls} />;
  }
}

function getCategoryTitleKey(category: Category): string {
  switch (category) {
    case "kid": return "landing.kidsTitle";
    case "teen": return "landing.teensTitle";
    case "adult": return "landing.adultsTitle";
  }
}

function getCategoryDescKey(category: Category): string {
  switch (category) {
    case "kid": return "landing.kidsDesc";
    case "teen": return "landing.teensDesc";
    case "adult": return "landing.adultsDesc";
  }
}

function getCategoryAgesKey(category: Category): string {
  switch (category) {
    case "kid": return "landing.kidsAges";
    case "teen": return "landing.teensAges";
    case "adult": return "landing.adultsAges";
  }
}

// ─── Banner Component ────────────────────────────────────────────────────────
function TopBanner() {
  const { t } = useTranslation();
  const { data: banners } = useQuery<Banner[]>({
    queryKey: ["/api/marketing/banners?position=top"],
  });

  const banner = banners?.[0];
  if (!banner) return null;

  return (
    <div
      className="text-center py-2.5 px-4 text-sm font-medium"
      style={{ backgroundColor: banner.bgColor || "#3b82f6", color: banner.textColor || "#fff" }}
    >
      <span>{banner.content}</span>
      {banner.linkUrl && (
        <a href={banner.linkUrl} className="ml-2 underline font-semibold hover:opacity-80">
          {banner.linkText || t('landing.learnMore')} &rarr;
        </a>
      )}
    </div>
  );
}

// ─── Hero Section ────────────────────────────────────────────────────────────
function HeroSection() {
  const { t } = useTranslation();
  return (
    <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28">
      {/* Gradient backdrop */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-blue-50/50 via-background to-background dark:from-blue-950/20" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -z-10 w-[800px] h-[400px] bg-gradient-to-r from-blue-400/10 via-purple-400/10 to-emerald-400/10 blur-3xl rounded-full" />

      <div className="container mx-auto px-4 text-center space-y-8 max-w-4xl">
        <Badge variant="secondary" className="gap-1.5 px-4 py-1.5 text-sm">
          <Sparkles className="h-3.5 w-3.5" />
          {t('landing.badge')}
        </Badge>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
          {t('landing.heroTitle1')}
          <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-500 bg-clip-text text-transparent">
            {t('landing.heroTitle2')}
          </span>
          {t('landing.heroTitle3')}
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {t('landing.heroDescription')}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/register/kid">
            <Button size="lg" className="gap-2 text-base px-8">
              {t('landing.startCompeting')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="gap-2 text-base px-8">
              {t('landing.studentLogin')}
            </Button>
          </Link>
        </div>

        {/* Social proof */}
        <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-green-500" />
            {t('landing.freeToEnter')}
          </div>
          <div className="flex items-center gap-1.5">
            <Globe className="h-4 w-4 text-blue-500" />
            {t('landing.worldwideCompetition')}
          </div>
          <div className="flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-yellow-500" />
            {t('landing.prizesForWinners')}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Stats Section ───────────────────────────────────────────────────────────
function StatsSection() {
  const { t } = useTranslation();
  const { data: stats } = useQuery<SiteStat[]>({
    queryKey: ["/api/marketing/stats"],
  });

  // Fallback stats if none configured
  const defaultStats = [
    { key: "readers", value: "1,000+", label: t('landing.readersWorldwide'), icon: "users" },
    { key: "competitions", value: "50+", label: t('landing.competitionsHeld'), icon: "trophy" },
    { key: "avg_wpm", value: "250+", label: t('landing.avgWpmAchieved'), icon: "zap" },
    { key: "countries", value: "30+", label: t('landing.countries'), icon: "globe" },
  ];

  const displayStats = stats && stats.length > 0 ? stats : defaultStats;

  return (
    <section className="py-16 border-y bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 max-w-4xl mx-auto">
          {displayStats.map((stat) => (
            <div key={stat.key} className="text-center space-y-1.5 sm:space-y-2">
              <div className="inline-flex items-center justify-center h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/10 text-primary mx-auto">
                {getStatIcon(stat.icon)}
              </div>
              <p className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">{stat.value}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ────────────────────────────────────────────────────────────
function HowItWorksSection() {
  const { t } = useTranslation();
  const steps = [
    {
      icon: <Users className="h-6 w-6" />,
      title: t('landing.step1Title'),
      description: t('landing.step1Desc'),
    },
    {
      icon: <BookOpen className="h-6 w-6" />,
      title: t('landing.step2Title'),
      description: t('landing.step2Desc'),
    },
    {
      icon: <Brain className="h-6 w-6" />,
      title: t('landing.step3Title'),
      description: t('landing.step3Desc'),
    },
    {
      icon: <Trophy className="h-6 w-6" />,
      title: t('landing.step4Title'),
      description: t('landing.step4Desc'),
    },
  ];

  return (
    <section className="py-20">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-12 space-y-3">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{t('landing.howItWorks')}</h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            {t('landing.howItWorksSubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {steps.map((step, i) => (
            <Card key={i} className="relative text-center border-dashed hover:border-solid hover:shadow-md transition-all">
              <CardContent className="pt-5 sm:pt-8 pb-4 sm:pb-6 px-3 sm:px-6 space-y-2 sm:space-y-4">
                <div className="inline-flex items-center justify-center h-10 w-10 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-primary/10 text-primary mx-auto">
                  {step.icon}
                </div>
                <h3 className="font-semibold text-sm sm:text-lg">{step.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Category Cards ──────────────────────────────────────────────────────────
function CategoryCard({ category, competitions, isLoading }: {
  category: Category;
  competitions: Competition[];
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const styles = CATEGORY_STYLES[category];

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="space-y-4">
          <Skeleton className="h-14 w-14 rounded-2xl" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-44" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const competition = getNextUpcomingCompetition(competitions);
  const hasRegistrationOpen = competitions.some(c => isRegistrationOpen(c));

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 relative overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${styles.gradient}`} />
      <CardHeader className="space-y-4 pt-7">
        <div className={`inline-flex items-center justify-center h-14 w-14 rounded-2xl ${styles.iconBg}`}>
          {getCategoryIcon(category)}
        </div>
        <div className="space-y-1.5">
          <CardTitle className="text-2xl font-bold">{t(getCategoryTitleKey(category))}</CardTitle>
          <Badge variant="secondary" className="font-normal">{t(getCategoryAgesKey(category))}</Badge>
          <CardDescription className="text-sm pt-1">{t(getCategoryDescKey(category))}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {competition && (
          <p className="text-sm text-muted-foreground font-medium">{competition.title}</p>
        )}

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
            <div className="space-y-1">
              <p className="text-sm font-medium">{t('landing.registration')}</p>
              {hasRegistrationOpen ? (
                <Badge className="bg-green-600 text-white">{t('landing.openNow')}</Badge>
              ) : competition?.registrationStartTime ? (
                new Date(competition.registrationStartTime) > new Date() ? (
                  <div className="space-y-1">
                    <Badge variant="secondary">{t('landing.opensIn')}</Badge>
                    <CountdownTimer targetDate={competition.registrationStartTime} size="sm" showLabels={false} />
                  </div>
                ) : (
                  <Badge variant="outline">{t('landing.closed')}</Badge>
                )
              ) : (
                <Badge variant="outline">{t('landing.notScheduled')}</Badge>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Trophy className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
            <div className="space-y-1">
              <p className="text-sm font-medium">{t('landing.competition')}</p>
              {competition?.competitionStartTime ? (
                new Date(competition.competitionStartTime) > new Date() ? (
                  <div className="space-y-1">
                    <Badge variant="secondary">{t('landing.startsIn')}</Badge>
                    <CountdownTimer targetDate={competition.competitionStartTime} size="sm" showLabels={false} />
                  </div>
                ) : competition?.competitionEndTime && new Date(competition.competitionEndTime) > new Date() ? (
                  <Badge className="bg-green-600 text-white">{t('landing.inProgress')}</Badge>
                ) : (
                  <Badge variant="outline">{t('landing.ended')}</Badge>
                )
              ) : (
                <Badge variant="outline">{t('landing.notScheduled')}</Badge>
              )}
            </div>
          </div>
        </div>

        {hasRegistrationOpen ? (
          <Link href={`/register/${category}`}>
            <Button className={`w-full gap-2 bg-gradient-to-r ${styles.gradient} text-white hover:opacity-90`}>
              {t('landing.registerNow')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        ) : (
          <Button className="w-full gap-2" disabled>
            {t('landing.registrationClosed')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function CategoriesSection() {
  const { t } = useTranslation();
  const { data: competitions, isLoading } = useQuery<Competition[]>({
    queryKey: ["/api/competitions/public"],
  });

  return (
    <section className="py-20 bg-muted/20">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-12 space-y-3">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{t('landing.chooseCategory')}</h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            {t('landing.chooseCategorySubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CATEGORIES.map((category) => (
            <CategoryCard
              key={category}
              category={category}
              competitions={competitions?.filter(c => c.category === category) || []}
              isLoading={isLoading}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials Section ────────────────────────────────────────────────────
function TestimonialsSection() {
  const { t } = useTranslation();
  const { data: testimonials } = useQuery<Testimonial[]>({
    queryKey: ["/api/marketing/testimonials"],
  });

  // Show nothing if no testimonials
  if (!testimonials || testimonials.length === 0) return null;

  return (
    <section className="py-20">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-12 space-y-3">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{t('landing.whatReadersSay')}</h2>
          <p className="text-muted-foreground text-lg">
            {t('landing.whatReadersSaySubtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.slice(0, 6).map((testimonial) => (
            <Card key={testimonial.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6 space-y-4">
                <div className="flex gap-0.5">
                  {Array.from({ length: testimonial.rating || 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground italic">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                    {testimonial.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{testimonial.name}</p>
                    {testimonial.role && <p className="text-xs text-muted-foreground capitalize">{testimonial.role}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Newsletter Section ──────────────────────────────────────────────────────
function NewsletterSection() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const { toast } = useToast();

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/marketing/subscribe", { email, name: name || undefined });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t('landing.subscribed'), description: t('landing.subscribedDesc') });
      setEmail("");
      setName("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <section className="py-20 bg-muted/30 border-y">
      <div className="container mx-auto px-4 max-w-xl text-center space-y-6">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 text-primary mx-auto">
          <Mail className="h-7 w-7" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{t('landing.stayInLoop')}</h2>
        <p className="text-muted-foreground">
          {t('landing.stayInLoopDesc')}
        </p>
        <form
          onSubmit={(e) => { e.preventDefault(); subscribeMutation.mutate(); }}
          className="space-y-3"
        >
          <div className="flex flex-col md:flex-row gap-2">
            <Input
              type="text"
              placeholder={t('landing.yourName')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="md:w-40"
            />
            <Input
              type="email"
              placeholder={t('landing.yourEmail')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1"
            />
            <Button type="submit" disabled={subscribeMutation.isPending} className="gap-2 w-full md:w-auto">
              {subscribeMutation.isPending ? "..." : t('landing.subscribe')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t('landing.noSpam')}</p>
        </form>
      </div>
    </section>
  );
}

// ─── Results Section ─────────────────────────────────────────────────────────
function ResultsLeaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  const { t } = useTranslation();
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">{t('landing.noParticipantsYet')}</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div
          key={`${entry.rank}-${entry.name}`}
          className={`flex items-center gap-3 flex-wrap p-3 rounded-lg ${
            entry.rank <= 3 ? "bg-muted/60" : ""
          }`}
        >
          <div className="flex items-center justify-center w-8 shrink-0">
            {getRankIcon(entry.rank) || (
              <span className="text-sm font-medium text-muted-foreground">{entry.rank}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{entry.name}</p>
            {(entry.city || entry.country) && (
              <p className="text-xs text-muted-foreground truncate">
                {[entry.city, entry.country].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="font-semibold tabular-nums">{Math.round(entry.finalScore).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{t('landing.points')}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ResultsSection() {
  const { t } = useTranslation();
  const { data: results, isLoading } = useQuery<PublicResults>({
    queryKey: ["/api/public/results"],
  });

  const [activeTab, setActiveTab] = useState<string>("kid");

  return (
    <section className="py-20">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-10 space-y-3">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{t('landing.leaderboard')}</h2>
          <p className="text-muted-foreground text-lg">
            {t('landing.leaderboardSubtitle')}
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="kid" className="text-xs sm:text-sm px-2 sm:px-3">{t('landing.kidsTitle')} <span className="hidden sm:inline">(6-12)</span></TabsTrigger>
                <TabsTrigger value="teen" className="text-xs sm:text-sm px-2 sm:px-3">{t('landing.teensTitle')} <span className="hidden sm:inline">(13-17)</span></TabsTrigger>
                <TabsTrigger value="adult" className="text-xs sm:text-sm px-2 sm:px-3">{t('landing.adultsTitle')} <span className="hidden sm:inline">(18+)</span></TabsTrigger>
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
                  {CATEGORIES.map((cat) => (
                    <TabsContent key={cat} value={cat}>
                      {(() => {
                        const catResults = results?.[cat] || [];
                        const hasPublished = catResults.some(cr => cr.competition.resultsPublished);
                        if (catResults.length === 0) {
                          return (
                            <div className="text-center py-8 space-y-2">
                              <Clock className="h-8 w-8 text-muted-foreground mx-auto" />
                              <p className="text-muted-foreground">{t('landing.noCompetitionsYet')}</p>
                            </div>
                          );
                        }
                        if (!hasPublished) {
                          return (
                            <div className="text-center py-8 space-y-2">
                              <Clock className="h-8 w-8 text-muted-foreground mx-auto" />
                              <p className="font-medium">{t('landing.resultsAnnouncedSoon')}</p>
                              <p className="text-sm text-muted-foreground">{t('landing.resultsBeingReviewed')}</p>
                            </div>
                          );
                        }
                        return (
                          <div className="space-y-6">
                            {catResults
                              .filter(cr => cr.competition.resultsPublished)
                              .map((cr) => (
                                <div key={cr.competition.id} className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <Award className="h-4 w-4 text-muted-foreground" />
                                    <h4 className="font-medium text-sm">{cr.competition.title}</h4>
                                  </div>
                                  <ResultsLeaderboard entries={cr.leaderboard} />
                                </div>
                              ))}
                          </div>
                        );
                      })()}
                    </TabsContent>
                  ))}
                </>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────
function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="border-t bg-muted/20 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
          <div className="space-y-3">
            <h3 className="font-bold text-lg">{t('landing.title')}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('landing.footerDesc')}
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">{t('landing.quickLinks')}</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/register/kid" className="hover:text-foreground transition-colors">{t('landing.registerKids')}</Link>
              <Link href="/register/teen" className="hover:text-foreground transition-colors">{t('landing.registerTeens')}</Link>
              <Link href="/register/adult" className="hover:text-foreground transition-colors">{t('landing.registerAdults')}</Link>
              <Link href="/login" className="hover:text-foreground transition-colors">{t('landing.studentLogin')}</Link>
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">{t('landing.admin')}</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/admin-login" className="hover:text-foreground transition-colors">{t('landing.adminDashboard')}</Link>
            </div>
          </div>
        </div>
        <Separator className="my-8" />
        <p className="text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} {t('landing.copyright')}
        </p>
      </div>
    </footer>
  );
}

// ─── Main Landing Page ───────────────────────────────────────────────────────
export default function LandingPage() {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Top promotional banner */}
      <TopBanner />

      {/* Sticky navigation */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 flex items-center justify-between gap-4 h-14">
          <Link href="/">
            <span className="font-bold text-lg tracking-tight cursor-pointer">
              Speed<span className="text-primary">Read</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            {user ? (
              <Link href={isAdmin ? "/admin" : "/dashboard"}>
                <Button variant="default" size="sm">
                  {isAdmin ? t('landing.adminPanel') : t('landing.dashboard')}
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button variant="outline" size="sm">{t('landing.studentLogin')}</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Page sections */}
      <HeroSection />
      <StatsSection />
      <HowItWorksSection />
      <CategoriesSection />
      <TestimonialsSection />
      <ResultsSection />
      <NewsletterSection />
      <Footer />
    </div>
  );
}
