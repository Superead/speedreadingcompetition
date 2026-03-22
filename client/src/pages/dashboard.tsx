import { useQuery, useMutation } from "@tanstack/react-query";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  BookOpen, Copy, Trophy, Users, Clock, LogOut, Gift,
  ExternalLink, CheckCircle, Award, Medal, Share2,
  Twitter, Facebook, Linkedin, Link as LinkIcon, BarChart3, Globe
} from "lucide-react";
import type { Competition, CompetitionBook, Prize, User, Submission } from "@shared/schema";
import { SUPPORTED_LANGUAGES } from "@shared/schema";
import { useTranslation } from "react-i18next";
import { changeLanguage } from "@/lib/i18n";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const LANG_FLAGS: Record<string, string> = {
  tr: "🇹🇷", en: "🇬🇧", de: "🇩🇪", pl: "🇵🇱", fr: "🇫🇷", vi: "🇻🇳", hi: "🇮🇳",
};
const LANG_NAMES: Record<string, string> = {
  tr: "Türkçe", en: "English", de: "Deutsch", pl: "Polski", fr: "Français", vi: "Tiếng Việt", hi: "हिन्दी",
};

// ─── Types ───────────────────────────────────────────────────────────────────
interface LeaderboardEntry {
  rank: number;
  name: string;
  city: string | null;
  country: string | null;
  finalScore: number;
  readingSpeedWPM: number | null;
  comprehensionScore: number | null;
  readingSeconds: number | null;
  answerSeconds: number | null;
}

interface CompetitionSettings {
  id: string;
  category: string;
  registrationStartTime: Date | string | null;
  registrationEndTime: Date | string | null;
  competitionStartTime: Date | string | null;
  competitionEndTime: Date | string | null;
  readingDurationMinutes: number | null;
  answeringDurationMinutes: number | null;
  resultsPublishedAt: Date | string | null;
}

interface DashboardData {
  settings: CompetitionSettings | null;
  book: CompetitionBook | null;
  prize: Prize | null;
  referrals: User[];
  submission: Submission | null;
  competition: Competition | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  kid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  teen: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  adult: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

function formatDateTime(date: Date | string | null | undefined, locale?: string) {
  if (!date) return "—";
  return new Date(date).toLocaleString(locale || undefined);
}

// ─── Social Share Component ──────────────────────────────────────────────────
function SocialShareCard({ user, submission }: { user: User; submission: Submission | null }) {
  const { toast } = useToast();
  const { t } = useTranslation();

  const trackShare = useMutation({
    mutationFn: async (platform: string) => {
      await apiRequest("POST", "/api/marketing/share", {
        platform,
        shareType: submission?.answerEndAt ? "result" : "referral",
        referenceId: submission?.competitionId || undefined,
      });
    },
  });

  const shareText = submission?.answerEndAt && submission?.readingSpeedWPM
    ? `I just completed a speed reading competition with ${Math.round(submission.readingSpeedWPM)} WPM! Challenge yourself at`
    : `Join me in the Speed Reading Competition! Use my referral code: ${user.affiliateCode}`;

  const shareUrl = `${window.location.origin}/register/${user.category || "kid"}?ref=${user.affiliateCode}`;

  const handleShare = (platform: string) => {
    trackShare.mutate(platform);
    let url = "";
    switch (platform) {
      case "twitter":
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        break;
      case "facebook":
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
        break;
      case "linkedin":
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        break;
      case "whatsapp":
        url = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
        break;
      case "copy":
        navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        toast({ title: t('dashboard.copied'), description: t('dashboard.linkCopied') });
        return;
    }
    if (url) window.open(url, "_blank", "width=600,height=400");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Share2 className="h-5 w-5" />
          {t('dashboard.shareInvite')}
        </CardTitle>
        <CardDescription>
          {t('dashboard.shareInviteDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => handleShare("twitter")} className="gap-2">
            <Twitter className="h-4 w-4" /> Twitter
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleShare("facebook")} className="gap-2">
            <Facebook className="h-4 w-4" /> Facebook
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleShare("linkedin")} className="gap-2">
            <Linkedin className="h-4 w-4" /> LinkedIn
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleShare("whatsapp")} className="gap-2">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleShare("copy")} className="gap-2">
            <LinkIcon className="h-4 w-4" /> {t('dashboard.copyLink')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, logout, token } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();

  const languageMutation = useMutation({
    mutationFn: async (lang: string) => {
      await apiRequest("PUT", "/api/student/profile/language", { language: lang });
    },
  });

  const handleLanguageChange = (lang: string) => {
    changeLanguage(lang);
    languageMutation.mutate(lang);
  };

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/student/dashboard"],
    enabled: !!token,
  });

  const resultsPublished = data?.settings?.resultsPublishedAt != null;

  const { data: leaderboardData, isLoading: leaderboardLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/student/leaderboard", user?.category],
    enabled: !!token && !!user?.category && resultsPublished,
  });

  const handleCopyCode = () => {
    if (user?.affiliateCode) {
      navigator.clipboard.writeText(user.affiliateCode);
      toast({ title: t('dashboard.copied'), description: t('dashboard.codeCopied') });
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
    if (now < start) return false;
    if (data?.settings?.competitionEndTime) {
      const end = new Date(data.settings.competitionEndTime);
      if (now > end) return false;
    }
    return !data.submission?.readingStartAt;
  };

  const isCompetitionEnded = () => {
    if (!data?.settings?.competitionEndTime) return false;
    return new Date() > new Date(data.settings.competitionEndTime);
  };

  const hasCompletedCompetition = () => data?.submission?.answerEndAt != null;
  const isReadingInProgress = () => data?.submission?.readingStartAt && !data?.submission?.readingEndAt;
  const isAnsweringInProgress = () => data?.submission?.readingEndAt && !data?.submission?.answerEndAt;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">{t('dashboard.pleaseLogin')}</p>
            <Link href="/login"><Button className="mt-4">{t('dashboard.goToLogin')}</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <span className="font-bold text-lg tracking-tight cursor-pointer">
                Speed<span className="text-primary">Read</span>
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <Globe className="h-4 w-4" />
                  <span className="text-base">{LANG_FLAGS[i18n.language] || "🌐"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={i18n.language === lang.code ? "bg-accent font-semibold" : ""}
                  >
                    <span className="mr-2">{lang.flag}</span>
                    {lang.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2" data-testid="button-logout">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t('common.logout')}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Left sidebar */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6">
            {/* Profile card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {user.name} {user.surname}
                </CardTitle>
                <CardDescription>
                  <Badge className={CATEGORY_COLORS[user.category || ""] || "bg-muted"}>
                    {t(`dashboard.category_${user.category || "kid"}`)}
                  </Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Competition Language picker (separate from UI language) */}
                {(() => {
                  const userLang = (user as any).preferredLanguage || "tr";
                  const langObj = SUPPORTED_LANGUAGES.find(l => l.code === userLang);
                  const compLangs = data?.competition ? ((data.competition as any).supportedLanguages || "tr").split(",") : [];
                  const allLangs = compLangs.length > 1 ? compLangs : SUPPORTED_LANGUAGES.map(l => l.code);
                  const canChange = !data?.submission?.readingStartAt;
                  return (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">{t('dashboard.competitionLanguage')}</p>
                      {canChange ? (
                        <div className="flex flex-wrap gap-1">
                          {allLangs.map((code: string) => {
                            const l = SUPPORTED_LANGUAGES.find(sl => sl.code === code);
                            if (!l) return null;
                            return (
                              <Button
                                key={code}
                                size="sm"
                                variant={userLang === code ? "default" : "outline"}
                                onClick={async () => {
                                  try {
                                    await apiRequest("PUT", "/api/student/profile/language", { language: code });
                                    // Update local user object without changing UI language
                                    const storedUser = localStorage.getItem("user");
                                    if (storedUser) {
                                      const parsed = JSON.parse(storedUser);
                                      parsed.preferredLanguage = code;
                                      localStorage.setItem("user", JSON.stringify(parsed));
                                    }
                                    // Refetch dashboard data to get book/questions in new language
                                    queryClient.invalidateQueries({ queryKey: ["/api/student/dashboard"] });
                                    toast({ title: `${l.flag} ${l.name}`, description: t('dashboard.competitionLangChanged') });
                                    // Force re-render by reloading (user object in state needs update)
                                    window.location.reload();
                                  } catch {
                                    toast({ title: t('dashboard.langChangeFailed'), variant: "destructive" });
                                  }
                                }}
                                data-testid={`dash-lang-${code}`}
                              >
                                {l.flag} {l.name}
                              </Button>
                            );
                          })}
                        </div>
                      ) : (
                        <Badge variant="secondary" className="text-sm">
                          {langObj?.flag} {langObj?.name}
                        </Badge>
                      )}
                    </div>
                  );
                })()}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{t('dashboard.yourReferralCode')}</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-muted px-3 py-2 rounded-md font-mono text-lg tracking-wider" data-testid="text-affiliate-code">
                      {user.affiliateCode}
                    </code>
                    <Button variant="outline" size="icon" onClick={handleCopyCode} data-testid="button-copy-code">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('dashboard.shareCodeHint')}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Referrals */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-5 w-5" />
                  {t('dashboard.referrals')}
                </CardTitle>
                <CardDescription>
                  <span className="text-2xl font-bold text-foreground" data-testid="text-referral-points">
                    {user.referralPoints || 0}
                  </span>{" "}{t('dashboard.pointsEarned')}
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
                          <span className="text-sm font-medium">{referral.name} {referral.surname}</span>
                          <Badge variant="outline" className="text-xs">
                            {t(`dashboard.category_${referral.category || "kid"}`)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('dashboard.shareCode')}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Social sharing */}
            <SocialShareCard user={user} submission={data?.submission || null} />
          </div>

          {/* Main content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Competition Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {t('dashboard.competitionStatus')}
                </CardTitle>
                {data?.competition && (
                  <CardDescription data-testid="text-competition-name">{data.competition.title}</CardDescription>
                )}
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
                      <h3 className="text-xl font-semibold">{t('dashboard.submissionReceived')}</h3>
                      {resultsPublished ? (
                        <p className="text-muted-foreground">{t('dashboard.resultsPublished')}</p>
                      ) : (
                        <p className="text-muted-foreground">{t('dashboard.resultsWaiting')}</p>
                      )}
                      {data?.submission && (
                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                          {data.submission.readingSeconds != null && (
                            <div className="bg-muted rounded-lg p-2 sm:p-3 text-center">
                              <p className="text-[10px] sm:text-xs text-muted-foreground">{t('dashboard.readingTimeLabel')}</p>
                              <p className="font-bold text-base sm:text-lg">{Math.floor(data.submission.readingSeconds / 60)}m {data.submission.readingSeconds % 60}s</p>
                            </div>
                          )}
                          {data.submission.mcqCorrectCount != null && data.submission.mcqTotalCount != null && (
                            <div className="bg-muted rounded-lg p-2 sm:p-3 text-center">
                              <p className="text-[10px] sm:text-xs text-muted-foreground">{t('dashboard.correct')}</p>
                              <p className="font-bold text-base sm:text-lg">{data.submission.mcqCorrectCount}/{data.submission.mcqTotalCount}</p>
                            </div>
                          )}
                          {data.submission.readingSpeedWPM != null && data.submission.readingSpeedWPM > 0 && (
                            <div className="bg-muted rounded-lg p-2 sm:p-3 text-center">
                              <p className="text-[10px] sm:text-xs text-muted-foreground">{t('dashboard.speed')}</p>
                              <p className="font-bold text-base sm:text-lg">{Math.round(data.submission.readingSpeedWPM)} WPM</p>
                            </div>
                          )}
                          {resultsPublished && data.submission.finalScore != null && (
                            <div className="bg-primary/10 rounded-lg p-2 sm:p-3 text-center">
                              <p className="text-[10px] sm:text-xs text-muted-foreground">{t('dashboard.score')}</p>
                              <p className="font-bold text-base sm:text-lg text-primary">{Math.round(data.submission.finalScore).toLocaleString()}</p>
                            </div>
                          )}
                        </div>
                      )}
                      <Link href="/competition/results">
                        <Button className="mt-4 gap-2">
                          <BarChart3 className="h-4 w-4" />
                          {t('dashboard.viewFullResults')}
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : isCompetitionEnded() ? (
                  <div className="text-center py-6 space-y-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted">
                      <Clock className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">{t('dashboard.competitionEnded')}</h3>
                      <p className="text-muted-foreground">{t('dashboard.competitionEndedDesc')}</p>
                    </div>
                  </div>
                ) : data?.settings?.competitionStartTime ? (
                  <div className="space-y-4">
                    {new Date() < new Date(data.settings.competitionStartTime) ? (
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-2">{t('dashboard.competitionStartsIn')}</p>
                        <CountdownTimer targetDate={data.settings.competitionStartTime} size="lg" className="justify-center" />
                      </div>
                    ) : (
                      <div className="text-center py-2">
                        <Badge variant="default" className="text-lg px-4 py-2">{t('dashboard.competitionOpen')}</Badge>
                      </div>
                    )}
                    <Separator />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs sm:text-sm">{t('dashboard.registrationOpens')}</p>
                        <p className="font-medium text-sm">{formatDateTime(data.settings.registrationStartTime, i18n.language)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs sm:text-sm">{t('dashboard.registrationCloses')}</p>
                        <p className="font-medium text-sm">{formatDateTime(data.settings.registrationEndTime, i18n.language)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs sm:text-sm">{t('dashboard.competitionStarts')}</p>
                        <p className="font-medium text-sm">{formatDateTime(data.settings.competitionStartTime, i18n.language)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs sm:text-sm">{t('dashboard.competitionCloses')}</p>
                        <p className="font-medium text-sm">{formatDateTime(data.settings.competitionEndTime, i18n.language)}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-sm text-muted-foreground">{t('dashboard.readingTime')}</p>
                        <p className="text-xl font-bold">{data.settings.readingDurationMinutes} {t('dashboard.min')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t('dashboard.answeringTime')}</p>
                        <p className="text-xl font-bold">{data.settings.answeringDurationMinutes} {t('dashboard.min')}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-6">{t('dashboard.scheduleNotAnnounced')}</p>
                )}

                {isReadingInProgress() && (
                  <div className="text-center py-4">
                    <Badge variant="default" className="text-lg px-4 py-2">{t('dashboard.readingInProgress')}</Badge>
                    <Link href="/competition/read">
                      <Button className="mt-4 w-full" data-testid="button-continue-reading">{t('dashboard.continueReading')}</Button>
                    </Link>
                  </div>
                )}

                {isAnsweringInProgress() && (
                  <div className="text-center py-4">
                    <Badge variant="default" className="text-lg px-4 py-2">{t('dashboard.answeringInProgress')}</Badge>
                    <Link href="/competition/questions">
                      <Button className="mt-4 w-full" data-testid="button-continue-questions">{t('dashboard.continueQuestions')}</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Book */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="h-5 w-5" />
                  {t('dashboard.book')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : data?.book ? (
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-lg" data-testid="text-book-title">{data.book.title}</h3>
                      <p className="text-sm text-muted-foreground" data-testid="text-reading-status">
                        {data?.submission?.answerEndAt
                          ? t('dashboard.competitionCompleted')
                          : !canStartReading() && data?.submission?.readingStartAt
                          ? t('dashboard.alreadyStartedReading')
                          : !canStartReading() && data?.settings?.competitionStartTime && new Date() < new Date(data.settings.competitionStartTime)
                          ? t('dashboard.competitionNotStarted')
                          : !canStartReading() && isCompetitionEnded()
                          ? t('dashboard.competitionEnded')
                          : t('dashboard.readyForCompetition')}
                      </p>
                    </div>
                    {data?.submission?.answerEndAt ? (
                      <Badge variant="secondary" className="shrink-0">{t('dashboard.completed')}</Badge>
                    ) : canStartReading() ? (
                      <Link href="/competition/read">
                        <Button data-testid="button-start-reading">{t('dashboard.startReading')}</Button>
                      </Link>
                    ) : (
                      <Button disabled data-testid="button-start-reading">{t('dashboard.startReading')}</Button>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">{t('dashboard.noBookYet')}</p>
                )}
              </CardContent>
            </Card>

            {/* Prizes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Gift className="h-5 w-5" />
                  {t('dashboard.prizes')}
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
                  <p className="text-center text-muted-foreground py-4">{t('dashboard.prizesComingSoon')}</p>
                )}
              </CardContent>
            </Card>

            {/* Leaderboard */}
            {resultsPublished && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Trophy className="h-5 w-5" />
                    {t('dashboard.leaderboard')}
                  </CardTitle>
                  <CardDescription>
                    {t('dashboard.topPerformers', { category: t(`dashboard.category_${user?.category || "kid"}`) })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {leaderboardLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : leaderboardData && leaderboardData.length > 0 ? (
                    <ScrollArea className="h-64 sm:h-80">
                      <div className="space-y-2">
                        {leaderboardData.slice(0, 20).map((entry) => (
                          <div
                            key={entry.rank}
                            className="flex items-center justify-between py-2 sm:py-3 px-3 sm:px-4 rounded-lg bg-muted"
                            data-testid={`leaderboard-entry-${entry.rank}`}
                          >
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                              {entry.rank === 1 && <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 shrink-0" />}
                              {entry.rank === 2 && <Medal className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 shrink-0" />}
                              {entry.rank === 3 && <Award className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 shrink-0" />}
                              {entry.rank > 3 && (
                                <span className="w-4 sm:w-5 text-center text-xs sm:text-sm font-medium text-muted-foreground shrink-0">{entry.rank}</span>
                              )}
                              <div className="min-w-0">
                                <p className="font-medium text-sm sm:text-base truncate">{entry.name}</p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                                  {[entry.city, entry.country].filter(Boolean).join(", ")}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <p className="font-bold text-sm sm:text-base" data-testid={`text-score-${entry.rank}`}>
                                {Math.round(entry.finalScore).toLocaleString()}
                              </p>
                              <p className="text-[10px] sm:text-xs text-muted-foreground">
                                {entry.readingSpeedWPM ? `${Math.round(entry.readingSpeedWPM)} WPM` : ""}
                                {entry.readingSpeedWPM && entry.comprehensionScore ? " | " : ""}
                                {entry.comprehensionScore ? `${t('dashboard.comp')}: ${entry.comprehensionScore.toFixed(1)}` : ""}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">{t('dashboard.noResultsYet')}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
