import { useState, useEffect } from "react";
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
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

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
        title: "Reading started!",
        description: "Your timer has begun. Good luck!",
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
        title: "Reading completed!",
        description: "Now answer the questions.",
      });
      navigate("/competition/questions");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to finish",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isReadingActive = data?.submission?.readingStartAt && !data?.submission?.readingEndAt;
  const hasFinishedReading = data?.submission?.readingEndAt != null;

  useEffect(() => {
    if (hasFinishedReading) {
      navigate("/competition/questions");
    }
  }, [hasFinishedReading, navigate]);

  useEffect(() => {
    if (!isReadingActive || !data?.settings?.competitionEndTime) return;
    
    const competitionEnd = new Date(data.settings.competitionEndTime);
    const now = new Date();
    
    if (now > competitionEnd) {
      toast({
        title: "Competition has ended",
        description: "Finishing reading and submitting your attempt.",
        variant: "destructive",
      });
      finishReadingMutation.mutate();
      return;
    }
    
    const timeUntilEnd = competitionEnd.getTime() - now.getTime();
    if (timeUntilEnd > 0) {
      const timeout = setTimeout(() => {
        toast({
          title: "Competition has ended",
          description: "Finishing reading and submitting your attempt.",
          variant: "destructive",
        });
        finishReadingMutation.mutate();
      }, timeUntilEnd);
      
      return () => clearTimeout(timeout);
    }
  }, [isReadingActive, data?.settings?.competitionEndTime]);

  const handleTimeUp = () => {
    if (isReadingActive) {
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
            <h2 className="text-xl font-semibold">No Book Available</h2>
            <p className="text-muted-foreground">
              The book for this competition has not been uploaded yet.
            </p>
            <Button onClick={() => navigate("/dashboard")}>
              Back to Dashboard
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
                You have <span className="font-semibold text-foreground">{data.settings?.readingDurationMinutes || 30} minutes</span> to read.
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Instructions
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Your timer starts when you click "Start Reading"</li>
                <li>• Read carefully as you'll answer questions afterwards</li>
                <li>• Click "Finish Reading" when done</li>
                <li>• Timer auto-submits when time runs out</li>
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
                  Starting...
                </>
              ) : (
                "Start Reading"
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
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-primary" />
              <span className="font-semibold hidden sm:inline">{data.book.title}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Time remaining:</span>
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

      <main className="flex-1 container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardContent className="p-8">
            <ScrollArea className="h-[60vh]">
              <div className="prose prose-lg dark:prose-invert max-w-none" data-testid="book-content">
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
            Finish Reading
          </Button>
        </div>
      </footer>

      <AlertDialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finish Reading?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to finish reading? You won't be able to come back to the book. You will proceed to the questions section.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Reading</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => finishReadingMutation.mutate()}
              disabled={finishReadingMutation.isPending}
            >
              {finishReadingMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finishing...
                </>
              ) : (
                "Yes, Finish"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
