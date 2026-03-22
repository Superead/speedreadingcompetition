import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DurationTimer } from "@/components/countdown-timer";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Clock, CheckCircle, Loader2, HelpCircle } from "lucide-react";
import type { Question, Submission, CompetitionSettings, Answer } from "@shared/schema";
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

interface QuestionsData {
  questions: Question[];
  submission: Submission | null;
  settings: CompetitionSettings | null;
  answers: Answer[];
}

export default function CompetitionQuestionsPage() {
  const { token } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const finishingRef = useRef(false);

  const { data, isLoading } = useQuery<QuestionsData>({
    queryKey: ["/api/student/questions"],
    enabled: !!token,
  });

  // Block copy shortcuts on questions page
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["c", "a", "u", "s"].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (data?.answers) {
      const existingAnswers: Record<string, string> = {};
      data.answers.forEach((answer) => {
        const qId = answer.competitionQuestionId || answer.questionId;
        if (qId) {
          existingAnswers[qId] = answer.value || "";
        }
      });
      setAnswers(existingAnswers);
    }
  }, [data?.answers]);

  const saveAllAnswersAndFinish = async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setIsSubmitting(true);

    try {
      const answeredQuestions = Object.entries(answers).filter(([, value]) => value);

      for (const [questionId, value] of answeredQuestions) {
        await apiRequest("POST", "/api/student/answers", { questionId, value });
      }

      const res = await apiRequest("POST", "/api/student/finish-competition", {});
      const result = await res.json();

      queryClient.invalidateQueries({ queryKey: ["/api/student/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/student/my-results"] });
      toast({
        title: t('questions.submissionReceived'),
        description: t('questions.viewResults'),
      });
      navigate("/competition/results");
    } catch (error: any) {
      toast({
        title: t('landing.failedToSubmit'),
        description: error.message || t('landing.somethingWentWrong'),
        variant: "destructive",
      });
      finishingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleTimeUp = () => {
    if (finishingRef.current) return;
    toast({
      title: t('landing.timesUp'),
      description: t('landing.autoSubmitting'),
      variant: "destructive",
    });
    saveAllAnswersAndFinish();
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const hasCompletedCompetition = data?.submission?.answerEndAt != null;

  useEffect(() => {
    if (hasCompletedCompetition) {
      navigate("/competition/results");
    }
  }, [hasCompletedCompetition, navigate]);

  // Auto-submit ONLY if answering was started before competition ended
  useEffect(() => {
    if (!data?.settings?.competitionEndTime || isSubmitting || hasCompletedCompetition) return;
    // Only auto-submit if the student actually started answering (reading was completed)
    if (!data?.submission?.readingEndAt) return;

    const competitionEnd = new Date(data.settings.competitionEndTime);
    const readingEnded = new Date(data.submission.readingEndAt);
    const now = new Date();

    // If reading ended after competition ended, don't auto-submit
    if (readingEnded > competitionEnd) return;

    const triggerAutoSubmit = () => {
      if (finishingRef.current || isSubmitting) return;
      toast({
        title: t('landing.competitionHasEnded'),
        description: t('landing.submissionSaved'),
        variant: "destructive",
      });
      saveAllAnswersAndFinish();
    };

    if (now > competitionEnd) {
      triggerAutoSubmit();
      return;
    }

    const timeUntilEnd = competitionEnd.getTime() - now.getTime();
    if (timeUntilEnd > 0) {
      const timeout = setTimeout(triggerAutoSubmit, timeUntilEnd);
      return () => clearTimeout(timeout);
    }
  }, [data?.settings?.competitionEndTime, isSubmitting, hasCompletedCompetition]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-16 border-b bg-card">
          <Skeleton className="h-full w-full" />
        </div>
        <div className="container mx-auto p-8 space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!data?.submission?.readingEndAt) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <HelpCircle className="h-12 w-12 text-yellow-500 mx-auto" />
            <h2 className="text-xl font-semibold">{t('questions.readingNotCompleted')}</h2>
            <p className="text-muted-foreground">
              {t('questions.completeReadingFirst')}
            </p>
            <Button onClick={() => navigate("/competition/read")} data-testid="button-go-reading">
              {t('questions.goToReading')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const answerStart = data.submission.readingEndAt ? new Date(data.submission.readingEndAt) : new Date();
  const durationMinutes = data.settings?.answeringDurationMinutes || 15;
  const endTime = new Date(answerStart.getTime() + durationMinutes * 60 * 1000);
  const progress = Math.max(0, Math.min(100, ((Date.now() - answerStart.getTime()) / (durationMinutes * 60 * 1000)) * 100));

  const answeredCount = Object.keys(answers).filter((k) => answers[k]).length;
  const totalQuestions = data.questions?.length || 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 border-b bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <HelpCircle className="h-5 w-5 text-primary shrink-0" />
              <span className="font-semibold hidden sm:inline">{t('questions.title')}</span>
              <Badge variant="secondary" className="shrink-0 text-xs sm:text-sm">
                {answeredCount}/{totalQuestions}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-sm shrink-0">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground hidden sm:inline">{t('reading.timeRemaining')}:</span>
              <DurationTimer
                startTime={answerStart}
                durationMinutes={durationMinutes}
                onComplete={handleTimeUp}
                size="sm"
              />
            </div>
          </div>
          <Progress value={progress} className="mt-2 h-1" />
        </div>
      </header>

      <main
        className="flex-1 container mx-auto px-3 sm:px-4 py-4 sm:py-8 select-none"
        style={{ WebkitUserSelect: "none", userSelect: "none" }}
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      >
        <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
          {data.questions?.map((question, index) => {
            const options = question.optionsJson ? JSON.parse(question.optionsJson) : null;
            const currentAnswer = answers[question.id] || "";

            return (
              <Card key={question.id} data-testid={`card-question-${index}`}>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="shrink-0">
                      Q{index + 1}
                    </Badge>
                    <CardTitle className="text-lg font-medium leading-relaxed">
                      {question.prompt}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {question.type === "MCQ" && options ? (
                    <RadioGroup
                      value={currentAnswer}
                      onValueChange={(value) => handleAnswerChange(question.id, value)}
                    >
                      {Object.entries(options).map(([key, label]) => (
                        <div 
                          key={key} 
                          className="flex items-center space-x-3 p-3 rounded-md border hover-elevate cursor-pointer"
                        >
                          <RadioGroupItem 
                            value={key} 
                            id={`${question.id}-${key}`}
                            data-testid={`radio-${question.id}-${key}`}
                          />
                          <Label 
                            htmlFor={`${question.id}-${key}`}
                            className="flex-1 cursor-pointer"
                          >
                            <span className="font-semibold mr-2">{key}.</span>
                            {label as string}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <Textarea
                      placeholder={t('questions.typeAnswer')}
                      value={currentAnswer}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      className="min-h-24"
                      style={{ WebkitUserSelect: "text", userSelect: "text" }}
                      data-testid={`textarea-${question.id}`}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      <footer className="sticky bottom-0 border-t bg-card py-4">
        <div className="container mx-auto px-4 flex justify-center gap-4">
          <Button
            size="lg"
            onClick={() => setShowFinishDialog(true)}
            className="gap-2"
            disabled={isSubmitting}
            data-testid="button-finish-competition"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {t('questions.submitting')}
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5" />
                {t('questions.finishCompetition')}
              </>
            )}
          </Button>
        </div>
      </footer>

      <AlertDialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('questions.finishCompetitionTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('questions.finishCompetitionDesc', { answered: answeredCount, total: totalQuestions })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('questions.continueAnswering')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => saveAllAnswersAndFinish()}
              disabled={isSubmitting}
              data-testid="button-confirm-finish"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('questions.submitting')}
                </>
              ) : (
                t('questions.submitAnswers')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
