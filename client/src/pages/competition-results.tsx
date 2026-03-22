import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "react-i18next";
import {
  Trophy, Medal, Award, Clock, CheckCircle, XCircle,
  BookOpen, Zap, Target, ArrowLeft, BarChart3, Hash,
  Timer, Brain, Star
} from "lucide-react";

interface AnswerDetail {
  questionId: string;
  prompt: string;
  type: string;
  options: Record<string, string> | null;
  correctAnswer: string | null;
  userAnswer: string | null;
  isCorrect: boolean | null;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  city: string | null;
  country: string | null;
  finalScore: number;
  readingSpeedWPM: number | null;
  comprehensionScore: number | null;
}

interface ResultsData {
  competition: {
    id: string;
    title: string;
    category: string;
    resultsPublished: boolean;
  };
  book: { title: string; wordCount: number | null } | null;
  submission: {
    readingSeconds: number | null;
    answerSeconds: number | null;
    readingSpeedWPM: number | null;
    comprehensionScore: number | null;
    finalScore: number | null;
    mcqCorrectCount: number | null;
    mcqWrongCount: number | null;
    mcqTotalCount: number | null;
    status: string;
  };
  rank: number | null;
  totalParticipants: number | null;
  leaderboard: LeaderboardEntry[];
  answerDetails: AnswerDetail[];
}

const CATEGORY_TITLES: Record<string, string> = {
  kid: "Kids (6-12)", teen: "Teens (13-17)", adult: "Adults (18+)",
};

function formatTime(seconds: number | null) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function getRankSuffix(rank: number) {
  if (rank % 100 >= 11 && rank % 100 <= 13) return "th";
  switch (rank % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

function ScoreRing({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex flex-col items-center gap-1.5 sm:gap-2">
      <div className="relative w-16 h-16 sm:w-20 sm:h-20">
        <svg className="w-16 h-16 sm:w-20 sm:h-20 -rotate-90" viewBox="0 0 36 36">
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/30"
          />
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none" stroke="currentColor" strokeWidth="3"
            strokeDasharray={`${pct}, 100`}
            className={color}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm sm:text-lg font-bold">{pct}%</span>
        </div>
      </div>
      <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">{label}</span>
    </div>
  );
}

export default function CompetitionResultsPage() {
  const { token, user } = useAuth();
  const { t } = useTranslation();

  const { data, isLoading, error } = useQuery<ResultsData>({
    queryKey: ["/api/student/my-results"],
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-semibold">{t('results.noResults')}</h2>
            <p className="text-muted-foreground">
              {t('results.noResultsDesc')}
            </p>
            <Link href="/dashboard">
              <Button>{t('common.backToDashboard')}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { competition, submission, book, rank, totalParticipants, leaderboard, answerDetails } = data;
  const correctRatio = submission.mcqTotalCount
    ? (submission.mcqCorrectCount || 0) / submission.mcqTotalCount
    : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                {t('common.backToDashboard')}
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{CATEGORY_TITLES[competition.category] || competition.category}</Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-4xl space-y-4 sm:space-y-6">
        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold">{t('results.yourResults')}</h1>
          <p className="text-muted-foreground">{competition.title}</p>
          {book && (
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <BookOpen className="h-4 w-4" /> {book.title}
              {book.wordCount && <span>({book.wordCount.toLocaleString()} words)</span>}
            </p>
          )}
        </div>

        {/* Rank Banner (if results published) */}
        {competition.resultsPublished && rank && (
          <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border-yellow-200 dark:border-yellow-800">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <div className="flex items-center gap-3">
                  {rank === 1 && <Trophy className="h-10 w-10 text-yellow-500" />}
                  {rank === 2 && <Medal className="h-10 w-10 text-gray-400" />}
                  {rank === 3 && <Award className="h-10 w-10 text-amber-600" />}
                  {rank > 3 && <Hash className="h-10 w-10 text-muted-foreground" />}
                  <div className="text-center sm:text-left">
                    <p className="text-3xl sm:text-4xl font-black">
                      {rank}<sup className="text-base sm:text-lg">{getRankSuffix(rank)}</sup>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      out of {totalParticipants} participants
                    </p>
                  </div>
                </div>
                {submission.finalScore != null && (
                  <div className="text-center px-4 sm:px-6 py-3 bg-white/60 dark:bg-black/20 rounded-xl">
                    <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">{t('results.finalScore')}</p>
                    <p className="text-2xl sm:text-3xl font-black text-primary">{Math.round(submission.finalScore).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Score not yet published notice */}
        {!competition.resultsPublished && (
          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
            <CardContent className="pt-6 text-center">
              <Clock className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <p className="font-semibold">{t('results.pending')}</p>
              <p className="text-sm text-muted-foreground">
                {t('results.pendingDesc')}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <Card>
            <CardContent className="pt-4 sm:pt-6 pb-4 text-center">
              <Timer className="h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-1.5 sm:mb-2 text-blue-500" />
              <p className="text-lg sm:text-2xl font-bold">{formatTime(submission.readingSeconds)}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{t('results.readingTime')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 sm:pt-6 pb-4 text-center">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-1.5 sm:mb-2 text-indigo-500" />
              <p className="text-lg sm:text-2xl font-bold">{formatTime(submission.answerSeconds)}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{t('results.answerTime')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 sm:pt-6 pb-4 text-center">
              <Zap className="h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-1.5 sm:mb-2 text-amber-500" />
              <p className="text-lg sm:text-2xl font-bold">
                {submission.readingSpeedWPM ? Math.round(submission.readingSpeedWPM) : "—"}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{t('results.wordsPerMin')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 sm:pt-6 pb-4 text-center">
              <Target className="h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-1.5 sm:mb-2 text-green-500" />
              <p className="text-lg sm:text-2xl font-bold">
                {submission.mcqCorrectCount ?? 0}/{submission.mcqTotalCount ?? 0}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{t('results.correctAnswers')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5" />
              {t('results.performanceBreakdown')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-around">
              <ScoreRing
                value={submission.mcqCorrectCount || 0}
                max={submission.mcqTotalCount || 1}
                label="Accuracy"
                color="text-green-500"
              />
              <ScoreRing
                value={Math.min(submission.readingSpeedWPM || 0, 500)}
                max={500}
                label="Speed"
                color="text-blue-500"
              />
              {submission.comprehensionScore != null && (
                <ScoreRing
                  value={submission.comprehensionScore}
                  max={10}
                  label="Comprehension"
                  color="text-purple-500"
                />
              )}
            </div>
            {submission.finalScore != null && competition.resultsPublished && (
              <div className="mt-6 text-center">
                <Separator className="mb-4" />
                <p className="text-sm text-muted-foreground">
                  Final Score = Comprehension Score x Reading Speed (WPM)
                </p>
                <p className="text-xl font-bold text-primary mt-1">
                  {submission.comprehensionScore?.toFixed(1)} x {Math.round(submission.readingSpeedWPM || 0)} = {Math.round(submission.finalScore).toLocaleString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Answer Review */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-5 w-5" />
              {t('results.answerReview')}
            </CardTitle>
            <CardDescription>
              {competition.resultsPublished ? (
                <>
                  {submission.mcqCorrectCount || 0} correct, {submission.mcqWrongCount || 0} wrong
                  {submission.mcqTotalCount && submission.mcqCorrectCount != null
                    ? ` — ${Math.round(correctRatio * 100)}% accuracy`
                    : ""}
                </>
              ) : (
                <>{answerDetails.length} {t('results.questionsAnswered')}</>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {answerDetails.map((q, idx) => (
              <div
                key={q.questionId}
                className={`p-3 sm:p-4 rounded-lg border ${
                  q.isCorrect === true
                    ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20"
                    : q.isCorrect === false
                    ? "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20"
                    : "border-muted"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="shrink-0 mt-0.5">Q{idx + 1}</Badge>
                  <div className="flex-1 space-y-2">
                    <p className="font-medium">{q.prompt}</p>

                    {q.type === "MCQ" && q.options && (
                      <div className="space-y-1 text-sm">
                        {Object.entries(q.options).map(([key, label]) => {
                          const isUserAnswer = q.userAnswer?.trim().toUpperCase() === key.toUpperCase();
                          const isCorrectAnswer = q.correctAnswer ? q.correctAnswer.trim().toUpperCase() === key.toUpperCase() : false;
                          return (
                            <div
                              key={key}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded ${
                                competition.resultsPublished && isCorrectAnswer
                                  ? "bg-green-100 dark:bg-green-900/30 font-medium"
                                  : competition.resultsPublished && isUserAnswer && !isCorrectAnswer
                                  ? "bg-red-100 dark:bg-red-900/30 line-through opacity-75"
                                  : isUserAnswer
                                  ? "bg-blue-50 dark:bg-blue-900/20 font-medium"
                                  : ""
                              }`}
                            >
                              <span className="font-semibold w-6">{key}.</span>
                              <span className="flex-1">{label as string}</span>
                              {competition.resultsPublished && isCorrectAnswer && (
                                <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                              )}
                              {competition.resultsPublished && isUserAnswer && !isCorrectAnswer && (
                                <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                              )}
                              {!competition.resultsPublished && isUserAnswer && (
                                <span className="text-xs text-blue-600 dark:text-blue-400 shrink-0">{t('results.yourAnswer')}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {q.type === "TEXT" && (
                      <div className="text-sm">
                        <p className="text-muted-foreground">{t('results.yourAnswer')}:</p>
                        <p className="mt-1 px-3 py-2 bg-muted rounded">{q.userAnswer || "No answer"}</p>
                      </div>
                    )}
                  </div>
                  <div className="shrink-0">
                    {q.isCorrect === true && <CheckCircle className="h-5 w-5 text-green-600" />}
                    {q.isCorrect === false && <XCircle className="h-5 w-5 text-red-500" />}
                    {q.isCorrect === null && !competition.resultsPublished && q.userAnswer && (
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Leaderboard (if published) */}
        {competition.resultsPublished && leaderboard.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-5 w-5" />
                {t('results.leaderboard')}
              </CardTitle>
              <CardDescription>
                Top {Math.min(20, leaderboard.length)} in {CATEGORY_TITLES[competition.category] || competition.category}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64 sm:h-80">
                <div className="space-y-2">
                  {leaderboard.map((entry) => {
                    const isMe = entry.name === `${user?.name} ${user?.surname?.charAt(0)}.`;
                    return (
                      <div
                        key={entry.rank}
                        className={`flex items-center justify-between py-2 sm:py-3 px-3 sm:px-4 rounded-lg ${
                          isMe
                            ? "bg-primary/10 border border-primary/20"
                            : "bg-muted"
                        }`}
                      >
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          {entry.rank === 1 && <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 shrink-0" />}
                          {entry.rank === 2 && <Medal className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 shrink-0" />}
                          {entry.rank === 3 && <Award className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 shrink-0" />}
                          {entry.rank > 3 && (
                            <span className="w-4 sm:w-5 text-center text-xs sm:text-sm font-medium text-muted-foreground shrink-0">
                              {entry.rank}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className={`font-medium text-sm sm:text-base truncate ${isMe ? "text-primary" : ""}`}>
                              {entry.name} {isMe && <Star className="inline h-3 w-3 ml-1" />}
                            </p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                              {[entry.city, entry.country].filter(Boolean).join(", ")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className="font-bold text-sm sm:text-base">{Math.round(entry.finalScore).toLocaleString()}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {entry.readingSpeedWPM ? `${Math.round(entry.readingSpeedWPM)} WPM` : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Back button */}
        <div className="text-center pb-8">
          <Link href="/dashboard">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t('common.backToDashboard')}
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
