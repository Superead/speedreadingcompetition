import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { DurationTimer } from "@/components/countdown-timer";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Clock, BookOpen, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import type { Book, Submission, CompetitionSettings } from "@shared/schema";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ReadingData {
  book: Book | null;
  submission: Submission | null;
  settings: CompetitionSettings | null;
}

export default function CompetitionReadPage() {
  const { token } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [autoFinishing, setAutoFinishing] = useState(false);
  const finishingRef = useRef(false);

  const { data, isLoading, refetch } = useQuery<ReadingData>({
    queryKey: ["/api/student/reading"],
    enabled: !!token,
  });

  const startReadingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/student/start-reading", {});
      return res.json();
    },
    onSuccess: () => {
      setHasStarted(true);
      refetch();
      toast({
        title: t('reading.started'),
        description: t('reading.timerBegun'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const finishReadingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/student/finish-reading", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/dashboard"] });
      toast({
        title: t('reading.completed'),
        description: t('reading.nowAnswer'),
      });
      navigate("/competition/questions");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to finish",
        description: error.message,
        variant: "destructive",
      });
      finishingRef.current = false;
      setAutoFinishing(false);
    },
  });

  const isReadingActive = data?.submission?.readingStartAt && !data?.submission?.readingEndAt;
  const hasFinishedReading = data?.submission?.readingEndAt != null;
  const hasCompletedCompetition = data?.submission?.answerEndAt != null;

  // Block copy shortcuts (Ctrl+C, Ctrl+A, Ctrl+U) on reading page
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["c", "a", "u", "s"].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
      // Block PrintScreen
      if (e.key === "PrintScreen") {
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (hasCompletedCompetition) {
      toast({
        title: "Competition already completed",
        description: "You have already finished this competition. Results will be announced soon.",
      });
      navigate("/dashboard");
      return;
    }
    if (hasFinishedReading) {
      navigate("/competition/questions");
    }
  }, [hasFinishedReading, hasCompletedCompetition, navigate]);

  // Auto-finish reading ONLY if reading was actively started before competition ended
  useEffect(() => {
    if (!isReadingActive || !data?.settings?.competitionEndTime || autoFinishing || hasFinishedReading) return;
    // Only auto-finish if reading was started BEFORE the competition ended
    if (!data?.submission?.readingStartAt) return;

    const competitionEnd = new Date(data.settings.competitionEndTime);
    const readingStarted = new Date(data.submission.readingStartAt);
    const now = new Date();

    // If reading was started after competition ended (shouldn't happen but safety check), don't auto-finish
    if (readingStarted > competitionEnd) return;

    const triggerAutoFinish = () => {
      if (finishingRef.current || autoFinishing) return;
      finishingRef.current = true;
      setAutoFinishing(true);
      toast({
        title: "Competition has ended",
        description: "Finishing reading and submitting your attempt.",
        variant: "destructive",
      });
      finishReadingMutation.mutate();
    };

    if (now > competitionEnd) {
      triggerAutoFinish();
      return;
    }

    const timeUntilEnd = competitionEnd.getTime() - now.getTime();
    if (timeUntilEnd > 0) {
      const timeout = setTimeout(triggerAutoFinish, timeUntilEnd);
      return () => clearTimeout(timeout);
    }
  }, [isReadingActive, data?.settings?.competitionEndTime, autoFinishing, hasFinishedReading]);

  const handleTimeUp = () => {
    if (isReadingActive && !finishingRef.current) {
      finishingRef.current = true;
      setAutoFinishing(true);
      toast({
        title: "Time's up!",
        description: "Your reading time has ended.",
        variant: "destructive",
      });
      finishReadingMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-16 border-b bg-card">
          <Skeleton className="h-full w-full" />
        </div>
        <div className="container mx-auto p-8">
          <Skeleton className="h-[600px] w-full" />
        </div>
      </div>
    );
  }

  if (!data?.book) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
            <h2 className="text-xl font-semibold">{t('reading.noBook')}</h2>
            <p className="text-muted-foreground">
              {t('reading.noBookDesc')}
            </p>
            <Button onClick={() => navigate("/dashboard")}>
              {t('common.backToDashboard')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isReadingActive && !hasStarted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardContent className="pt-6 space-y-6">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">{data.book.title}</h2>
              <p className="text-muted-foreground">
                {t('reading.youHaveMinutes', { minutes: data.settings?.readingDurationMinutes || 30 })}
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t('reading.instructions')}
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• {t('reading.instruction1')}</li>
                <li>• {t('reading.instruction2')}</li>
                <li>• {t('reading.instruction3')}</li>
                <li>• {t('reading.instruction4')}</li>
              </ul>
            </div>

            <Button 
              className="w-full" 
              size="lg"
              onClick={() => startReadingMutation.mutate()}
              disabled={startReadingMutation.isPending}
              data-testid="button-start-reading-now"
            >
              {startReadingMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('reading.starting')}
                </>
              ) : (
                t('reading.startReading')
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const readingStart = data.submission?.readingStartAt ? new Date(data.submission.readingStartAt) : new Date();
  const durationMinutes = data.settings?.readingDurationMinutes || 30;
  const endTime = new Date(readingStart.getTime() + durationMinutes * 60 * 1000);
  const progress = Math.max(0, Math.min(100, ((Date.now() - readingStart.getTime()) / (durationMinutes * 60 * 1000)) * 100));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 border-b bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <BookOpen className="h-5 w-5 text-primary shrink-0" />
              <span className="font-semibold hidden sm:inline truncate">{data.book.title}</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <div className="flex items-center gap-1.5 sm:gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground hidden sm:inline">{t('reading.timeRemaining')}:</span>
                <DurationTimer
                  startTime={readingStart}
                  durationMinutes={durationMinutes}
                  onComplete={handleTimeUp}
                  size="sm"
                />
              </div>
            </div>
          </div>
          <Progress value={progress} className="mt-2 h-1" />
        </div>
      </header>

      <main className="flex-1 container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <Card className="max-w-4xl mx-auto">
          <CardContent className="p-4 sm:p-6 md:p-8">
            <ScrollArea className="h-[calc(100vh-220px)] sm:h-[60vh]">
              <div
                className="prose prose-lg dark:prose-invert max-w-none select-none"
                data-testid="book-content"
                style={{ WebkitUserSelect: "none", userSelect: "none" }}
                onCopy={(e) => e.preventDefault()}
                onCut={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
              >
                {data.book.content ? (
                  <div dangerouslySetInnerHTML={{ __html: data.book.content.replace(/\n/g, '<br><br>') }} />
                ) : data.book.fileUrl ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">PDF viewer placeholder</p>
                    <a 
                      href={data.book.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      Open PDF in new tab
                    </a>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-12">
                    No content available
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </main>

      <footer className="sticky bottom-0 border-t bg-card py-4">
        <div className="container mx-auto px-4 flex justify-center">
          <Button 
            size="lg" 
            onClick={() => setShowFinishDialog(true)}
            className="gap-2"
            data-testid="button-finish-reading"
          >
            <CheckCircle className="h-5 w-5" />
            {t('reading.finishReading')}
          </Button>
        </div>
      </footer>

      <AlertDialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('reading.finishReadingTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('reading.finishReadingDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('reading.keepReading')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (finishingRef.current) return;
                finishingRef.current = true;
                setAutoFinishing(true);
                finishReadingMutation.mutate();
              }}
              disabled={finishReadingMutation.isPending}
            >
              {finishReadingMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('reading.finishing')}
                </>
              ) : (
                t('reading.yesFinish')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
