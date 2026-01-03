import { useState, useEffect } from "react";
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
import { Clock, CheckCircle, Loader2, HelpCircle, Send } from "lucide-react";
import type { Question, Submission, CompetitionSettings, Answer } from "@shared/schema";
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
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showFinishDialog, setShowFinishDialog] = useState(false);

  const { data, isLoading, refetch } = useQuery<QuestionsData>({
    queryKey: ["/api/student/questions"],
    enabled: !!token,
  });

  useEffect(() => {
    if (data?.answers) {
      const existingAnswers: Record<string, string> = {};
      data.answers.forEach((answer) => {
        existingAnswers[answer.questionId] = answer.value || "";
      });
      setAnswers(existingAnswers);
    }
  }, [data?.answers]);

  const submitAnswerMutation = useMutation({
    mutationFn: async ({ questionId, value }: { questionId: string; value: string }) => {
      const res = await apiRequest("POST", "/api/student/answers", { questionId, value });
      return res.json();
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Answer saved",
        description: "Your answer has been recorded.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const finishCompetitionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/student/finish-competition", {});
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/dashboard"] });
      toast({
        title: "Competition completed!",
        description: `Your score: ${data.score} points`,
      });
      navigate("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTimeUp = () => {
    toast({
      title: "Time's up!",
      description: "Auto-submitting your answers.",
      variant: "destructive",
    });
    finishCompetitionMutation.mutate();
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSaveAnswer = (questionId: string) => {
    const value = answers[questionId];
    if (value) {
      submitAnswerMutation.mutate({ questionId, value });
    }
  };

  const hasCompletedCompetition = data?.submission?.answerEndAt != null;

  useEffect(() => {
    if (hasCompletedCompetition) {
      navigate("/dashboard");
    }
  }, [hasCompletedCompetition, navigate]);

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
            <h2 className="text-xl font-semibold">Reading Not Completed</h2>
            <p className="text-muted-foreground">
              Please complete the reading section first.
            </p>
            <Button onClick={() => navigate("/competition/read")}>
              Go to Reading
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
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <HelpCircle className="h-5 w-5 text-primary" />
              <span className="font-semibold">Questions</span>
              <Badge variant="secondary">
                {answeredCount}/{totalQuestions} answered
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground hidden sm:inline">Time remaining:</span>
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

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {data.questions?.map((question, index) => {
            const options = question.optionsJson ? JSON.parse(question.optionsJson) : null;
            const currentAnswer = answers[question.id] || "";
            const isSaved = data.answers?.some((a) => a.questionId === question.id);

            return (
              <Card key={question.id} data-testid={`card-question-${index}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className="shrink-0">
                        Q{index + 1}
                      </Badge>
                      <CardTitle className="text-lg font-medium leading-relaxed">
                        {question.prompt}
                      </CardTitle>
                    </div>
                    {isSaved && (
                      <Badge variant="secondary" className="shrink-0 gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Saved
                      </Badge>
                    )}
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
                      placeholder="Type your answer here..."
                      value={currentAnswer}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      className="min-h-24"
                      data-testid={`textarea-${question.id}`}
                    />
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSaveAnswer(question.id)}
                    disabled={!currentAnswer || submitAnswerMutation.isPending}
                    className="gap-2"
                    data-testid={`button-save-${question.id}`}
                  >
                    {submitAnswerMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Save Answer
                  </Button>
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
            data-testid="button-finish-competition"
          >
            <CheckCircle className="h-5 w-5" />
            Finish Competition
          </Button>
        </div>
      </footer>

      <AlertDialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finish Competition?</AlertDialogTitle>
            <AlertDialogDescription>
              You have answered {answeredCount} of {totalQuestions} questions.
              Are you sure you want to submit? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Answering</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => finishCompetitionMutation.mutate()}
              disabled={finishCompetitionMutation.isPending}
            >
              {finishCompetitionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Answers"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
